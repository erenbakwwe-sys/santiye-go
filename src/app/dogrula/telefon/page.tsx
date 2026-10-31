'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Phone, ShieldCheck, AlertCircle, CheckCircle2, RotateCw, ArrowRight } from 'lucide-react';
import { sendPhoneOtp, verifyPhoneOtp } from '@/lib/services/sms-service';
import { markPhoneVerified } from '@/lib/services/auth-service';

function PhoneVerificationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawPhone = searchParams.get('phone') || '';
  const email = searchParams.get('email') || '';

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 5 Dakikalık (300 sn) Kod Geçerlilik Sayacı
  const [timeLeft, setTimeLeft] = useState(300);
  // 60 Saniyelik Tekrar Gönderim Bekleme Sayacı
  const [resendCooldown, setResendCooldown] = useState(60);
  const [resendCount, setResendCount] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

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

  // Doğrulama Formu Gönderimi
  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');
    const fullCode = digits.join('');

    if (fullCode.length !== 6) {
      setErrorMsg('Lütfen 6 haneli onay kodunu eksiksiz giriniz.');
      return;
    }

    if (timeLeft <= 0) {
      setErrorMsg('Doğrulama kodunun 5 dakikalık süresi doldu. Lütfen yeni bir kod isteyiniz.');
      return;
    }

    setLoading(true);

    try {
      const result = await verifyPhoneOtp(rawPhone, fullCode);
      if (!result.success) {
        throw new Error(result.message || 'Kod doğrulanamadı.');
      }

      await markPhoneVerified(rawPhone);

      setSuccessMsg('Telefon numaranız başarıyla doğrulandı!');
      setTimeout(() => {
        router.push('/giris?verified=phone');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Kod doğrulanamadı.');
    } finally {
      setLoading(false);
    }
  };

  // Tekrar Kod İste
  const handleResend = async () => {
    if (resendCooldown > 0 || resendCount >= 3) return;
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const result = await sendPhoneOtp(rawPhone);
      if (!result.success) {
        throw new Error(result.message);
      }

      setResendCount((prev) => prev + 1);
      setResendCooldown(60);
      setTimeLeft(300);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
      setSuccessMsg('Yeni doğrulama kodu SMS ile telefonunuza iletildi.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Yeni kod gönderilemedi.');
    }
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 items-center justify-center border border-orange-100 shadow-inner">
            <Phone className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight">
            Telefonunuzu Doğrulayın
          </h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            <strong className="text-slate-800">{rawPhone || 'Telefon numaranıza'}</strong> gönderilen 6 haneli onay kodunu giriniz.
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

        <form onSubmit={handleVerify} className="space-y-6">
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

          {/* Sayaç ve Geçerlilik Bilgisi */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold px-1">
            <span>Kalan Süre:</span>
            <span className={`font-mono font-black ${timeLeft < 60 ? 'text-red-600' : 'text-slate-700'}`}>
              {formatTimer(timeLeft)}
            </span>
          </div>

          {/* Test Modu Bilgilendirmesi */}
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-amber-900 text-xs text-center space-y-1">
            <p className="font-bold">💡 Test / Geliştirme Erişimi</p>
            <p className="text-amber-800">
              SMS sağlayıcısı API anahtarlarınız tanımlanana kadar test onay kodu olarak{' '}
              <span className="font-mono font-bold bg-amber-200 px-1.5 py-0.5 rounded text-amber-950">123456</span>{' '}
              kullanabilirsiniz.
            </p>
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
                <span>Kodu Onayla ve Tamamla</span>
              </>
            )}
          </button>
        </form>

        {/* Tekrar Kod Gönder Butonu */}
        <div className="pt-2 border-t border-slate-100 text-center space-y-2">
          <p className="text-xs text-slate-500">Kod ulaşmadı mı?</p>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || resendCount >= 3}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 hover:text-orange-700 disabled:text-slate-400 transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>
              {resendCooldown > 0
                ? `Tekrar Kod Gönder (${resendCooldown}s)`
                : resendCount >= 3
                ? 'Maksimum SMS sınırına ulaşıldı'
                : 'Yeni Kod Gönder'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PhoneVerificationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex items-center justify-center text-xs font-bold text-slate-500">
          Yükleniyor...
        </div>
      }
    >
      <PhoneVerificationForm />
    </Suspense>
  );
}
