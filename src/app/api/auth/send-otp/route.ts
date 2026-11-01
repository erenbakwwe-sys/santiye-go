import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { normalizeTurkishPhone } from '@/lib/services/sms-service';
import { sendEmailOtp, isDisposableEmail } from '@/lib/services/email-service';
import { createClient } from '@/lib/supabase/server';

function createSignedOtpToken(phone: string, email: string, code: string, expiresAt: number): string {
  const secret = process.env.RESEND_API_KEY || 'santiye-go-secret-otp-signing-key';
  const payload = JSON.stringify({ phone, email, codeHash: crypto.createHash('sha256').update(code.trim()).digest('hex'), expiresAt });
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  return Buffer.from(JSON.stringify({ payload, signature })).toString('base64');
}

export async function POST(req: NextRequest) {
  try {
    const { phone, email, name } = await req.json();

    if (!email || !phone) {
      return NextResponse.json(
        { success: false, message: 'E-posta ve telefon bilgisi zorunludur.' },
        { status: 400 }
      );
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { success: false, message: 'Geçici / tek kullanımlık e-posta adresleri kabul edilmemektedir.' },
        { status: 400 }
      );
    }

    const { valid, formatted } = normalizeTurkishPhone(phone);
    if (!valid) {
      return NextResponse.json(
        { success: false, message: 'Geçerli bir Türkiye telefon numarası (05XX XXX XX XX) giriniz.' },
        { status: 400 }
      );
    }

    // 6 Haneli Rastgele Güvenlik Kodu
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 dakika

    // 1. Resend Üzerinden E-posta Gönderimi
    const emailResult = await sendEmailOtp(email.trim().toLowerCase(), code, name);
    if (!emailResult.success) {
      return NextResponse.json(
        { success: false, message: emailResult.error || 'Doğrulama e-postası gönderilemedi.' },
        { status: 500 }
      );
    }

    // 2. Supabase phone_verifications RPC'sini dene (Varsa)
    try {
      const supabase = await createClient();
      const codeHash = crypto.createHash('sha256').update(code).digest('hex');
      await supabase.rpc('request_phone_otp', {
        p_phone: formatted,
        p_code_hash: codeHash,
      });
    } catch {
      // RPC tanımlı değilse bile imzalı oturum tokenı ile doğrulama kesintisiz çalışır
    }

    // 3. İmzalı Güvenli Oturum Tokenı Oluştur
    const signedToken = createSignedOtpToken(formatted, email.trim().toLowerCase(), code, expiresAt);

    const response = NextResponse.json({
      success: true,
      message: `${email} adresinize 6 haneli güvenlik onay kodu gönderildi.`,
      otpToken: signedToken,
      expiresInSeconds: 300,
    });

    response.cookies.set('santiye_otp_session', signedToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 300,
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Onay kodu oluşturulamadı.' },
      { status: 500 }
    );
  }
}
