'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  RotateCcw,
  AlertCircle,
  Search,
  Filter,
} from 'lucide-react';
import { PaymentTransaction } from '@/types/database';
import { DEMO_TRANSACTIONS } from '@/lib/services/payment-service';

export default function AdminPaymentsPage() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(DEMO_TRANSACTIONS);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const formatCents = (cents: number) => {
    return (cents / 100).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₺';
  };

  const handleExportCSV = () => {
    const headers = [
      'Islem ID',
      'Tarih',
      'Alici',
      'Satici Firma',
      'Firma VKN',
      'Toplam Tutar (TL)',
      'Komisyon Orani (%)',
      'Komisyon Tutari (TL)',
      'Komisyon KDV (TL)',
      'Tavan Uygulandi mi',
      'Tavanla Kirpilan Komisyon (TL)',
      'Net Satici Hakedis (TL)',
      'Durum',
      'Aktarim Durumu',
      'iyzico Odeme No',
    ];

    const rows = transactions.map((t) => [
      t.id,
      new Date(t.created_at).toLocaleDateString('tr-TR'),
      t.buyer?.full_name || '',
      t.company?.name || '',
      t.company?.tax_number || '',
      (t.amount_cents / 100).toFixed(2),
      t.commission_rate_percent,
      (t.commission_amount_cents / 100).toFixed(2),
      (t.vat_amount_cents / 100).toFixed(2),
      t.is_commission_capped ? 'Evet' : 'Hayir',
      ((t.capped_commission_savings_cents || 0) / 100).toFixed(2),
      (t.net_company_amount_cents / 100).toFixed(2),
      t.status,
      t.is_transferred_to_submerchant ? 'Aktarildi' : 'Havuzda',
      t.provider_payment_id || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `santiye_go_odeme_raporu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = transactions.filter((t) => {
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.buyer?.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.company?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalVolume = filtered.reduce((acc, t) => acc + t.amount_cents, 0);
  const totalCommission = filtered.reduce((acc, t) => acc + t.commission_amount_cents, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-slate-500 hover:text-navy-900 font-bold">
              Yönetim Paneli
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-xs text-orange-600 font-bold">Ödemeler & Finans</span>
          </div>
          <h1 className="text-2xl font-black text-navy-900 mt-1">
            Ödeme Hareketleri & Komisyon Raporu
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pazaryeri havuzundaki bakiyeler, kesilen komisyonlar ve alt üye işyeri aktarım durumları.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-2 transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          CSV DIŞA AKTAR (MUHASEBE & FATURA)
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Filtrelenen Hacim</div>
          <div className="text-2xl font-black text-navy-900">{formatCents(totalVolume)}</div>
          <div className="text-[11px] text-slate-400">{filtered.length} İşlem</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Platform Komisyonu</div>
          <div className="text-2xl font-black text-orange-600">{formatCents(totalCommission)}</div>
          <div className="text-[11px] text-slate-400">Net Platform Hakedişi</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Satıcılara Aktarılan Net</div>
          <div className="text-2xl font-black text-emerald-600">
            {formatCents(totalVolume - totalCommission)}
          </div>
          <div className="text-[11px] text-slate-400">Alt Üye İşyeri Hakedişi</div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'paid', 'transferred', 'refunded'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedStatus === st
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'all' && `Tüm İşlemler (${transactions.length})`}
              {st === 'paid' && 'Havuzda Bekleyen'}
              {st === 'transferred' && 'Satıcıya Aktarılan'}
              {st === 'refunded' && 'İade Edilen'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="İşlem no, alıcı veya firma..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3 px-4">İşlem & Tarih</th>
                <th className="py-3 px-4">Alıcı / Tedarikçi</th>
                <th className="py-3 px-4">Toplam Tutar</th>
                <th className="py-3 px-4">Komisyon (%)</th>
                <th className="py-3 px-4">Tavan & Kırpılan</th>
                <th className="py-3 px-4">Net Satıcı Tutarı</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4">Aktarım</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-mono font-bold text-navy-900">{t.id}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(t.created_at).toLocaleDateString('tr-TR')} • Card: **** {t.card_last_four}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-semibold text-navy-900">{t.buyer?.full_name}</div>
                    <div className="text-[11px] text-slate-500">{t.company?.name}</div>
                  </td>

                  <td className="py-3 px-4 font-black text-navy-900 text-sm">
                    {formatCents(t.amount_cents)}
                  </td>

                  <td className="py-3 px-4">
                    <div className="font-bold text-orange-600">
                      {formatCents(t.commission_amount_cents)}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      %{t.commission_rate_percent} (KDV: {formatCents(t.vat_amount_cents)})
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {t.is_commission_capped ? (
                      <div>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                          Tavan Uygulandı
                        </span>
                        <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">
                          Kırpılan: {formatCents(t.capped_commission_savings_cents || 0)}
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 text-[10px]">Tavan Yok</span>
                    )}
                  </td>

                  <td className="py-3 px-4 font-bold text-emerald-700">
                    {formatCents(t.net_company_amount_cents)}
                  </td>

                  <td className="py-3 px-4">
                    {t.status === 'transferred' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Tamamlandı
                      </span>
                    )}
                    {t.status === 'paid' && (
                      <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                        Havuzda (Escrow)
                      </span>
                    )}
                    {t.status === 'refunded' && (
                      <span className="px-2 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-bold">
                        İade Edildi
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {t.is_transferred_to_submerchant ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> IBAN&apos;a Aktarıldı
                      </span>
                    ) : (
                      <span className="text-orange-600 font-semibold flex items-center gap-1 text-[11px]">
                        <Clock className="w-3.5 h-3.5" /> Teslim Bekleniyor
                      </span>
                    )}
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
