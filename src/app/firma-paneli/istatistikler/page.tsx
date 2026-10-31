'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  TrendingUp,
  ArrowLeft,
  Eye,
  Users,
  Heart,
  Phone,
  MessageCircle,
  FileCheck2,
  CalendarCheck,
  Percent,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  HelpCircle,
} from 'lucide-react';
import { getCompanyPerformanceStats } from '@/lib/services/analytics-service';
import { DEMO_LISTINGS } from '@/lib/services/listing-service';
import { DEMO_CAMPAIGNS } from '@/lib/services/ad-service';

export default function CompanyStatisticsPage() {
  const companyId = 'f0000000-0000-0000-0000-000000000001';
  const myListings = DEMO_LISTINGS.filter((l) => l.company_id === companyId);
  const myCampaigns = DEMO_CAMPAIGNS.filter((c) => c.company_id === companyId);

  const [timeRange, setTimeRange] = useState<number>(30); // 7, 30, 90 days
  const stats = getCompanyPerformanceStats(companyId, timeRange);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/firma-paneli"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Firma Paneline Dön
          </Link>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              Firma Performansı ve İstatistikler
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            İlanlarınızın şantiyeler tarafından görüntülenme, telefon/WhatsApp tıklanma ve teklif dönüşüm oranlarını gerçek zamanlı analiz edin.
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl self-start sm:self-auto">
          {[
            { days: 7, label: 'Son 7 Gün' },
            { days: 30, label: 'Son 30 Gün' },
            { days: 90, label: 'Son 90 Gün' },
          ].map((btn) => (
            <button
              key={btn.days}
              type="button"
              onClick={() => setTimeRange(btn.days)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition ${
                timeRange === btn.days
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Görüntülenme</span>
            <Eye className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-navy-900">
            {stats.views.toLocaleString('tr-TR')}
          </div>
          <p className="text-[11px] text-slate-500">İlan detay sayfası açılışı</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Tekil Ziyaretçi</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-navy-900">
            {stats.uniqueVisitors.toLocaleString('tr-TR')}
          </div>
          <p className="text-[11px] text-slate-500">Farklı müteahhit oturumu</p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">İletişim Talebi</span>
            <Phone className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-navy-900">
            {(stats.phoneClicks + stats.whatsappClicks).toLocaleString('tr-TR')}
          </div>
          <p className="text-[11px] text-slate-500">
            {stats.phoneClicks} Telefon / {stats.whatsappClicks} WhatsApp
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold uppercase tracking-wider">Dönüşüm Oranı</span>
            <Percent className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-700">
            %{stats.conversionRate}
          </div>
          <p className="text-[11px] text-slate-500">Teklif veya arama üretme oranı</p>
        </div>
      </div>

      {/* Visual Activity Breakdown & Lead Funnel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Lead Funnel */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-orange-500" />
            Müşteri Kazanım Hunisi
          </h2>
          <p className="text-xs text-slate-500">
            Şantiyelerin ilanlarınızı gördükten sonra iletişime ve teklife geçme aşamaları:
          </p>

          <div className="space-y-3 pt-2">
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>1. Sayfa Ziyareti</span>
                <span>{stats.uniqueVisitors} Ziyaretçi (%100)</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full w-full" />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>2. İlgilenme (Favori Ekleme)</span>
                <span>{stats.favorites} Şantiye (%{((stats.favorites / (stats.uniqueVisitors || 1)) * 100).toFixed(1)})</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{ width: `${Math.min(100, (stats.favorites / (stats.uniqueVisitors || 1)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>3. İletişim & Teklif Talebi</span>
                <span>{stats.phoneClicks + stats.whatsappClicks + stats.quotesReceived} Talep (%{stats.conversionRate})</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: `${Math.min(100, stats.conversionRate * 5)}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-bold text-slate-700">
                <span>4. Kesin Rezervasyon</span>
                <span>{stats.bookingsMade} Kiralama</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${Math.min(100, (stats.bookingsMade / (stats.uniqueVisitors || 1)) * 100 * 10)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Ad Performance Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-orange-500" />
              Reklam ve Öne Çıkarma Performansı
            </h2>
            <Link
              href="/firma-paneli/one-cikar"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 transition"
            >
              + Reklam Ver
            </Link>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-bold uppercase">Reklam Gösterimi</div>
              <div className="text-2xl font-black text-navy-900 mt-1">
                {stats.adImpressions.toLocaleString('tr-TR')}
              </div>
              <span className="text-[10px] text-slate-400">Arama & Vitrin slotu</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-bold uppercase">Reklam Tıklaması</div>
              <div className="text-2xl font-black text-navy-900 mt-1">
                {stats.adClicks.toLocaleString('tr-TR')}
              </div>
              <span className="text-[10px] text-slate-400">Doğrudan ilan açılışı</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-xs text-slate-500 font-bold uppercase">Tıklama Oranı (CTR)</div>
              <div className="text-2xl font-black text-orange-600 mt-1">
                %{stats.adCtr}
              </div>
              <span className="text-[10px] text-emerald-600 font-bold">Sektör ortalaması üstü</span>
            </div>
          </div>

          {/* Campaigns list preview */}
          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase text-slate-500 mb-2">Aktif Kampanyalar</h3>
            <div className="space-y-2">
              {myCampaigns.map((c) => (
                <div
                  key={c.id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-navy-900">{c.title}</span>
                    <span className="text-slate-400 text-[11px] block">{c.duration_days} Günlük • {c.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-navy-900">{c.clicks_count} Tıklama</span>
                    <span className="text-slate-500 text-[11px] block">{c.impressions_count} Gösterim</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Listing Performance Breakdown Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-slate-200">
          <h2 className="text-base font-extrabold text-navy-900">
            İlan Bazında Performans Kırılımı
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Hangi makine veya malzemenizin daha çok talep gördüğünü inceleyin.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">İlan Başlığı</th>
                <th className="py-3 px-4">Kategori</th>
                <th className="py-3 px-4">Fiyat</th>
                <th className="py-3 px-4 text-center">Görüntülenme</th>
                <th className="py-3 px-4 text-center">İletişim Tıklaması</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myListings.map((listing, index) => (
                <tr key={listing.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-bold text-navy-900 max-w-xs truncate">
                    {listing.title}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {listing.category?.name || 'İş Makinesi'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-navy-900">
                    {listing.price_daily?.toLocaleString('tr-TR')} ₺/gün
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-navy-900">
                    {Math.round((stats.views / myListings.length) * (index === 0 ? 1.4 : 0.8))}
                  </td>
                  <td className="py-3 px-4 text-center font-bold text-orange-600">
                    {Math.round((stats.phoneClicks / myListings.length) * (index === 0 ? 1.3 : 0.7))}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Link
                      href="/firma-paneli/one-cikar"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 font-bold text-xs transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Öne Çıkar
                    </Link>
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
