'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function EmailVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const email = searchParams.get('email');
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function verify() {
      if (!userId && !token) {
        setErrorMsg('Geçersiz veya eksik doğrulama bağlantısı.');
        setLoading(false);
        return;
      }

      const supabase = createClient();
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (!isSupabaseConfigured) {
        setSuccess(true);
        setLoading(false);
        return;
      }

      try {
        if (userId) {
          const { error } = await supabase
            .from('profiles')
            .update({
              is_email_verified: true,
              email_verified_at: new Date().toISOString(),
            })
            .eq('id', userId);

          if (error) throw error;
        }

        setSuccess(true);
      } catch (err: any) {
        setErrorMsg(err.message || 'E-posta doğrulaması başarısız oldu.');
      } finally {
        setLoading(false);
      }
    }

    verify();
  }, [userId, token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 text-center">
        {loading ? (
          <div className="space-y-4 py-8">
            <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto" />
            <h3 className="text-base font-bold text-navy-900">E-posta Adresiniz Doğrulanıyor...</h3>
          </div>
        ) : success ? (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-navy-900">E-posta Doğrulandı!</h2>
              <p className="text-xs text-slate-500">
                <strong className="text-slate-800">{email || 'E-posta adresiniz'}</strong> başarıyla onaylandı. Artık platformdaki tüm özellikleri güvenle kullanabilirsiniz.
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/giris?verified=1"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 transition active:scale-95"
              >
                <span>Giriş Yap ve Başla</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="w-16 h-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-100">
              <AlertCircle className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-navy-900">Bağlantı Geçersiz</h2>
              <p className="text-xs text-slate-500">
                {errorMsg || 'Doğrulama bağlantısının süresi dolmuş veya daha önce kullanılmış olabilir.'}
              </p>
            </div>
            <div className="pt-4">
              <Link
                href="/giris"
                className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-extrabold text-sm transition"
              >
                <span>Giriş Ekranına Dön</span>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function EmailVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-xs font-bold text-slate-500">
          Yükleniyor...
        </div>
      }
    >
      <EmailVerificationContent />
    </Suspense>
  );
}
