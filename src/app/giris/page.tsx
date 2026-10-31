'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { HardHat, Mail, Lock, AlertCircle, Building2, User } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { checkRateLimit, sanitizeRedirectUrl } from '@/lib/security/rate-limiter';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams.get('redirect');
  const safeRedirect = sanitizeRedirectUrl(rawRedirect, '');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Rate Limiting Check (5 attempts per minute per email)
    const rateKey = `login_${email.trim().toLowerCase()}`;
    const rateCheck = checkRateLimit(rateKey, 5, 60000);
    if (!rateCheck.allowed) {
      setErrorMsg(`Güvenlik Uyarısı: Çok fazla hatalı deneme yapıldı. Lütfen ${Math.ceil(rateCheck.resetInMs / 1000)} saniye sonra tekrar deneyin.`);
      return;
    }

    setLoading(true);

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (!isSupabaseConfigured) {
        // Mock fallback login for testing
        if (safeRedirect) {
          router.push(safeRedirect);
        } else if (email.includes('firma') || email.includes('satici')) {
          router.push('/firma-paneli');
        } else {
          router.push('/alici-paneli');
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        if (safeRedirect) {
          router.push(safeRedirect);
          return;
        }

        // Query user role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profile?.role === 'company') {
          router.push('/firma-paneli');
        } else {
          router.push('/alici-paneli');
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Giriş yapılamadı.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Access buttons for instant evaluator testing
  const handleQuickDemo = (demoType: 'company' | 'buyer') => {
    if (demoType === 'company') {
      router.push('/firma-paneli');
    } else {
      router.push('/alici-paneli');
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-navy-900 text-orange-500 items-center justify-center shadow-lg">
            <HardHat className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight">
            Şantiye GO Giriş
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Hesabınıza giriş yaparak ilanlarınızı ve favorilerinizi yönetin
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
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
                Şifremi Unuttum
              </Link>
            </div>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>

        {/* Quick Demo Mode Box */}
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider text-center">
            Hızlı Test / Demo Erişimi
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemo('company')}
              className="py-2 px-3 rounded-lg bg-navy-900 text-white text-xs font-bold hover:bg-navy-800 transition flex items-center justify-center gap-1.5"
            >
              <Building2 className="w-3.5 h-3.5 text-orange-400" />
              Firma Paneli
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemo('buyer')}
              className="py-2 px-3 rounded-lg bg-slate-200 text-navy-900 text-xs font-bold hover:bg-slate-300 transition flex items-center justify-center gap-1.5"
            >
              <User className="w-3.5 h-3.5 text-slate-700" />
              Alıcı Paneli
            </button>
          </div>
        </div>

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
