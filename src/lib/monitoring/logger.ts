/**
 * ŞANTİYE GO – HATA VE GÜVENLİK İZLEME MOTORU (SENTRY & ERROR LOGGING)
 * Kullanıcı şifreleri, kredi kartı numaraları ve TCKN gibi hassas verilerin
 * hata günlüklerine sızmasını engelleyen (sanitizer) korumalı kayıt mekanizması.
 */

// Sır veya hassas alan regex filtreleri
const SENSITIVE_KEYS = [
  'password',
  'sifre',
  'token',
  'card',
  'cvv',
  'pan',
  'secret',
  'api_key',
  'tckn',
  'iban',
];

export function sanitizeErrorDetails(details: any): any {
  if (!details) return details;
  if (typeof details === 'string') {
    // Mask potential credit cards (16 digits)
    return details.replace(/\b\d{4}[ -]?\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, '****-****-****-****');
  }
  if (typeof details !== 'object') return details;

  if (Array.isArray(details)) {
    return details.map(sanitizeErrorDetails);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(details)) {
    const isSensitive = SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk));
    if (isSensitive) {
      sanitized[key] = '[REDACTED_SENSITIVE_DATA]';
    } else {
      sanitized[key] = sanitizeErrorDetails(val);
    }
  }
  return sanitized;
}

export function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, any>
) {
  const safeMeta = metadata ? sanitizeErrorDetails(metadata) : {};
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  const logPayload = {
    timestamp: new Date().toISOString(),
    context,
    error: errorMessage,
    stack: errorStack,
    metadata: safeMeta,
    environment: process.env.NODE_ENV || 'development',
  };

  // Standard structured console log (read by Vercel / Datadog / CloudWatch)
  console.error('[ŞANTİYE GO ERROR LOG]', JSON.stringify(logPayload, null, 2));

  // In production with SENTRY_DSN configured:
  if (process.env.NEXT_PUBLIC_SENTRY_DSN && typeof window !== 'undefined') {
    // Sentry.captureException(error, { extra: safeMeta });
  }
}
