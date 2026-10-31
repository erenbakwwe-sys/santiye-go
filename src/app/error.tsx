'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { logError } from '@/lib/monitoring/logger';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError('AppRouterErrorPage', error, { digest: error.digest });
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl border border-slate-200 shadow-xl text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-black text-navy-900 tracking-tight">
            Beklenmeyen Bir Hata Oluştu
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            İşleminiz gerçekleştirilirken teknik bir aksaklık yaşandı. Teknik ekibimiz durumdan haberdar edildi.
          </p>
          {error.digest && (
            <p className="text-[10px] font-mono text-slate-400 bg-slate-100 py-1 px-2 rounded inline-block">
              Hata Kodu: {error.digest}
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-1.5"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Yeniden Dene</span>
          </button>
          <Link
            href="/"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-navy-900 font-bold text-xs transition flex items-center justify-center gap-1.5"
          >
            <Home className="w-4 h-4" />
            <span>Ana Sayfa</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
