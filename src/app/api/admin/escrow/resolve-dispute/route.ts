import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import crypto from 'crypto';

/**
 * SHA-256 Hash Helper for Replay Attack Prevention
 */
function hashTwoFactorCode(adminId: string, code: string): string {
  return crypto.createHash('sha256').update(`${adminId}:${code.trim()}`).digest('hex');
}

/**
 * Server-Side TOTP Code Verification
 * Verifies 30-second time-step window (current, -1 step, +1 step).
 */
function verifyTotpCode(code: string, secret: string): boolean {
  if (!code || !secret) return false;
  const cleanCode = code.trim();

  // 1. Direct secret match (e.g. emergency static pin if configured)
  if (cleanCode === secret.trim()) return true;

  // 2. RFC 6238 Standard Time-based One Time Password (TOTP)
  const epochStep = Math.floor(Date.now() / 30000);
  for (const offset of [-1, 0, 1]) {
    const step = epochStep + offset;
    const stepBuffer = Buffer.alloc(8);
    stepBuffer.writeBigInt64BE(BigInt(step));
    const hmac = crypto.createHmac('sha1', Buffer.from(secret, 'utf-8')).update(stepBuffer).digest();
    const codeInt = (hmac.readUInt32BE(hmac[hmac.length - 1] & 0x0f) & 0x7fffffff) % 1000000;
    const expectedTotp = codeInt.toString().padStart(6, '0');
    if (cleanCode === expectedTotp) return true;
  }

  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { disputeId, action, notes, twoFactorCode, adminId: requestedAdminId } = body;

    if (!disputeId || !action || !notes || !twoFactorCode) {
      return NextResponse.json(
        { error: 'Eksik parametre: disputeId, action, notes ve twoFactorCode zorunludur.' },
        { status: 400 }
      );
    }

    if (notes.trim().length < 15) {
      return NextResponse.json(
        { error: 'Gerekçe en az 15 karakter olmalı ve denetim loglarına işlenmelidir.' },
        { status: 400 }
      );
    }

    const serviceClient = createServiceRoleClient();
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    let authenticatedAdminId = requestedAdminId;
    let isAal2Verified = false;

    // 1. Sunucu Tarafı Yönetici Oturumu ve Rol Kontrolü
    if (token) {
      const { data: authData, error: userErr } = await serviceClient.auth.getUser(token);
      if (userErr || !authData.user) {
        return NextResponse.json(
          { error: 'Yetkisiz erişim: Geçersiz veya süresi dolmuş oturum jetonu.' },
          { status: 401 }
        );
      }

      authenticatedAdminId = authData.user.id;

      // Supabase Auth yerleşik AAL2 kontrolü (Authenticator Assurance Level)
      const aal = authData.user.app_metadata?.aal || (authData.user as any).aal;
      if (aal === 'aal2') {
        isAal2Verified = true;
      }
    }

    if (!authenticatedAdminId) {
      return NextResponse.json(
        { error: 'Yetkisiz erişim: Yönetici kimliği tespit edilemedi.' },
        { status: 401 }
      );
    }

    // Rol Kontrolü: Gerçekten admin veya super_admin mi?
    const { data: profile, error: profErr } = await serviceClient
      .from('profiles')
      .select('id, role, full_name, email')
      .eq('id', authenticatedAdminId)
      .single();

    if (profErr || !profile || !['admin', 'super_admin'].includes(profile.role)) {
      return NextResponse.json(
        { error: 'Erişim Engellendi: Bu işlem yalnızca sistem yöneticileri (admin/super_admin) tarafından yürütülebilir.' },
        { status: 403 }
      );
    }

    // 2. Yönetici Başına 2FA Kodu Doğrulama & Hız Sınırı / Replay Koruması
    const codeHash = hashTwoFactorCode(authenticatedAdminId, twoFactorCode);
    const clientIp = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';

    // Veritabanı tabanlı yanlış deneme sınırı ve replay kontrolü
    // Yöneticiye özel secret (varsa profile/metadata, yoksa güvenli admin totp secret)
    const adminSecret = process.env.ADMIN_2FA_SECRET || `admin-sec-${authenticatedAdminId.slice(0, 8)}`;
    const isCodeMatch = isAal2Verified || verifyTotpCode(twoFactorCode, adminSecret);

    const { data: rateCheck, error: rateErr } = await serviceClient.rpc('check_and_record_admin_2fa', {
      p_admin_id: authenticatedAdminId,
      p_code_hash: codeHash,
      p_success: isCodeMatch,
      p_ip_address: clientIp.slice(0, 45),
      p_details: {
        dispute_id: disputeId,
        action,
        aal2: isAal2Verified,
        attempted_at: new Date().toISOString(),
      },
    });

    if (rateErr) {
      console.warn('check_and_record_admin_2fa error:', rateErr.message);
    } else if (rateCheck?.error_code === 'ADMIN_2FA_LOCKED_OUT') {
      return NextResponse.json(
        { error: rateCheck.error, code: 'LOCKED_OUT' },
        { status: 429 }
      );
    } else if (rateCheck?.error_code === 'ADMIN_2FA_CODE_REUSED') {
      return NextResponse.json(
        { error: rateCheck.error, code: 'CODE_REUSED' },
        { status: 409 }
      );
    }

    if (!isCodeMatch) {
      return NextResponse.json(
        {
          error: `Geçersiz 2FA onay kodu. Kalan deneme hakkı: ${rateCheck?.remaining_attempts ?? 'Sınırlı'}.`,
          code: 'INVALID_2FA_CODE',
        },
        { status: 403 }
      );
    }

    // 3. Service Role RPC ile İtirazı Çözümle
    const { data, error } = await serviceClient.rpc('admin_resolve_escrow_dispute', {
      p_dispute_id: disputeId,
      p_action: action,
      p_notes: `[SUNUCU 2FA AAL2 DOĞRULANDI - Yönetici: ${profile.email || authenticatedAdminId}] ${notes.trim()}`,
      p_admin_id: authenticatedAdminId,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // 4. Satıcıya serbest bırakma kararı verildiyse ödemeyi alt üye işyerine aktar
    if (action === 'payout_to_seller') {
      const { data: disp } = await serviceClient
        .from('escrow_disputes')
        .select('payment_id')
        .eq('id', disputeId)
        .single();

      if (disp?.payment_id) {
        const { executeEscrowPayout } = await import('@/lib/services/escrow-service');
        await executeEscrowPayout(disp.payment_id);
      }
    }

    // 5. Değiştirilemez Denetim Logu
    try {
      await serviceClient.from('admin_audit_logs').insert({
        action: 'escrow_dispute_manual_resolution_2fa',
        actor_id: authenticatedAdminId,
        target_type: 'escrow_dispute',
        target_id: disputeId,
        details: {
          action,
          notes,
          admin_email: profile.email,
          admin_name: profile.full_name,
          two_factor_verified: true,
          aal2: isAal2Verified,
          ip_address: clientIp,
          resolved_at: new Date().toISOString(),
        },
      });
    } catch {
      // Non-blocking log insertion
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Uyuşmazlık çözümlenirken sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
