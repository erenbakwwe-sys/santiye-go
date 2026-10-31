/**
 * ŞANTİYE GO – GÜVENLİK VE ORAN SINIRLAYICI (RATE LIMITER & REDIRECT SANITIZER)
 * Brute-force ve DDoS ataklarına karşı API ve uç noktaları korur.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Checks whether an action from a given key exceeds limit in a time window
 * @param key unique identifier (e.g. IP + action, or userId + action)
 * @param maxAttempts maximum requests allowed in the window
 * @param windowMs time window in milliseconds (default: 60,000 ms / 1 minute)
 */
export function checkRateLimit(
  key: string,
  maxAttempts: number = 10,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetInMs: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { allowed: true, remaining: maxAttempts - 1, resetInMs: windowMs };
  }

  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      resetInMs: Math.max(0, record.resetAt - now),
    };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: maxAttempts - record.count,
    resetInMs: Math.max(0, record.resetAt - now),
  };
}

/**
 * Open Redirect Protection (Açık Yönlendirme Koruması)
 * Ensures user is never redirected to external phishing domains.
 */
export function sanitizeRedirectUrl(
  url: string | null | undefined,
  fallback: string = '/'
): string {
  if (!url) return fallback;
  // Must start with a single slash
  if (!url.startsWith('/')) return fallback;
  // Must not start with // (protocol-relative URL to external site)
  if (url.startsWith('//') || url.startsWith('/\\')) return fallback;
  // Must not contain scheme colon before slash
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return fallback;
  return url;
}
