import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { normalizeTurkishPhone } from '@/lib/services/sms-service';
import { createClient } from '@/lib/supabase/server';

function verifySignedOtpToken(
  token: string,
  enteredCode: string,
  phone: string
): { valid: boolean; reason?: string } {
  try {
    const secret = process.env.RESEND_API_KEY || 'santiye-go-secret-otp-signing-key';
    const decoded = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const { payload, signature } = decoded;

    const expectedSig = crypto.createHmac('sha256', secret).update(payload).digest('hex');
    if (signature !== expectedSig) {
      return { valid: false, reason: 'Geçersiz güvenlik imzası.' };
    }

    const data = JSON.parse(payload);
    if (Date.now() > data.expiresAt) {
      return { valid: false, reason: 'Doğrulama kodunun 5 dakikalık süresi doldu. Lütfen yeni kod isteyin.' };
    }

    const enteredHash = crypto.createHash('sha256').update(enteredCode.trim()).digest('hex');
    if (enteredHash !== data.codeHash) {
      return { valid: false, reason: 'Girdiğiniz 6 haneli kod hatalı.' };
    }

    return { valid: true };
  } catch {
    return { valid: false, reason: 'Doğrulama bilgisi okunamadı.' };
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { phone, code } = body;
    let otpToken = body.otpToken;

    if (!otpToken) {
      otpToken = req.cookies.get('santiye_otp_session')?.value;
    }

    if (!code || code.trim().length !== 6) {
      return NextResponse.json(
        { success: false, message: 'Lütfen 6 haneli kodu eksiksiz giriniz.' },
        { status: 400 }
      );
    }

    const { valid, formatted } = normalizeTurkishPhone(phone);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: 'Geçersiz telefon formatı.' },
        { status: 400 }
      );
    }

    let isVerified = false;

    // 1. İmzalı Token ile Doğrulama
    if (otpToken) {
      const tokenCheck = verifySignedOtpToken(otpToken, code, formatted);
      if (tokenCheck.valid) {
        isVerified = true;
      }
    }

    // 2. Supabase RPC ile Doğrulama (Yedek Mekanizma)
    if (!isVerified) {
      try {
        const supabase = await createClient();
        const codeHash = crypto.createHash('sha256').update(code.trim()).digest('hex');
        const { data } = await supabase.rpc('verify_phone_otp', {
          p_phone: formatted,
          p_code_hash: codeHash,
        });
        if (data && data.success) {
          isVerified = true;
        }
      } catch {
        // RPC yoksa token kontrolü esastır
      }
    }

    if (!isVerified) {
      return NextResponse.json(
        { success: false, message: 'Girdiğiniz 6 haneli kod hatalı veya süresi dolmuş.' },
        { status: 400 }
      );
    }

    // 3. Veritabanında Kullanıcıyı Doğrulanmış Olarak İşaretle
    try {
      const supabase = await createClient();
      await supabase
        .from('profiles')
        .update({
          is_phone_verified: true,
          is_email_verified: true,
          phone_verified_at: new Date().toISOString(),
          email_verified_at: new Date().toISOString(),
        })
        .eq('phone', formatted);
    } catch {
      // Profil güncelleme başarısız olsa bile oturum devam eder
    }

    const response = NextResponse.json({
      success: true,
      message: 'Hesabınız başarıyla doğrulandı!',
    });

    response.cookies.delete('santiye_otp_session');
    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Doğrulama işlemi başarısız oldu.' },
      { status: 500 }
    );
  }
}
