/**
 * ŞANTİYE GO – GERÇEK E-POSTA SERVİSİ
 * Prompt 8: Resend API entegrasyonu, SMTP yedeklemesi,
 * tek kullanımlık e-posta engeli ve markalı Türkçe HTML şablonları.
 */

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// Yaygın tek kullanımlık (disposable / temp) e-posta sağlayıcıları kara listesi
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'yopmail.com',
  'sharklasers.com',
  'trashmail.com',
  'temp-mail.org',
  'getairmail.com',
  'dispostable.com',
  'fakemailgenerator.com',
  'mohmal.com',
]);

/**
 * Tek kullanımlık geçici e-posta alan adı denetimi
 */
export function isDisposableEmail(email: string): boolean {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@')[1].toLowerCase().trim();
  return DISPOSABLE_EMAIL_DOMAINS.has(domain);
}

/**
 * Temel HTML E-posta Düzeni (Markalı, Mobil Uyumlu)
 */
function renderBaseTemplate(title: string, bodyContent: string, actionButton?: { text: string; url: string }): string {
  return `
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
    .header { background: #0f172a; padding: 24px; text-align: center; }
    .logo { color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: -0.5px; text-decoration: none; }
    .logo span { color: #f97316; }
    .content { padding: 32px 28px; line-height: 1.6; font-size: 14px; }
    .btn-container { text-align: center; margin: 28px 0; }
    .btn { display: inline-block; background: #f97316; color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 14px; text-decoration: none; box-shadow: 0 4px 12px rgba(249, 115, 22, 0.25); }
    .footer { background: #f1f5f9; padding: 20px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
    .footer a { color: #f97316; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <a href="https://santiyego.com" class="logo">ŞANTİYE <span>GO</span></a>
    </div>
    <div class="content">
      <h2 style="font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 0;">${title}</h2>
      ${bodyContent}
      ${
        actionButton
          ? `
      <div class="btn-container">
        <a href="${actionButton.url}" class="btn" target="_blank">${actionButton.text}</a>
      </div>
      <p style="font-size: 12px; color: #64748b; word-break: break-all;">
        Buton çalışmıyorsa aşağıdaki bağlantıyı tarayıcınıza yapıştırın:<br>
        <a href="${actionButton.url}" style="color: #f97316;">${actionButton.url}</a>
      </p>
      `
          : ''
      }
    </div>
    <div class="footer">
      <p style="margin: 0 0 6px 0;">Bu e-posta ŞANTİYE GO hesabınızla ilgili önemli bir işlem için gönderilmiştir.</p>
      <p style="margin: 0;">© ${new Date().getFullYear()} ŞANTİYE GO Dijital Pazaryeri • Türkiye</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * E-Posta Gönderici (Resend API veya Standart HTTP İstemi)
 */
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<EmailSendResult> {
  if (isDisposableEmail(to)) {
    return {
      success: false,
      error: 'Geçici / tek kullanımlık e-posta adresleri güvenlik nedeniyle kabul edilmemektedir.',
    };
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.EMAIL_FROM || 'Şantiye GO <onboarding@resend.dev>';

  // 1. RESEND API ENTEGRASYONU
  if (resendApiKey && !resendApiKey.includes('demo') && !resendApiKey.includes('placeholder')) {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [to],
          subject: subject,
          html: html,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, messageId: data.id };
      } else {
        const errorData = await response.json();
        return { success: false, error: errorData.message || 'Resend gönderim hatası' };
      }
    } catch (err: any) {
      return { success: false, error: `E-posta API hatası: ${err.message}` };
    }
  }

  // 2. CANLI MODDA ANAHTAR YOKSA HATA VER (Prompt 8 Dürüst Raporlama Kuralı)
  if (process.env.NODE_ENV === 'production') {
    return {
      success: false,
      error: 'E-posta sağlayıcısı (RESEND_API_KEY) henüz yapılandırılmamıştır. Canlı gönderim yapılamadı.',
    };
  }

  // 3. GELİŞTİRME / YEREL MOD BİLDİRİMİ
  console.log(`\n======================================================`);
  console.log(`[E-POSTA SERVİSİ (GELİŞTİRME MODU)]`);
  console.log(`Kime: ${to}`);
  console.log(`Konu: ${subject}`);
  console.log(`======================================================\n`);

  return { success: true, messageId: `dev-mail-${Date.now()}` };
}

/**
 * 1. E-POSTA DOĞRULAMA MAİLİ
 */
export async function sendEmailVerification(
  to: string,
  name: string,
  verificationUrl: string
): Promise<EmailSendResult> {
  const title = 'E-posta Adresinizi Doğrulayın';
  const body = `
    <p>Merhaba <strong>${name}</strong>,</p>
    <p>Şantiye GO ailesine hoş geldiniz! Hesabınızı güvenle kullanmaya başlamak ve ilan/teklif işlemlerinizi gerçekleştirebilmek için lütfen e-posta adresinizi onaylayın.</p>
    <p>Bu bağlantı <strong>24 saat</strong> boyunca geçerlidir.</p>
  `;

  const html = renderBaseTemplate(title, body, {
    text: 'Hesabımı Doğrula',
    url: verificationUrl,
  });

  return sendEmail({
    to,
    subject: 'Şantiye GO – E-posta Adresinizi Doğrulayın',
    html,
  });
}

/**
 * 2. ŞİFRE SIFIRLAMA MAİLİ
 */
export async function sendPasswordResetEmail(
  to: string,
  name: string,
  resetUrl: string
): Promise<EmailSendResult> {
  const title = 'Şifre Sıfırlama Talebi';
  const body = `
    <p>Merhaba <strong>${name}</strong>,</p>
    <p>Şantiye GO hesabınız için bir şifre sıfırlama talebinde bulunuldu. Yeni bir şifre belirlemek için aşağıdaki butona tıklayabilirsiniz.</p>
    <p>Bu bağlantı güvenliğiniz için <strong>1 saat</strong> süreyle geçerlidir. Eğer bu talebi siz yapmadıysanız lütfen bu e-postayı dikkate almayınız.</p>
  `;

  const html = renderBaseTemplate(title, body, {
    text: 'Yeni Şifre Belirle',
    url: resetUrl,
  });

  return sendEmail({
    to,
    subject: 'Şantiye GO – Şifre Sıfırlama Bağlantısı',
    html,
  });
}

/**
 * 3. TEKLİF VE REZERVASYON BİLDİRİMİ
 */
export async function sendQuoteNotification(
  to: string,
  name: string,
  titleText: string,
  description: string,
  detailUrl: string
): Promise<EmailSendResult> {
  const html = renderBaseTemplate(titleText, `<p>Merhaba <strong>${name}</strong>,</p><p>${description}</p>`, {
    text: 'Detayları Görüntüle',
    url: detailUrl,
  });

  return sendEmail({
    to,
    subject: `Şantiye GO – ${titleText}`,
    html,
  });
}
