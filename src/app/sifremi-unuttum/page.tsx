'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, Lock } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { sendPasswordResetEmail } from '@/lib/services/email-service';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // Rate Limiting (Max 3 attempts per 10 minutes)
    const rateCheck = checkRateLimit(`pwd_reset_${email.trim().toLowerCase()}`, 3, 600000);
    if (!rateCheck.allowed) {
      setErrorMsg('Çok fazla şifre sıfırlama talebinde bulunuldu. Lütfen 10 dakika sonra tekrar deneyiniz.');
      return;
    }

    setLoading(true);

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
      const resetLink = `${baseUrl}/sifre-sifirla?email=${encodeURIComponent(email.trim())}`;

      if (isSupabaseConfigured) {
        // Supabase Password Reset Email
        await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${baseUrl}/sifre-sifirla`,
        });
      }

      // Ayrıca özel markalı HTML şablonumuzla e-posta gönder
      await sendPasswordResetEmail(email.trim(), 'Değerli Kullanıcımız', resetLink);

      // Prompt 8 Kuralı: Kullanıcı var/yok bilgisini sızdırmayan genel mesaj
      setSubmitted(true);
    } catch (err: any) {
      // Hata olsa dahi güvenlik gereği genel bilgi verilir
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 items-center justify-center border border-orange-100">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight">
            Şifre Sıfırlama
          </h2>
          <p className="text-xs text-slate-500">
            Kayıtlı e-posta adresinizi girin, size güvenli bir şifre yenileme bağlantısı gönderelim.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {submitted ? (
          <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h3 className="text-sm font-black text-emerald-900">Talep Alındı</h3>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Eğer sistemimizde <strong className="font-bold">{email}</strong> adresiyle kayıtlı bir hesap varsa, şifre sıfırlama bağlantısı e-posta adresinize gönderilmiştir.
            </p>
            <div className="pt-2">
              <Link
                href="/giris"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 hover:text-orange-600"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Giriş Ekranına Dön</span>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResetRequest} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kayıtlı E-posta Adresi
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@sirket.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Bağlantı Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/giris"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Giriş sayfasına geri dön</span>
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
