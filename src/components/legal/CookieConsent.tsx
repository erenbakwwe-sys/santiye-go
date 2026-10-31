'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Cookie, X } from 'lucide-react';

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
  };

  const handleAcceptNecessary = () => {
    localStorage.setItem('sg_cookie_consent', 'necessary_only');
    setShowBanner(false);
  };

  if (!showBanner) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-50 animate-slide-up">
      <div className="bg-navy-950 text-white rounded-2xl p-5 border border-navy-800 shadow-2xl space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center shrink-0 border border-orange-500/30">
            <Cookie className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h4 className="font-black text-sm tracking-tight text-white flex items-center gap-1.5">
              <span>Çerez ve Analitik Tercihleri</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-orange-500 text-white font-bold">KVKK</span>
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Şantiye GO, platformun çalışması ve şantiye arama istatistiklerini anonim olarak iyileştirmek için çerezler kullanır. Ham IP adresiniz kesinlikle saklanmaz.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAcceptAll}
            className="w-full sm:w-auto flex-1 py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition shadow-md shadow-orange-500/20"
          >
            Tümünü Kabul Et
          </button>
          <button
            type="button"
            onClick={handleAcceptNecessary}
            className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-300 hover:text-white font-bold text-xs transition border border-navy-700"
          >
            Yalnızca Zorunlular
          </button>
        </div>

        <div className="text-[11px] text-slate-400 text-center sm:text-left">
          Detaylar için <Link href="/gizlilik" className="underline hover:text-orange-400">Gizlilik & Çerez Politikası</Link>&apos;nı inceleyebilirsiniz.
        </div>
      </div>
    </div>
  );
}
