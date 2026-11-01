'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { HardHat, Mail, Lock, AlertCircle, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { checkRateLimit, sanitizeRedirectUrl } from '@/lib/security/rate-limiter';
import { loginUser } from '@/lib/services/auth-service';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const safeRedirect = sanitizeRedirectUrl(rawRedirect, '');
  const verifiedNotice = searchParams.get('verified');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Brute-force Koruması: IP/E-posta bazlı (1 dakikada max 5 hatalı deneme)
    const rateKey = `login_${email.trim().toLowerCase()}`;
    const rateCheck = checkRateLimit(rateKey, 5, 60000);
    if (!rateCheck.allowed) {
      setErrorMsg(
        `Güvenlik Uyarısı: Çok fazla hatalı deneme yapıldı. Hesabınızın güvenliği için lütfen ${Math.ceil(
          rateCheck.resetInMs / 1000
        )} saniye bekleyin.`
      );
      return;
    }

    setLoading(true);

    try {
      const res = await loginUser(email, password);

      if (!res.success) {
        throw new Error(res.error || 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol ediniz.');
      }

      const role = res.profile?.role || res.user?.role || 'buyer';
      const isAdmin = role === 'admin' || role === 'super_admin';

      if (safeRedirect) {
        // Güvenlik Koruması: Yetkisiz rolleri /admin rotasına yönlendirme
        if (safeRedirect.startsWith('/admin') && !isAdmin) {
          window.location.href = role === 'company' ? '/firma-paneli' : '/alici-paneli';
          return;
        }

        // Güvenlik Koruması: Alıcıyı firma paneline yönlendirme
        if (safeRedirect.startsWith('/firma-paneli') && role === 'buyer') {
          window.location.href = '/alici-paneli';
          return;
        }

        window.location.href = safeRedirect;
        return;
      }

      if (isAdmin) {
        window.location.href = '/admin';
      } else if (role === 'company') {
        window.location.href = '/firma-paneli';
      } else {
        window.location.href = '/alici-paneli';
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Giriş yapılamadı.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-navy-900 text-orange-500 items-center justify-center shadow-lg shadow-navy-900/10">
            <HardHat className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight">
            Şantiye GO Giriş
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Hesabınıza güvenle giriş yaparak ilan, teklif ve mesajlarınızı yönetin
          </p>
        </div>

        {verifiedNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>Hesabınız başarıyla doğrulandı! Şimdi giriş yapabilirsiniz.</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              E-posta Adresi
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">Şifre</label>
              <Link
                href="/sifremi-unuttum"
                className="text-[11px] font-semibold text-orange-600 hover:underline"
              >
                Şifremi Unuttum?
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
                aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-slate-600 font-medium">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
              />
              <span>Beni Hatırla</span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Giriş Yapılıyor...
              </span>
            ) : (
              'Giriş Yap'
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          Hesabınız yok mu?{' '}
          <Link href="/kayit" className="font-bold text-orange-600 hover:underline">
            Hemen Ücretsiz Kayıt Olun
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-xs font-bold text-slate-500">
          Yükleniyor...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
