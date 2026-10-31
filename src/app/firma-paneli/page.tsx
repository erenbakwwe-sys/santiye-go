'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  PlusCircle,
  Layers,
  CheckCircle,
  Eye,
  Edit,
  Trash2,
  Power,
  MapPin,
  TrendingUp,
} from 'lucide-react';
import { DEMO_LISTINGS } from '@/lib/mock-data';
import { Listing } from '@/types/database';

export default function CompanyDashboardPage() {
  const [listings, setListings] = useState<Listing[]>(DEMO_LISTINGS.slice(0, 3));

  // Toggle active/inactive status
  const handleToggleStatus = (id: string) => {
    setListings((prev) =>
      prev.map((l) =>
        l.id === id
          ? { ...l, status: l.status === 'active' ? 'inactive' : 'active' }
          : l
      )
    );
  };

  const handleDeleteListing = (id: string) => {
    if (confirm('Bu ilanı silmek istediğinize emin misiniz?')) {
      setListings((prev) => prev.filter((l) => l.id !== id));
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Dashboard Top Header */}
      <div className="bg-navy-900 rounded-2xl p-6 sm:p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-black text-2xl shadow-lg shadow-orange-500/30">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
                Anadolu İş Makineleri Parkı
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-orange-500 text-white">
                FİRMA
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium mt-1">
              Tuzla Mermerciler Sanayi Sitesi, İstanbul • Tel: +90 532 000 0101
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <Link
            href="/firma-paneli/profil"
            className="flex-1 md:flex-none text-center px-4 py-2.5 rounded-xl bg-navy-800 hover:bg-navy-700 text-slate-200 text-xs font-bold border border-slate-700 transition"
          >
            Firma Profilini Düzenle
          </Link>
          <Link
            href="/firma-paneli/yeni-ilan"
            className="flex-1 md:flex-none text-center px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Yeni İlan Ekle</span>
          </Link>
        </div>
      </div>

      {/* Metric Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Yayındaki İlanlar</div>
            <div className="text-3xl font-black text-navy-900 mt-1">
              {listings.filter((l) => l.status === 'active').length}
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Toplam İlan Sayısı</div>
            <div className="text-3xl font-black text-navy-900 mt-1">{listings.length}</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-500 uppercase">Toplam İlan Görüntülenme</div>
            <div className="text-3xl font-black text-navy-900 mt-1">1.480+</div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Navigation Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Link
          href="/firma-paneli/talepler"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="text-orange-600 font-black text-sm uppercase tracking-wide">
            Gelen Talepler
          </div>
          <h3 className="font-extrabold text-navy-900 text-base group-hover:text-orange-600 transition">
            Teklif Talepleri (2)
          </h3>
          <p className="text-xs text-slate-500">
            Şantiyelerden gelen iş teklifi taleplerine tek tıkla fiyat verin.
          </p>
        </Link>

        <Link
          href="/firma-paneli/rezervasyonlar"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="text-blue-600 font-black text-sm uppercase tracking-wide">
            Rezervasyonlar
          </div>
          <h3 className="font-extrabold text-navy-900 text-base group-hover:text-orange-600 transition">
            Kiralama Talepleri
          </h3>
          <p className="text-xs text-slate-500">
            Tarihli rezervasyonları 48 saat içinde onaylayın veya reddedin.
          </p>
        </Link>

        <Link
          href="/firma-paneli/takvim"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="text-emerald-600 font-black text-sm uppercase tracking-wide">
            Müsaitlik
          </div>
          <h3 className="font-extrabold text-navy-900 text-base group-hover:text-orange-600 transition">
            Makine Takvimi
          </h3>
          <p className="text-xs text-slate-500">
            Makinelerinizin kirada, müsait ve bakımda olduğu günleri yönetin.
          </p>
        </Link>

        <Link
          href="/firma-paneli/kazanclarim"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="text-emerald-700 font-black text-sm uppercase tracking-wide">
            iyzico Finans
          </div>
          <h3 className="font-extrabold text-navy-900 text-base group-hover:text-orange-600 transition">
            Kazançlarım & Hakediş
          </h3>
          <p className="text-xs text-slate-500">
            Kiralama ödemelerinizi, komisyon kesintilerini ve IBAN aktarımlarını izleyin.
          </p>
        </Link>

        <Link
          href="/firma-paneli/uyelik"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="text-amber-600 font-black text-sm uppercase tracking-wide">
            Paket & Limitler
          </div>
          <h3 className="font-extrabold text-navy-900 text-base group-hover:text-orange-600 transition">
            Firma Üyeliğim (Pro)
          </h3>
          <p className="text-xs text-slate-500">
            İlan limitinizi, fotoğraf haklarınızı ve komisyon indiriminizi yönetin.
          </p>
        </Link>

        <Link
          href="/mesajlar"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="text-purple-600 font-black text-sm uppercase tracking-wide">
            Canlı İletişim
          </div>
          <h3 className="font-extrabold text-navy-900 text-base group-hover:text-orange-600 transition">
            Mesaj Kutusu
          </h3>
          <p className="text-xs text-slate-500">
            Müteahhitlerden gelen soruları ve teklif detaylarını yanıtlayın.
          </p>
        </Link>

        <Link
          href="/firma-paneli/one-cikar"
          className="p-5 rounded-2xl bg-white border border-orange-200 bg-gradient-to-br from-white to-orange-50/40 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="text-orange-600 font-black text-sm uppercase tracking-wide flex items-center justify-between">
            <span>Öne Çıkar & Vitrin</span>
            <span className="text-[10px] bg-orange-500 text-white px-2 py-0.5 rounded-full font-bold">Yeni</span>
          </div>
          <h3 className="font-extrabold text-navy-900 text-base group-hover:text-orange-600 transition">
            Reklam Ver & Öne Çıkar
          </h3>
          <p className="text-xs text-slate-500">
            Arama sonuçlarında ve ana sayfa vitrininde ilk sıralarda yer alın.
          </p>
        </Link>

        <Link
          href="/firma-paneli/istatistikler"
          className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm hover:border-orange-500 hover:shadow-md transition group space-y-2"
        >
          <div className="text-cyan-700 font-black text-sm uppercase tracking-wide">
            Raporlama
          </div>
          <h3 className="font-extrabold text-navy-900 text-base group-hover:text-orange-600 transition">
            İstatistikler & Dönüşüm
          </h3>
          <p className="text-xs text-slate-500">
            Görüntülenme, benzersiz ziyaretçi, telefon araması ve teklif oranları.
          </p>
        </Link>
      </div>

      {/* Listing Management Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-extrabold text-navy-900">
            Firma İlanlarım ({listings.length})
          </h2>
          <Link
            href="/firma-paneli/yeni-ilan"
            className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Yeni İlan Ver
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Görsel & Başlık</th>
                <th className="py-3 px-4">Kategori / Tür</th>
                <th className="py-3 px-4">Fiyat Tarifesi</th>
                <th className="py-3 px-4">Konum</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50/80 transition">
                  {/* Photo & Title */}
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative w-14 h-11 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                        <Image
                          src={
                            l.images?.[0] ||
                            'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=200&q=80'
                          }
                          alt={l.title}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="max-w-xs">
                        <Link
                          href={`/ilan/${l.slug || l.id}`}
                          className="font-bold text-navy-900 hover:text-orange-600 line-clamp-1"
                        >
                          {l.title}
                        </Link>
                        <span className="text-[11px] text-slate-400">
                          {new Date(l.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-700">
                      {l.category?.name || 'Genel'}
                    </span>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                      {l.listing_type === 'rental' ? 'Kiralık' : 'Satılık'}
                    </div>
                  </td>

                  {/* Price */}
                  <td className="py-3 px-4 font-bold text-navy-900">
                    {l.listing_type === 'sale'
                      ? `${Number(l.price_sale).toLocaleString('tr-TR')} ₺`
                      : `${Number(l.price_daily).toLocaleString('tr-TR')} ₺ / gün`}
                  </td>

                  {/* Location */}
                  <td className="py-3 px-4 text-slate-600 font-medium">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-500" />
                      <span>
                        {l.city_name}, {l.district_name}
                      </span>
                    </div>
                  </td>

                  {/* Status Toggle */}
                  <td className="py-3 px-4">
                    <button
                      onClick={() => handleToggleStatus(l.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold transition ${
                        l.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                          : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      }`}
                      title="Durumu Değiştir"
                    >
                      <Power className="w-3 h-3" />
                      {l.status === 'active' ? 'Yayında' : 'Yayından Kaldırıldı'}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right space-x-2">
                    <Link
                      href={`/ilan/${l.slug || l.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100 inline-block"
                      title="Görüntüle"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/firma-paneli/yeni-ilan?edit=${l.id}`}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-slate-100 inline-block"
                      title="Düzenle"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => handleDeleteListing(l.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 inline-block"
                      title="Sil"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
