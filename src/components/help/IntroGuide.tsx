'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, FileText, MessageSquare, X } from 'lucide-react';

export const OPEN_INTRO_EVENT = 'sg-open-intro';
export const COOKIE_CHOICE_EVENT = 'sg-cookie-choice';
const SEEN_KEY = 'sg_intro_seen';

const steps = [
  {
    icon: Search,
    title: 'Aradığınızı bulun',
    text: 'Ana sayfadaki arama kutusuna ne aradığınızı yazın (örneğin "ekskavatör" veya "hazır beton") ve konumunuzu seçin. Size en yakın firmaların ilanları listelenir.',
  },
  {
    icon: FileText,
    title: 'Ücretsiz fiyat teklifi alın',
    text: '"Ücretsiz teklif al" düğmesine basın, neye ihtiyacınız olduğunu yazın. Talebiniz bölgenizdeki firmalara iletilir, gelen fiyatları tek ekranda karşılaştırırsınız.',
  },
  {
    icon: MessageSquare,
    title: 'Firmayla anlaşın',
    text: 'Beğendiğiniz teklifi kabul edin ya da firmaya site üzerinden mesaj yazın. Anlaştığınızda firmanın telefon numarası size açılır.',
  },
];

/**
 * İlk ziyarette (yalnızca ana sayfada) bir kez çıkan 3 adımlık tanıtım.
 * Çerez bildirimi açıksa onunla üst üste binmemesi için kullanıcı çerez seçimini yaptıktan
 * sonra açılır. "Yardım" düğmesinden her zaman yeniden açılabilir.
 */
export default function IntroGuide() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const show = useCallback(() => {
    setStep(0);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {}
  }, []);

  useEffect(() => {
    window.addEventListener(OPEN_INTRO_EVENT, show);
    return () => window.removeEventListener(OPEN_INTRO_EVENT, show);
  }, [show]);

  useEffect(() => {
    if (pathname !== '/') return;
    let seen = false;
    let consent = false;
    try {
      seen = localStorage.getItem(SEEN_KEY) === '1';
      consent = !!localStorage.getItem('sg_cookie_consent');
    } catch {}
    if (seen) return;

    if (consent) {
      const t = setTimeout(show, 900);
      return () => clearTimeout(t);
    }
    const onChoice = () => setTimeout(show, 400);
    window.addEventListener(COOKIE_CHOICE_EVENT, onChoice, { once: true });
    return () => window.removeEventListener(COOKIE_CHOICE_EVENT, onChoice);
  }, [pathname, show]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, close]);

  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-navy-950/60 p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-title"
        className="w-full sm:max-w-lg bg-white sm:rounded-md shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 pt-5">
          <span className="text-sm font-medium text-slate-600">
            Adım {step + 1} / {steps.length}
          </span>
          <button
            type="button"
            onClick={close}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-navy-900 p-1"
          >
            Geç <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 pt-4 pb-6">
          <div className="w-14 h-14 rounded-md bg-orange-50 text-orange-600 flex items-center justify-center">
            <Icon className="w-7 h-7" strokeWidth={1.75} />
          </div>
          <h2 id="intro-title" className="mt-4 text-2xl font-semibold text-navy-900">
            {current.title}
          </h2>
          <p className="mt-2 text-lg text-slate-700 leading-relaxed">{current.text}</p>

          <div className="mt-5 flex gap-1.5" aria-hidden="true">
            {steps.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-orange-500' : 'bg-slate-200'}`}
              />
            ))}
          </div>

          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button type="button" onClick={() => setStep(step - 1)} className="btn-secondary flex-1">
                Geri
              </button>
            )}
            {isLast ? (
              <button type="button" onClick={close} className="btn-primary flex-1">
                Anladım, başlayalım
              </button>
            ) : (
              <button type="button" onClick={() => setStep(step + 1)} className="btn-primary flex-1">
                İleri
              </button>
            )}
          </div>
          {isLast && (
            <p className="mt-4 text-sm text-slate-600 text-center">
              Daha ayrıntılı anlatım için{' '}
              <Link href="/nasil-kullanilir" onClick={close} className="font-medium text-orange-700 underline">
                Nasıl kullanılır?
              </Link>{' '}
              sayfasına bakabilirsiniz.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
