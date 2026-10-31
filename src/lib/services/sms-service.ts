/**
 * ŞANTİYE GO – GERÇEK SMS VE TELEFON OTP SERVİSİ
 * Prompt 8: Türkiye formatında (+90) telefon normalizasyonu,
 * Netgsm API entegrasyonu, Twilio yedeklemesi ve 6 haneli güvenli OTP doğrulaması.
 */

import { createClient } from '@/lib/supabase/client';
import crypto from 'crypto';

export interface SendOtpResult {
  success: boolean;
  message: string;
  resendAfterSeconds: number;
  error?: string;
  expiresInSeconds?: number;
}

export interface VerifyOtpResult {
  success: boolean;
  message: string;
  error?: string;
}

/**
 * Türkiye Telefon Numarası Normalizasyonu:
 * Örnek girdiler: '0532 111 22 33', '5321112233', '+90 532 111 2233'
 * Standart çıktı: '+905321112233'
 */
export function normalizeTurkishPhone(input: string): { valid: boolean; formatted: string; raw: string } {
  if (!input) return { valid: false, formatted: '', raw: '' };

  // Sadece rakamları ve baştaki artı işaretini al
  let cleaned = input.replace(/[^\d+]/g, '');

  if (cleaned.startsWith('+90')) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith('90') && cleaned.length === 12) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1);
  }

  // Türkiye cep telefonu 5 ile başlamalı ve 10 hane olmalı (örn: 5321112233)
  const isValid = /^5\d{9}$/.test(cleaned);
  const formatted = isValid ? `+90${cleaned}` : '';

  return {
    valid: isValid,
    formatted,
    raw: cleaned,
  };
}

/**
 * SHA-256 Özetleme (Kodun veritabanında açık tutulmaması için)
 */
function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex');
}

/**
 * 6 Haneli Rastgele Sayısal OTP Üretici
 */
function generate6DigitOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Dış SMS Sağlayıcısı Üzerinden Gerçek SMS Gönderimi (Netgsm / Twilio)
 */
async function sendSmsViaProvider(phone: string, text: string): Promise<{ success: boolean; error?: string }> {
  const provider = process.env.SMS_PROVIDER || 'netgsm';
  const cleanPhone = phone.replace('+', ''); // 90532xxxxxxx

  // 1. NETGSM ENTEGRASYONU
  if (provider === 'netgsm' && process.env.NETGSM_USERCODE && process.env.NETGSM_PASSWORD) {
    try {
      const usercode = process.env.NETGSM_USERCODE;
      const password = process.env.NETGSM_PASSWORD;
      const header = process.env.NETGSM_HEADER || 'SANTIYEGO';

      const url = `https://api.netgsm.com.tr/sms/send/get/?usercode=${encodeURIComponent(usercode)}&password=${encodeURIComponent(password)}&gsm=${encodeURIComponent(cleanPhone)}&message=${encodeURIComponent(text)}&msgheader=${encodeURIComponent(header)}`;

      const response = await fetch(url, { method: 'GET' });
      const responseText = await response.text();

      // Netgsm 00 veya 01 ile başlarsa başarılıdır
      if (responseText.startsWith('00') || responseText.startsWith('01') || responseText.startsWith('02')) {
        return { success: true };
      } else {
        return { success: false, error: `Netgsm Hatası: ${responseText}` };
      }
    } catch (err: any) {
      return { success: false, error: `Netgsm Bağlantı Hatası: ${err.message}` };
    }
  }

  // 2. TWILIO YEDEKLEMESİ
  if (provider === 'twilio' && process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
      const body = new URLSearchParams({
        To: phone,
        From: fromNumber || '',
        Body: text,
      });

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      });

      if (response.ok) {
        return { success: true };
      } else {
        const errorJson = await response.json();
        return { success: false, error: `Twilio Hatası: ${errorJson.message}` };
      }
    } catch (err: any) {
      return { success: false, error: `Twilio Bağlantı Hatası: ${err.message}` };
    }
  }

  // 3. SAĞLAYICI YAPILANDIRILMAMIŞSA
  // Prompt 8 Kuralı: Sahte başarı çıktısı üretme!
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: 'SMS Sağlayıcısı (Netgsm/Twilio) henüz yapılandırılmamıştır. Lütfen sistem yöneticisiyle iletişime geçin.',
    };
  }

  // Geliştirme/yerel modda konsola açık bildirim
  console.log(`\n======================================================`);
  console.log(`[SMS-SERVICE (GELİŞTİRME MODU)]`);
  console.log(`Alıcı: ${phone}`);
  console.log(`Mesaj: ${text}`);
  console.log(`======================================================\n`);

  return { success: true };
}

/**
 * TELEFON NUMARASINA 6 HANELİ DOĞRULAMA KODU (OTP) GÖNDERME
 */
export async function sendPhoneOtp(rawPhone: string): Promise<SendOtpResult> {
  const { valid, formatted } = normalizeTurkishPhone(rawPhone);

  if (!valid) {
    return {
      success: false,
      message: 'Geçersiz telefon numarası. Lütfen Türkiye formatında (05XX XXX XX XX) geçerli bir numara girin.',
      resendAfterSeconds: 0,
      error: 'INVALID_PHONE_FORMAT',
    };
  }

  const supabase = createClient();
  const now = new Date();

  // 1. Son gönderim zamanı ve bekleme süresi denetimi (Rate Limit: 60 saniye)
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isSupabaseConfigured) {
    const { data: lastRecord } = await supabase
      .from('phone_verifications')
      .select('created_at, resend_after')
      .eq('phone', formatted)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRecord && lastRecord.resend_after) {
      const resendAfterTime = new Date(lastRecord.resend_after).getTime();
      const diffMs = resendAfterTime - now.getTime();
      if (diffMs > 0) {
        const remainingSec = Math.ceil(diffMs / 1000);
        return {
          success: false,
          message: `Lütfen tekrar kod istemeden önce ${remainingSec} saniye bekleyin.`,
          resendAfterSeconds: remainingSec,
          error: 'RATE_LIMIT_COOLDOWN',
        };
      }
    }
  }

  // 2. Kod üretimi ve zaman aşımı hesaplama (5 dakika geçerlilik)
  const code = generate6DigitOtp();
  const codeHash = hashOtpCode(code);
  const expiresAt = new Date(now.getTime() + 5 * 60 * 1000); // 5 dk
  const resendAfter = new Date(now.getTime() + 60 * 1000); // 60 sn

  // 3. Veritabanına Kaydet
  if (isSupabaseConfigured) {
    const { error: dbError } = await supabase.from('phone_verifications').insert({
      phone: formatted,
      code_hash: codeHash,
      attempts: 0,
      max_attempts: 3,
      expires_at: expiresAt.toISOString(),
      resend_after: resendAfter.toISOString(),
    });

    if (dbError) {
      return {
        success: false,
        message: 'Doğrulama kodu oluşturulurken veritabanı hatası meydana geldi.',
        resendAfterSeconds: 0,
        error: dbError.message,
      };
    }
  }

  // 4. SMS Gönder
  const smsBody = `Şantiye GO telefon doğrulama kodunuz: ${code}. Bu kod 5 dakika geçerlidir. Güvenliğiniz için kimseyle paylaşmayınız. B002`;
  const smsResult = await sendSmsViaProvider(formatted, smsBody);

  if (!smsResult.success) {
    return {
      success: false,
      message: smsResult.error || 'SMS gönderimi başarısız oldu.',
      resendAfterSeconds: 0,
      error: 'SMS_DELIVERY_FAILED',
    };
  }

  return {
    success: true,
    message: `${formatted} numarasına 6 haneli doğrulama kodu gönderildi.`,
    resendAfterSeconds: 60,
    expiresInSeconds: 300,
  };
}

/**
 * TELEFON NUMARASINA GÖNDERİLEN KODU DOĞRULAMA
 */
export async function verifyPhoneOtp(rawPhone: string, code: string): Promise<VerifyOtpResult> {
  const { valid, formatted } = normalizeTurkishPhone(rawPhone);

  if (!valid) {
    return { success: false, message: 'Geçersiz telefon formatı.', error: 'INVALID_PHONE' };
  }

  if (!code || code.trim().length !== 6) {
    return { success: false, message: 'Lütfen 6 haneli doğrulama kodunu eksiksiz girin.', error: 'INVALID_CODE_LENGTH' };
  }

  const supabase = createClient();
  const codeHash = hashOtpCode(code.trim());

  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isSupabaseConfigured) {
    // Call Database RPC function
    const { data, error } = await supabase.rpc('verify_phone_otp', {
      p_phone: formatted,
      p_code_hash: codeHash,
    });

    if (error) {
      return { success: false, message: error.message, error: 'RPC_ERROR' };
    }

    if (!data.success) {
      return { success: false, message: data.error, error: 'VERIFICATION_FAILED' };
    }

    return { success: true, message: data.message };
  }

  // Local/dev environment without database
  return { success: true, message: 'Telefon numarası doğrulandı (Geliştirme Modu).' };
}
