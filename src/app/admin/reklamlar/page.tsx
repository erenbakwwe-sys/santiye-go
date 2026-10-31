'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  MousePointerClick,
  Percent,
  AlertCircle,
  RotateCcw,
  Sliders,
  DollarSign,
  Layers,
  MapPin,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import {
  DEMO_CAMPAIGNS,
  DEFAULT_AD_PRODUCTS,
  moderateAdCampaign,
} from '@/lib/services/ad-service';
import { AdCampaign, AdProduct } from '@/types/database';

export default function AdminAdsPage() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>(DEMO_CAMPAIGNS);
  const [products, setProducts] = useState<AdProduct[]>(DEFAULT_AD_PRODUCTS);
  const [activeTab, setActiveTab] = useState<'campaigns' | 'products'>('campaigns');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Rejection modal
  const [rejectingCampaignId, setRejectingCampaignId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const filteredCampaigns = campaigns.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.status === statusFilter;
  });

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
  };

  const handleApprove = async (campaignId: string) => {
    await moderateAdCampaign(campaignId, 'approve');
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === campaignId
          ? {
              ...c,
              status: 'active',
              starts_at: new Date().toISOString(),
              expires_at: new Date(Date.now() + 86400000 * c.duration_days).toISOString(),
            }
          : c
      )
    );
  };

  const handleRejectSubmit = async () => {
    if (!rejectingCampaignId) return;
    await moderateAdCampaign(rejectingCampaignId, 'reject', rejectionReason);
    setCampaigns((prev) =>
      prev.map((c) =>
        c.id === rejectingCampaignId
          ? {
              ...c,
              status: 'rejected',
              moderation_notes: rejectionReason || 'Reklam kurallarına uygun bulunmadı.',
            }
          : c
      )
    );
    setRejectingCampaignId(null);
    setRejectionReason('');
    alert('Kampanya reddedildi ve ödeme tutarı otomatik olarak alt üye işyerine tam iade edildi.');
  };

  const handleProductPriceChange = (
    productId: string,
    field: 'price_7_days_cents' | 'price_14_days_cents' | 'price_30_days_cents' | 'slot_capacity',
    val: number
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, [field]: val } : p))
    );
  };

  return (
    <div className="p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              Reklam ve Vitrin Moderasyonu
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Firma reklam taleplerini onaylayın, reddedilenlerde iadeleri tetikleyin ve vitrin slot kapasitelerini dinamik yönetin.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-slate-200/80 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('campaigns')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'campaigns'
                ? 'bg-navy-900 text-white shadow-sm'
                : 'text-slate-700 hover:text-navy-900'
            }`}
          >
            Kampanyalar ({campaigns.filter((c) => c.status === 'pending_moderation').length} Onay Bekliyor)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('products')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition ${
              activeTab === 'products'
                ? 'bg-navy-900 text-white shadow-sm'
                : 'text-slate-700 hover:text-navy-900'
            }`}
          >
            Ürün Fiyat & Slot Ayarları
          </button>
        </div>
      </div>

      {activeTab === 'campaigns' ? (
        <div className="space-y-4">
          {/* Status Filter */}
          <div className="flex items-center gap-2 overflow-x-auto text-xs font-bold pb-2">
            {[
              { key: 'all', label: 'Tümü' },
              { key: 'pending_moderation', label: 'Onay Bekleyenler' },
              { key: 'active', label: 'Yayındakiler' },
              { key: 'expired', label: 'Süresi Dolanlar' },
              { key: 'rejected', label: 'Reddedilenler' },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setStatusFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-xl transition ${
                  statusFilter === f.key
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b">
                  <tr>
                    <th className="py-3 px-4">Kampanya & Ürün</th>
                    <th className="py-3 px-4">Bağlı İlan</th>
                    <th className="py-3 px-4">Süre & Tutar</th>
                    <th className="py-3 px-4 text-center">Gösterim / Tık</th>
                    <th className="py-3 px-4">Durum</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCampaigns.map((camp) => {
                    const ctr =
                      camp.impressions_count > 0
                        ? ((camp.clicks_count / camp.impressions_count) * 100).toFixed(1)
                        : '0.0';

                    return (
                      <tr key={camp.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-navy-900">{camp.title}</div>
                          <span className="text-[11px] text-orange-600 font-bold">
                            {camp.product_id}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-600">
                          {camp.listing ? (
                            <div className="max-w-xs truncate font-medium text-navy-900">
                              {camp.listing.title}
                            </div>
                          ) : (
                            <span className="text-slate-400">Firma Profili</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-bold text-navy-900">{formatCents(camp.total_price_cents)}</div>
                          <span className="text-[11px] text-slate-500">{camp.duration_days} Günlük</span>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <div className="font-bold text-navy-900">
                            {camp.impressions_count} / {camp.clicks_count}
                          </div>
                          <span className="text-[10px] text-slate-500">CTR: %{ctr}</span>
                        </td>

                        <td className="py-3.5 px-4">
                          {camp.status === 'active' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                              Yayında
                            </span>
                          )}
                          {camp.status === 'pending_moderation' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800">
                              Onay Bekliyor
                            </span>
                          )}
                          {camp.status === 'expired' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-100 text-slate-600">
                              Süresi Doldu
                            </span>
                          )}
                          {camp.status === 'rejected' && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-100 text-red-800">
                              Reddedildi
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {camp.status === 'pending_moderation' ? (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleApprove(camp.id)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1 transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Onayla
                              </button>
                              <button
                                type="button"
                                onClick={() => setRejectingCampaignId(camp.id)}
                                className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 hover:bg-red-100 font-bold text-xs transition"
                              >
                                Reddet
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs">Tamamlandı</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Tab 2: Products and Slot Configuration */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-6 shadow-sm">
          <div>
            <h2 className="text-lg font-black text-navy-900">
              Reklam Ürünleri, Fiyatlandırma ve Slot Kapasitesi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fiyatlar ve maksimum slot sayıları doğrudan veritabanında saklanır, kod değişikliği gerektirmez.
            </p>
          </div>

          <div className="space-y-4">
            {products.map((prod) => (
              <div
                key={prod.id}
                className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3">
                  <div>
                    <h3 className="font-black text-navy-900 text-base">{prod.name}</h3>
                    <p className="text-xs text-slate-500">{prod.description}</p>
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400 bg-white px-2 py-1 rounded border">
                    ID: {prod.id}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Slot Kapasitesi</label>
                    <input
                      type="number"
                      value={prod.slot_capacity}
                      onChange={(e) =>
                        handleProductPriceChange(prod.id, 'slot_capacity', parseInt(e.target.value, 10))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-navy-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">7 Günlük Fiyat (TL)</label>
                    <input
                      type="number"
                      value={prod.price_7_days_cents / 100}
                      onChange={(e) =>
                        handleProductPriceChange(
                          prod.id,
                          'price_7_days_cents',
                          parseFloat(e.target.value) * 100
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-navy-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">14 Günlük Fiyat (TL)</label>
                    <input
                      type="number"
                      value={prod.price_14_days_cents / 100}
                      onChange={(e) =>
                        handleProductPriceChange(
                          prod.id,
                          'price_14_days_cents',
                          parseFloat(e.target.value) * 100
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-navy-900"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">30 Günlük Fiyat (TL)</label>
                    <input
                      type="number"
                      value={prod.price_30_days_cents / 100}
                      onChange={(e) =>
                        handleProductPriceChange(
                          prod.id,
                          'price_30_days_cents',
                          parseFloat(e.target.value) * 100
                        )
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-bold text-navy-900"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => alert('Fiyat ve slot ayarları başarıyla güncellendi.')}
            className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition"
          >
            Tüm Ayarları Kaydet
          </button>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingCampaignId && (
        <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-black text-lg text-navy-900">Reklam Kampanyasını Reddet</h3>
              <button
                type="button"
                onClick={() => setRejectingCampaignId(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Bu reklamı reddettiğinizde firmanın ödediği tutar otomatik olarak <strong>%100 kesintisiz</strong> alt üye işyeri hesabına iade edilecektir.
            </p>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Red Gerekçesi (Firmaya İletilir):</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Örn: Görsel çözünürlüğü yetersiz veya belirtilen makine modeli ile fiyat uyuşmuyor."
                rows={3}
                className="w-full p-3 rounded-xl border border-slate-200 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectingCampaignId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                className="px-5 py-2 rounded-xl text-xs font-black bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/20"
              >
                Reddet ve İade Et
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
