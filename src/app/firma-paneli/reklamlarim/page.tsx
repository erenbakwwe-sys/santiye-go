'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  ArrowLeft,
  PlusCircle,
  Eye,
  MousePointerClick,
  Percent,
  Clock,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Layers,
  MapPin,
} from 'lucide-react';
import { DEMO_CAMPAIGNS, DEFAULT_AD_PRODUCTS } from '@/lib/services/ad-service';
import { AdCampaign } from '@/types/database';

export default function MyAdCampaignsPage() {
  const companyId = 'f0000000-0000-0000-0000-000000000001';
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(
    DEMO_CAMPAIGNS.filter((c) => c.company_id === companyId)
  );
  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const filteredCampaigns = campaigns.filter((c) => {
    if (selectedFilter === 'all') return true;
    return c.status === selectedFilter;
  });

  const getStatusBadge = (status: AdCampaign['status']) => {
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Yayında
          </span>
        );
      case 'pending_moderation':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Onay Bekliyor
          </span>
        );
      case 'expired':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-slate-100 text-slate-700">
            Süresi Doldu
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-red-100 text-red-800">
            <AlertCircle className="w-3.5 h-3.5 text-red-600" />
            Reddedildi (İade Edildi)
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
  };

  const handleRenew = (campaignId: string) => {
    alert('Kampanyanız 7 günlük süreyle yenilendi ve sandbox ödemesi onaylandı!');
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: 'active',
              expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
            }
          : c
      )
    );
  };

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
            <Sparkles className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              Reklam ve Öne Çıkarma Kampanyalarım
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Satın aldığınız vitrin ve sponsorlu arama reklamlarınızın durumunu, gösterim ve tıklama performanslarını takip edin.
          </p>
        </div>

        <Link
          href="/firma-paneli/one-cikar"
          className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2 transition"
        >
          <PlusCircle className="w-4 h-4" />
          Yeni Reklam Ver
        </Link>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3 overflow-x-auto text-xs font-bold">
        {[
          { key: 'all', label: 'Tüm Kampanyalar' },
          { key: 'active', label: 'Yayındakiler' },
          { key: 'pending_moderation', label: 'Onay Bekleyenler' },
          { key: 'expired', label: 'Süresi Dolanlar' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setSelectedFilter(tab.key)}
            className={`px-4 py-2 rounded-xl transition ${
              selectedFilter === tab.key
                ? 'bg-navy-900 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Campaigns Grid */}
      {filteredCampaigns.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-4">
          <Layers className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-extrabold text-navy-900">Bu filtrede kampanya bulunamadı</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            İlanlarınızı arama sonuçlarında en üst sıralara taşımak için yeni bir öne çıkarma reklamı başlatabilirsiniz.
          </p>
          <Link
            href="/firma-paneli/one-cikar"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition shadow-md shadow-orange-500/20"
          >
            <PlusCircle className="w-4 h-4" />
            Hemen Reklam Ver
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCampaigns.map((camp) => {
            const product = DEFAULT_AD_PRODUCTS.find((p) => p.id === camp.product_id);
            const ctr =
              camp.impressions_count > 0
                ? ((camp.clicks_count / camp.impressions_count) * 100).toFixed(2)
                : '0.00';

            return (
              <div
                key={camp.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-black uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md">
                      {product?.name || camp.product_id}
                    </span>
                    {getStatusBadge(camp.status)}
                  </div>

                  <h3 className="font-extrabold text-navy-900 text-base leading-snug">
                    {camp.title}
                  </h3>

                  {camp.listing && (
                    <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                      <div className="text-slate-500 text-[11px]">Bağlı İlan:</div>
                      <div className="font-bold text-navy-900 truncate">
                        {camp.listing.title}
                      </div>
                      <div className="text-slate-500 flex items-center gap-1 text-[11px]">
                        <MapPin className="w-3 h-3 text-orange-500" />
                        {camp.listing.address_detail || 'İstanbul'}
                      </div>
                    </div>
                  )}

                  {/* Performance Metrics Cards */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-center">
                    <div className="p-2 rounded-xl bg-slate-50">
                      <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                        <Eye className="w-3 h-3 text-slate-400" /> Gösterim
                      </div>
                      <div className="text-base font-black text-navy-900 mt-0.5">
                        {camp.impressions_count}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50">
                      <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                        <MousePointerClick className="w-3 h-3 text-slate-400" /> Tıklama
                      </div>
                      <div className="text-base font-black text-navy-900 mt-0.5">
                        {camp.clicks_count}
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50">
                      <div className="text-[10px] text-slate-500 font-bold uppercase flex items-center justify-center gap-1">
                        <Percent className="w-3 h-3 text-slate-400" /> CTR
                      </div>
                      <div className="text-base font-black text-orange-600 mt-0.5">
                        %{ctr}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer details & action */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 text-[11px]">Bitiş Tarihi:</span>
                    <div className="font-bold text-navy-900">
                      {camp.expires_at
                        ? new Date(camp.expires_at).toLocaleDateString('tr-TR')
                        : `${camp.duration_days} Gün (Onayda)`}
                    </div>
                  </div>

                  {camp.status === 'expired' && (
                    <button
                      type="button"
                      onClick={() => handleRenew(camp.id)}
                      className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-xs flex items-center gap-1 transition shadow-sm"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Yenile
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
