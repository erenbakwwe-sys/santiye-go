'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Heart,
  Search,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Send,
  Calendar,
  MessageSquare,
  FileText,
  Plus,
} from 'lucide-react';
import { DEMO_LISTINGS } from '@/lib/mock-data';
import ListingCard from '@/components/listings/ListingCard';

export default function BuyerDashboardPage() {
  const [favorites, setFavorites] = useState(DEMO_LISTINGS.slice(0, 2));

  const handleFavoriteToggle = (id: string, isFav: boolean) => {
    if (!isFav) {
      setFavorites((prev) => prev.filter((l) => l.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div className="bg-navy-900 rounded-2xl p-6 sm:p-8 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/30">
            <User className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Alıcı & Müteahhit Paneli
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-navy-800 border border-slate-700 text-orange-400">
                ALICI
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Tekliflerinizi karşılaştırın, rezervasyonlarınızı yönetin ve tedarikçilerle doğrudan görüşün
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/teklif-iste"
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-lg shadow-orange-500/25 flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Teklif Talebi Aç
          </Link>
          <Link
            href="/ilanlar"
            className="px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 border border-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Search className="w-4 h-4" />
            İlanlar
          </Link>
        </div>
      </div>

      {/* Quick Dashboard Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link
          href="/alici-paneli/taleplerim"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center group-hover:scale-110 transition">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-navy-900 group-hover:text-orange-600 transition">
            Teklif Taleplerim & Karşılaştırma
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Açtığınız taleplere gelen teklifleri mesafe, fiyat ve şartlarına göre karşılaştırıp onaylayın.
          </p>
        </Link>

        <Link
          href="/alici-paneli/rezervasyonlar"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
            <Calendar className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-navy-900 group-hover:text-orange-600 transition">
            Kiralama Rezervasyonlarım
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            İlanlardan gönderdiğiniz tarihli rezervasyon talepleri ve 48 saatlik firma onay süreçleri.
          </p>
        </Link>

        <Link
          href="/mesajlar"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition">
            <MessageSquare className="w-5 h-5" />
          </div>
          <h3 className="text-base font-extrabold text-navy-900 group-hover:text-orange-600 transition">
            Tedarikçi Mesajlarım
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            İlanlar ve teklifler hakkında makine sahipleriyle birebir canlı yazışmalarınız.
          </p>
        </Link>
      </div>

      {/* Favorites Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-navy-900 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500 fill-red-500" />
            Favori İlanlarım ({favorites.length})
          </h2>
          <span className="text-xs text-slate-500">
            Fiyat ve müsaitlik değişikliklerini buradan takip edebilirsiniz
          </span>
        </div>

        {favorites.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3 shadow-sm">
            <Heart className="w-10 h-10 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-navy-900">
              Henüz favoriye eklenmiş ilanınız yok
            </h3>
            <p className="text-xs text-slate-500">
              İlan kartlarındaki kalp simgesine tıklayarak beğendiğiniz makineleri ve malzemeleri buraya kaydedebilirsiniz.
            </p>
            <Link
              href="/ilanlar"
              className="inline-block mt-2 px-5 py-2 rounded-xl bg-navy-900 text-white text-xs font-bold"
            >
              İlanları Keşfet
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {favorites.map((listing) => (
              <ListingCard
                key={listing.id}
                listing={listing}
                isFavorited={true}
                onFavoriteToggle={handleFavoriteToggle}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
