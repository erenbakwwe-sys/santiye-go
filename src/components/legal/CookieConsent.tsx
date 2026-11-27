'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { COOKIE_CHOICE_EVENT } from '@/components/help/IntroGuide';

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('sg_cookie_consent');
    if (!consent) {
      // Show after a gentle 1.5 second delay
      const timer = setTimeout(() => setShowBanner(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    localStorage.setItem('sg_cookie_consent', 'all');
    setShowBanner(false);
    window.dispatchEvent(new Event(COOKIE_CHOICE_EVENT));
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem('sg_cookie_consent', 'necessary_only');
    setShowBanner(false);
    window.dispatchEvent(new Event(COOKIE_CHOICE_EVENT));
  };

  if (!showBanner) return null;

  return (
    <div
      role="dialog"
      aria-label="Çerez tercihleri"
      className="fixed inset-x-0 bottom-[60px] md:bottom-0 z-50 bg-white border-t border-slate-300 shadow-[0_-2px_12px_rgba(23,25,28,0.08)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        <p className="text-sm text-slate-700 leading-relaxed flex-1">
          Sitenin çalışması için zorunlu çerezler ve kullanımı iyileştirmek için anonim analiz çerezleri
          kullanıyoruz. Ayrıntılar için{' '}
          <Link href="/gizlilik" className="underline underline-offset-2 hover:text-navy-900">
            Gizlilik ve Çerez Politikası
          </Link>
          .
        </p>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={handleAcceptNecessary} className="btn-secondary !py-2">
            Yalnızca zorunlu
          </button>
          <button type="button" onClick={handleAcceptAll} className="btn-dark !py-2">
            Tümünü kabul et
          </button>
        </div>
      </div>
    </div>
  );
}
