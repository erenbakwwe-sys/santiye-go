'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, RotateCw } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

function EmailVerificationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const userId = searchParams.get('userId');
  const emailParam = searchParams.get('email') || '';
  const phoneParam = searchParams.get('phone') || '';
  const token = searchParams.get('token');
  const codeParam = searchParams.get('code');

  const [isLinkVerification, setIsLinkVerification] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // OTP Form States
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300); // 5 dk
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendCount, setResendCount] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // 1. Link / Token İle Gelen Doğrulama Kontrolü
  useEffect(() => {
    const hasHashToken = typeof window !== 'undefined' && window.location.hash.includes('access_token');
    if (userId || token || codeParam || hasHashToken) {
      setIsLinkVerification(true);
      setLoading(true);

      async function verifyLink() {
        const supabase = createClient();
        try {
          if (hasHashToken) {
            const { data } = await supabase.auth.getSession();
            if (data?.session?.user) {
              await supabase
                .from('profiles')
                .update({
                  is_email_verified: true,
                  email_verified_at: new Date().toISOString(),
                })
                .eq('id', data.session.user.id);
            }
          } else if (userId) {
            await supabase
              .from('profiles')
              .update({
                is_email_verified: true,
                email_verified_at: new Date().toISOString(),
              })
              .eq('id', userId);
          }
          setSuccess(true);
        } catch (err: any) {
          setErrorMsg(err.message || 'Bağlantı doğrulanamadı.');
        } finally {
          setLoading(false);
        }
      }

      verifyLink();
    }
  }, [userId, token, codeParam]);

  // Sayaçlar
  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => setResendCooldown((prev) => prev - 1), 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  // Sayısal Tuşlama ve Otomatik İlerleme
  const handleDigitChange = (index: number, value: string) => {
    const char = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = char;
    setDigits(newDigits);

    if (char && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // 6 Haneli OTP Kodunu Doğrulama
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    const fullCode = digits.join('');

    if (fullCode.length !== 6) {
      setErrorMsg('Lütfen 6 haneli güvenlik kodunu eksiksiz giriniz.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMsg('Güvenlik kodunun 5 dakikalık süresi doldu. Lütfen yeni bir kod isteyiniz.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneParam,
          email: emailParam,
          code: fullCode,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.message || 'Kod doğrulanamadı.');
      }

      setSuccess(true);
      setSuccessMsg('E-posta adresiniz başarıyla doğrulandı!');
      setTimeout(() => {
        router.push('/giris?verified=1');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Doğrulama işlemi başarısız oldu.');
    } finally {
      setLoading(false);
    }
  };

  // Tekrar Kod ve E-posta Gönder
  const handleResend = async () => {
    if (resendCooldown > 0 || resendCount >= 3) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // 1. Resend API üzerinden 6 haneli yeni OTP gönder
      if (emailParam && phoneParam) {
        await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneParam, email: emailParam }),
        });
      }

      setResendCount((prev) => prev + 1);
      setResendCooldown(60);
      setTimeLeft(300);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setSuccessMsg(`Yeni 6 haneli güvenlik onay kodunuz ${emailParam} adresinize gönderildi.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Yeni kod gönderilemedi.');
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Link Doğrulama Sonucu Ekranı
  if (isLinkVerification) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6 text-center">
          {loading ? (
            <div className="space-y-4 py-8">
              <div className="w-12 h-12 border-4 border-orange-500/20 border-t-orange-500 rounded-full animate-spin mx-auto" />
              <h3 className="text-base font-bold text-navy-900">E-posta Doğrulanıyor...</h3>
            </div>
          ) : success ? (
            <div className="space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h2 className="text-2xl font-black text-navy-900">E-posta Doğrulandı!</h2>
                <p className="text-xs text-slate-500">
                  Hesabınız başarıyla aktifleştirildi. Artık platformdaki tüm özellikleri güvenle kullanabilirsiniz.
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

  // Kayıt Sonrası Doğrulama Ekranı (Link + OTP)
  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 items-center justify-center border border-orange-100 shadow-inner">
            <Mail className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight">
            E-postanızı Doğrulayın
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
            Hesabınızı aktifleştirmek için <strong className="text-slate-800">{emailParam || 'e-posta adresinize'}</strong> bir onay postası ve 6 haneli güvenlik kodu gönderdik.
          </p>
        </div>

        {/* Bilgilendirme Kartı */}
        <div className="p-3.5 bg-orange-50/80 border border-orange-200/80 rounded-2xl text-orange-950 text-xs space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-orange-900">
            <span>📬</span> 6 Haneli Onay Kodunuz Gönderildi
          </p>
          <p className="text-[11px] text-orange-800 leading-relaxed">
            <strong>onay@santiyego.com</strong> adresinden gelen 6 haneli güvenlik kodunu aşağıdaki kutucuklara giriniz. (Gelen kutusunda göremediyseniz spam/gereksiz klasörünü kontrol ediniz).
          </p>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100 shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-black text-navy-900">Tebrikler!</h3>
              <p className="text-xs text-slate-500">Hesabınız doğrulandı, yönlendiriliyorsunuz...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            {/* 6 Haneli OTP Kutucukları */}
            <div className="flex justify-center gap-2 sm:gap-3" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    inputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  className="w-11 h-13 sm:w-12 sm:h-14 text-center text-xl font-black text-navy-900 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white focus:outline-none transition shadow-sm"
                />
              ))}
            </div>

            {/* Sayaç ve Bilgi */}
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
              <span>Kod Geçerlilik Süresi:</span>
              <span className={`font-mono font-black ${timeLeft < 60 ? 'text-red-600' : 'text-slate-700'}`}>
                {formatTimer(timeLeft)}
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || digits.join('').length !== 6 || timeLeft <= 0}
              className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Doğrulanıyor...
                </span>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Kodu Onayla ve Başla</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Tekrar Gönder Butonu */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-500">E-posta kutunuzda göremediniz mi? (Spam klasörünü kontrol edin)</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendCount >= 3}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 disabled:text-slate-400 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>
              {resendCooldown > 0
                ? `Tekrar Gönder (${resendCooldown}s)`
                : resendCount >= 3
                ? 'Maksimum sınıra ulaşıldı'
                : 'Yeni Kod ve E-posta Gönder'}
            </span>
          </button>
        </div>
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
