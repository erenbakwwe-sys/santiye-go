'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  MapPin,
  AlertTriangle,
  Search,
  FileSpreadsheet,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Users,
  Building2,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';
import {
  getRegionalSupplyDemandReports,
  getZeroResultSearchQueries,
} from '@/lib/services/analytics-service';

export default function AdminAnalyticsPage() {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [supplyDemandReports] = useState(getRegionalSupplyDemandReports());
  const [zeroResultQueries] = useState(getZeroResultSearchQueries());

  // Revenue breakdown summary
  const revenueSummary = {
    membershipCents: 4470000, // 44.700 TL
    commissionCents: 5897500, // 58.975 TL
    advertisingCents: 2185000, // 21.850 TL
    totalCents: 12552500, // 125.525 TL
  };

  const formatTRY = (cents: number) => {
    return (cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
  };

  const handleExportCSV = () => {
    const headers = [
      'Bolge / Il',
      'Kategori',
      'Arama Talebi',
      'Aktif Ilan Sayisi',
      'Teklif Talebi',
      'Acik Skoru',
      'Aksiyon Onerisi',
    ];

    const rows = supplyDemandReports.map((r) => [
      `"${r.cityName}"`,
      `"${r.categoryName}"`,
      r.searchDemandCount,
      r.activeListingsCount,
      r.quoteRequestsCount,
      r.gapScore,
      `"${r.actionableInsight}"`,
    ]);

    const csvContent =
      '\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `SantiyeGO_Arz_Talep_Analizi_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 sm:p-8 space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              Bölgesel Analiz & Arz-Talep Açığı Raporu
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Türkiye genelinde hangi şantiyelerin hangi makineleri aradığını, nerede makine açığı olduğunu ve gelir kalemlerinizi analiz edin.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-5 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm self-start sm:self-auto"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          Raporu CSV İndir
        </button>
      </div>

      {/* Revenue Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase text-slate-500">Toplam Platform Geliri</span>
          <div className="text-2xl sm:text-3xl font-black text-navy-900">
            {formatTRY(revenueSummary.totalCents)}
          </div>
          <span className="text-[11px] text-emerald-600 font-bold block">Bu ayki toplam hacim</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase text-emerald-700">Rezervasyon Komisyonları</span>
          <div className="text-2xl font-black text-emerald-950">
            {formatTRY(revenueSummary.commissionCents)}
          </div>
          <span className="text-[11px] text-slate-500 block">Kiralama ve satış kesintileri</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase text-blue-700">Firma Üyelik Paketleri</span>
          <div className="text-2xl font-black text-blue-950">
            {formatTRY(revenueSummary.membershipCents)}
          </div>
          <span className="text-[11px] text-slate-500 block">Pro & Premium abonelikler</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-1">
          <span className="text-xs font-bold uppercase text-orange-600">Reklam & Vitrin Geliri</span>
          <div className="text-2xl font-black text-orange-600">
            {formatTRY(revenueSummary.advertisingCents)}
          </div>
          <span className="text-[11px] text-slate-500 block">Sponsorlu arama & vitrinler</span>
        </div>
      </div>

      {/* High-Value Supply-Demand Gap Table ("Çok Aranıyor / Az İlan Var") */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-black text-red-600 uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <span>Platform Büyüme Fırsatları</span>
            </div>
            <h2 className="text-lg font-black text-navy-900 tracking-tight">
              Arz-Talep Açığı Masası (&quot;Çok Aranıyor, Az İlan Var&quot;)
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Firma kazanım ve satış ekibinizin hedefleyeceği bölgeler
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b text-slate-500 font-bold uppercase text-[11px]">
              <tr>
                <th className="py-3 px-4">Bölge & İl</th>
                <th className="py-3 px-4">Talep Edilen Kategori</th>
                <th className="py-3 px-4 text-center">Arama Hacmi</th>
                <th className="py-3 px-4 text-center">Aktif İlan</th>
                <th className="py-3 px-4 text-center">Gelen Teklif</th>
                <th className="py-3 px-4 text-center">Açık Seviyesi</th>
                <th className="py-3 px-4">Stratejik Aksiyon Tavsiyesi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {supplyDemandReports.map((report, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition">
                  <td className="py-3.5 px-4 font-extrabold text-navy-900">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
                      {report.cityName}
                    </span>
                  </td>

                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                    {report.categoryName}
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-navy-900">
                    {report.searchDemandCount}
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-navy-900">
                    <span
                      className={`px-2 py-0.5 rounded font-black ${
                        report.activeListingsCount <= 2
                          ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {report.activeListingsCount} İlan
                    </span>
                  </td>

                  <td className="py-3.5 px-4 text-center font-bold text-navy-900">
                    {report.quoteRequestsCount}
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {report.status === 'critical_shortage' ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-red-100 text-red-800 uppercase tracking-wide">
                        Kritik Açık ({report.gapScore}x)
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 uppercase tracking-wide">
                        Dengeli
                      </span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-xs text-slate-600 max-w-sm leading-relaxed">
                    {report.actionableInsight}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Zero-Result Search Queries (Sonuç Çıkmayan Aramalar) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-orange-500" />
                Sıfır Sonuçlu Aramalar (&quot;Arandı Ama Bulunamadı&quot;)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Müteahhitlerin aradığı fakat platformda eşleşen ilan bulamadığı sorgular.
              </p>
            </div>
            <span className="text-[11px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">
              Pazar Boşluğu
            </span>
          </div>

          <div className="space-y-2">
            {zeroResultQueries.map((q, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-extrabold text-navy-900">{q.keyword}</div>
                  <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-orange-500" /> {q.city} • {q.lastSearched}
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-black text-red-600 text-sm">{q.count} Kez</span>
                  <span className="text-[10px] text-slate-400 block">0 Sonuç</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Regional Activity Ranking */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-orange-500" />
                En Çok Şantiye Araması Yapılan İller
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Konum aramalarının Türkiye genelindeki coğrafi yoğunluğu.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { city: 'İstanbul (Marmara Havzası)', searches: 14200, percentage: 42 },
              { city: 'Ankara (İç Anadolu)', searches: 8400, percentage: 25 },
              { city: 'İzmir & Ege Sanayi Hattı', searches: 4900, percentage: 15 },
              { city: 'Kocaeli & Sakarya Lojistik', searches: 3800, percentage: 11 },
              { city: 'Samsun & Orta Karadeniz', searches: 2400, percentage: 7 },
            ].map((c, idx) => (
              <div key={idx} className="space-y-1">
                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>{c.city}</span>
                  <span>{c.searches.toLocaleString('tr-TR')} Arama (%{c.percentage})</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${c.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
