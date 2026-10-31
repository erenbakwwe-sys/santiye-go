import Link from 'next/link';
import { HardHat, Search, Home, ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center p-4 bg-slate-50">
      <div className="max-w-lg w-full bg-white p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl text-center space-y-6">
        <div className="relative inline-block">
          <div className="w-20 h-20 rounded-2xl bg-navy-900 text-orange-500 flex items-center justify-center mx-auto shadow-lg">
            <HardHat className="w-10 h-10" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-orange-500 text-white font-black text-xs shadow">
            404
          </span>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
            Aradığınız Sayfa Bulunamadı
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto leading-relaxed">
            Ulaşmaya çalıştığınız ilan yayından kaldırılmış, taşınmış veya bağlantı adresi değişmiş olabilir.
          </p>
        </div>

        {/* Quick Links */}
        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/ilanlar"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition flex items-center justify-center gap-2"
          >
            <Search className="w-4 h-4" />
            <span>Tüm İlanlarda Ara</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:flex-1 py-3 px-4 rounded-xl border border-slate-300 hover:bg-slate-100 text-navy-900 font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            <span>Ana Sayfaya Dön</span>
          </Link>
        </div>

        <div className="border-t border-slate-100 pt-4 text-xs text-slate-400">
          Popüler Kategoriler:{' '}
          <Link href="/ilanlar?category=ekskavator" className="text-orange-600 hover:underline font-semibold ml-1">Ekskavatör</Link>,{' '}
          <Link href="/ilanlar?category=iskele-kalip" className="text-orange-600 hover:underline font-semibold ml-1">İskele</Link>,{' '}
          <Link href="/ilanlar?category=nakliye" className="text-orange-600 hover:underline font-semibold ml-1">Nakliye</Link>
        </div>
      </div>
    </div>
  );
}
