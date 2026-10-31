'use client';

import { useState, useEffect } from 'react';
import { Download, X, Share2, PlusSquare, HardHat } from 'lucide-react';

export default function A2HSPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      return;
    }

    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    // Listen to standard beforeinstallprompt (Android / Chrome / Edge)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Wait for a few seconds before showing unobtrusively
      setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // If iOS and not standalone, show prompt after 5 seconds
    if (isIosDevice && !showPrompt) {
      const iosDismissed = localStorage.getItem('sg_ios_a2hs_dismissed');
      if (!iosDismissed) {
        setTimeout(() => setShowPrompt(true), 5000);
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSGuide(true);
      return;
    }

    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    if (isIOS) {
      localStorage.setItem('sg_ios_a2hs_dismissed', 'true');
    }
  };

  if (!showPrompt) return null;

  return (
    <>
      {/* Floating Bottom A2HS Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-slide-up">
        <div className="bg-navy-900 border border-navy-700 text-white rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center text-white shrink-0 shadow-md">
              <HardHat className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-xs sm:text-sm tracking-tight">
                ŞANTİYE GO Uygulamasını Yükle
              </div>
              <p className="text-[11px] text-slate-300">
                Şantiyenizde tek tıkla hızlı açılış ve anlık bildirimler.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs flex items-center gap-1 transition shadow-md shadow-orange-500/25"
            >
              <Download className="w-3.5 h-3.5" />
              Yükle
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white transition"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Installation Instruction Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 text-center shadow-2xl animate-scale-up">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto">
              <HardHat className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-black text-base text-navy-900">
                iOS Cihazınıza Yükleyin
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apple politikası gereği web push bildirimleri ve PWA yüklemesi Safari üzerinden yapılır:
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 text-left text-xs space-y-2.5 border border-slate-100">
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">1</span>
                <span>Safari&apos;nin altındaki <Share2 className="w-4 h-4 inline text-blue-600" /> (Paylaş) butonuna dokunun.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">2</span>
                <span>Aşağı kaydırıp <PlusSquare className="w-4 h-4 inline text-slate-800" /> &apos;Ana Ekrana Ekle&apos;yi seçin.</span>
              </div>
              <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center text-[10px] font-bold">3</span>
                <span>Sağ üstteki &apos;Ekle&apos;ye basın, uygulama hazır!</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSGuide(false);
                setShowPrompt(false);
              }}
              className="w-full py-3 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition"
            >
              Anladım, Kapat
            </button>
          </div>
        </div>
      )}
    </>
  );
}
