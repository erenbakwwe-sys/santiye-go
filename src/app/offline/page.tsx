'use client';

import { WifiOff, RotateCcw, HardHat } from 'lucide-react';

export default function OfflinePage() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-6 shadow-xl">
        <div className="w-20 h-20 rounded-3xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-inner">
          <WifiOff className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-[11px] font-bold text-slate-600">
            <HardHat className="w-3.5 h-3.5 text-orange-500" />
            ŞANTİYE GO ÇEVRİMDIŞI MOD
          </div>
          <h1 className="text-2xl font-black text-navy-900 tracking-tight">
            İnternet Bağlantısı Yok
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Şu anda çevrimdışısınız. Şantiye sahasında fiyat ve makine müsaitliklerinin her zaman güncel kalabilmesi için canlı internet bağlantısı gerekmektedir.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReload}
          className="w-full py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-xs shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
        >
          <RotateCcw className="w-4 h-4" />
          Bağlantıyı Yenile ve Tekrar Dene
        </button>

        <p className="text-[11px] text-slate-400">
          İpucu: Wi-Fi veya hücresel verinizi açtıktan sonra sayfa otomatik olarak yüklenecektir.
        </p>
      </div>
    </div>
  );
}
