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
  ShieldCheck,
  AlertTriangle,
  Lock,
  Sliders,
  X,
  FileText,
  Key,
  Layers,
} from 'lucide-react';
import { PaymentTransaction, PaymentDispute } from '@/types/database';
import { DEMO_TRANSACTIONS } from '@/lib/services/payment-service';
import {
  getPlatformEscrowSettings,
  updatePlatformEscrowSettings,
  adminResolveDispute,
  runDailyPaymentReconciliation,
  DEMO_PAYMENT_DISPUTES,
} from '@/lib/services/escrow-service';

export default function AdminPaymentsPage() {
  const [activeTab, setActiveTab] = useState<'payments' | 'disputes' | 'reconciliation' | 'settings'>('payments');
  const [transactions, setTransactions] = useState<PaymentTransaction[]>(DEMO_TRANSACTIONS);
  const [disputes, setDisputes] = useState<PaymentDispute[]>(DEMO_PAYMENT_DISPUTES);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  // Settings State
  const [paymentMode, setPaymentMode] = useState<'external' | 'platform'>('external');
  const [disputeDays, setDisputeDays] = useState(3);
  const [refundAction, setRefundAction] = useState<'refund_full' | 'retain_fee'>('refund_full');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Reconciliation State
  const [reconcileDate, setReconcileDate] = useState(new Date().toISOString().split('T')[0]);
  const [reconReport, setReconReport] = useState<any>(null);

  // Hakem / İtiraz Çözüm Modalı
  const [resolutionModalOpen, setResolutionModalOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<PaymentDispute | null>(null);
  const [resolutionType, setResolutionType] = useState<'transfer_to_company' | 'full_refund_to_buyer' | 'split'>('transfer_to_company');
  const [adminNotes, setAdminNotes] = useState('');
  const [buyerRefundAmount, setBuyerRefundAmount] = useState<number>(0);
  const [companyTransferAmount, setCompanyTransferAmount] = useState<number>(0);
  const [twoFactorChecked, setTwoFactorChecked] = useState(false);
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  useEffect(() => {
    async function loadData() {
      const s = await getPlatformEscrowSettings();
      setPaymentMode(s.payment_mode);
      setDisputeDays(s.escrow_dispute_window_days);
      setRefundAction(s.refund_commission_action);

      // Mutabakatı yükle
      const recon = await runDailyPaymentReconciliation(reconcileDate);
      setReconReport(recon);
    }
    loadData();
  }, [reconcileDate]);

  const formatCents = (cents: number) => {
    return (
      (cents / 100).toLocaleString('tr-TR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + ' ₺'
    );
  };

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    await updatePlatformEscrowSettings({
      payment_mode: paymentMode,
      escrow_dispute_window_days: disputeDays,
      refund_commission_action: refundAction,
    });
    setIsSavingSettings(false);
    setActionNotice('Platform ödeme ayarları başarıyla güncellendi.');
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleOpenResolutionModal = (d: PaymentDispute) => {
    setSelectedDispute(d);
    const tx = transactions.find((t) => t.id === d.payment_id);
    if (tx) {
      setBuyerRefundAmount(Math.round((tx.amount_cents / 2) / 100));
      setCompanyTransferAmount(Math.round((tx.amount_cents / 2) / 100));
    }
    setAdminNotes('');
    setTwoFactorChecked(false);
    setResolutionModalOpen(true);
  };

  const handleSubmitResolution = async () => {
    if (!selectedDispute) return;
    if (!adminNotes || adminNotes.trim().length < 5) {
      alert('Zorunlu Gerekçe: Karar için en az 5 karakterlik açıklama girmelisiniz.');
      return;
    }
    if (!twoFactorChecked) {
      alert('Güvenlik Kuralı: Hakem müdahalesi için 2FA onay kutusunu işaretlemelisiniz.');
      return;
    }

    setIsSubmittingResolution(true);
    const res = await adminResolveDispute({
      paymentId: selectedDispute.payment_id,
      adminId: 'admin-super-001',
      resolutionType,
      adminNotes,
      is2FAVerified: true,
      buyerRefundCents: resolutionType === 'split' ? buyerRefundAmount * 100 : 0,
      companyTransferCents: resolutionType === 'split' ? companyTransferAmount * 100 : 0,
    });

    if (res.success) {
      setResolutionModalOpen(false);
      setActionNotice('Uyuşmazlık karara bağlandı. Olay defterine ve denetim loglarına işlendi.');
      setTimeout(() => setActionNotice(''), 4000);
    } else {
      alert(res.error || 'İşlem başarısız oldu.');
    }
    setIsSubmittingResolution(false);
  };

  const handleExportCSV = () => {
    const headers = [
      'Islem ID',
      'Tarih',
      'Alici',
      'Satici Firma',
      'Firma VKN',
      'Odeme Modu',
      'Toplam Tutar (TL)',
      'Komisyon Orani (%)',
      'Komisyon Tutari (TL)',
      'Komisyon KDV (TL)',
      'Tavan Uygulandi mi',
      'Tavanla Kirpilan (TL)',
      'Net Satici Hakedis (TL)',
      'Durum',
      'iyzico Odeme No',
    ];

    const rows = transactions.map((t) => [
      t.id,
      new Date(t.created_at).toLocaleDateString('tr-TR'),
      t.buyer?.full_name || '',
      t.company?.name || '',
      t.company?.tax_number || '',
      t.payment_mode || 'platform',
      (t.amount_cents / 100).toFixed(2),
      t.commission_rate_percent,
      (t.commission_amount_cents / 100).toFixed(2),
      (t.vat_amount_cents / 100).toFixed(2),
      t.is_commission_capped ? 'Evet' : 'Hayir',
      ((t.capped_commission_savings_cents || 0) / 100).toFixed(2),
      (t.net_company_amount_cents / 100).toFixed(2),
      t.status,
      t.provider_payment_id || '',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `santiye_go_odeme_ve_kdv_raporu_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filtered = transactions.filter((t) => {
    const matchesStatus = selectedStatus === 'all' || t.status === selectedStatus;
    const matchesSearch =
      t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.buyer?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.company?.name?.toLowerCase().includes(searchQuery.toLowerCase());
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
            Ödeme Hareketleri, Emanet Havuz & Uyuşmazlıklar
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pazaryeri emanet havuzundaki bakiyeler, itiraz kuyruğu ve günlük banka mutabakatı.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-md flex items-center gap-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            CSV DIŞA AKTAR (FATURA & KDV)
          </button>
        </div>
      </div>

      {actionNotice && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
            activeTab === 'payments' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          Ödemeler ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
            activeTab === 'disputes' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
          İtiraz Kuyruğu ({disputes.length})
        </button>

        <button
          onClick={() => setActiveTab('reconciliation')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
            activeTab === 'reconciliation' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          Günlük Mutabakat Raporu
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
            activeTab === 'settings' ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Ödeme Modu & İtiraz Ayarları
        </button>
      </div>

      {/* TAB 1: PAYMENTS */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
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
              {['all', 'paid_escrow', 'transferred', 'disputed', 'refunded'].map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedStatus === st
                      ? 'bg-navy-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {st === 'all' && `Tümü (${transactions.length})`}
                  {st === 'paid_escrow' && 'Havuzda Bloke'}
                  {st === 'transferred' && 'Firmaya Aktarıldı'}
                  {st === 'disputed' && 'İtirazda'}
                  {st === 'refunded' && 'İade Edildi'}
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
                    <th className="py-3 px-4">Tavan</th>
                    <th className="py-3 px-4">Net Firma Tutarı</th>
                    <th className="py-3 px-4">Durum</th>
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
                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                            Tavan Var (-{formatCents(t.capped_commission_savings_cents || 0)})
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[10px]">Normal Oran</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {formatCents(t.net_company_amount_cents)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            t.status === 'transferred'
                              ? 'bg-emerald-100 text-emerald-800'
                              : t.status === 'disputed'
                              ? 'bg-red-100 text-red-800'
                              : t.status === 'refunded'
                              ? 'bg-slate-100 text-slate-600'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DISPUTES QUEUE */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <h2 className="text-base font-black text-navy-900">Uyuşmazlık Hakem Kuyruğu</h2>
            <p className="text-xs text-slate-500">
              Alıcıların itiraz açarak dondurduğu ödemeler burada listelenir. Hakem kararı ile tutar firmaya aktarılabilir, tam iade edilebilir veya kısmi paylaşılabilir.
            </p>

            {disputes.length === 0 ? (
              <div className="p-12 text-center text-slate-400 font-bold text-xs">
                Şu anda bekleyen herhangi bir itiraz dosyası bulunmuyor.
              </div>
            ) : (
              <div className="space-y-3">
                {disputes.map((d) => (
                  <div
                    key={d.id}
                    className="p-5 rounded-2xl border border-slate-200 hover:border-slate-300 bg-slate-50/50 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded bg-red-100 text-red-800 text-[10px] font-black uppercase">
                          {d.status}
                        </span>
                        <span className="font-mono text-xs text-slate-400">#{d.id}</span>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {new Date(d.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="text-xs font-black text-navy-900">İtiraz Nedeni: {d.reason}</div>
                      {d.buyer_notes && (
                        <div className="text-xs text-slate-600 bg-white p-3 rounded-xl border border-slate-200">
                          <strong>Alıcı Açıklaması:</strong> {d.buyer_notes}
                        </div>
                      )}
                      {d.company_notes && (
                        <div className="text-xs text-blue-900 bg-blue-50 p-3 rounded-xl border border-blue-200">
                          <strong>Firma Savunması:</strong> {d.company_notes}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t">
                      <button
                        onClick={() => handleOpenResolutionModal(d)}
                        className="px-4 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-sm transition flex items-center gap-1.5"
                      >
                        <Key className="w-3.5 h-3.5" />
                        Hakem Kararı Ver (2FA Zorunlu)
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-navy-900">Günlük Sağlayıcı Mutabakat Raporu</h2>
                <p className="text-xs text-slate-500">
                  Şantiye GO veritabanındaki hakediş kayıtları ile iyzico sağlayıcı gün sonu kayıtlarının otomatik karşılaştırması.
                </p>
              </div>
              <input
                type="date"
                value={reconcileDate}
                onChange={(e) => setReconcileDate(e.target.value)}
                className="text-xs font-bold border border-slate-300 rounded-xl p-2 bg-slate-50"
              />
            </div>

            {reconReport && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Platform İç Kayıt Toplamı</span>
                    <div className="text-xl font-black text-navy-900 mt-1">
                      {formatCents(reconReport.internalTotalCents)}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">iyzico Sağlayıcı Toplamı</span>
                    <div className="text-xl font-black text-blue-900 mt-1">
                      {formatCents(reconReport.providerTotalCents)}
                    </div>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <span className="text-slate-400 font-bold uppercase text-[10px]">Tespit Edilen Uyumsuzluk</span>
                    <div className={`text-xl font-black mt-1 ${reconReport.discrepanciesCount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                      {reconReport.discrepanciesCount} Adet
                    </div>
                  </div>
                </div>

                {reconReport.discrepanciesCount === 0 ? (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Mükemmel Mutabakat: Kendi veritabanımız ile ödeme sağlayıcısı arasında hiçbir tutar veya durum farkı bulunmamaktadır.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-xs font-black text-red-600 block">Uyumsuzluk Ayrıntıları:</span>
                    {reconReport.discrepancies.map((disc: any, i: number) => (
                      <div key={i} className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 space-y-1">
                        <div className="font-bold">{disc.issue} - İşlem No: {disc.paymentId}</div>
                        <div className="text-[11px] text-red-700">
                          Platform: {formatCents(disc.internalAmountCents)} | Sağlayıcı: {formatCents(disc.providerAmountCents)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: SETTINGS */}
      {activeTab === 'settings' && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5 shadow-sm max-w-2xl">
            <h2 className="text-base font-black text-navy-900">Platform Ödeme Güvencesi Ayarları</h2>

            {/* Payment Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-navy-900 block">Genel Platform Ödeme Modu</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-slate-50"
              >
                <option value="external">external (Varsayılan - Doğrudan El/Havale Mutabakatı)</option>
                <option value="platform">platform (Platform Ödeme Güvencesi - iyzico Escrow Havuz Bloke)</option>
              </select>
              <span className="text-[10px] text-slate-500 block">
                Platform modunda ödemeler korumalı havuzda bloke edilir. Alt üye işyeri kaydı tamamlanmayan firmalar için platform modu açılmaz.
              </span>
            </div>

            {/* Dispute Window Days */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-navy-900 block">İtiraz Penceresi Süresi (Gün)</label>
              <input
                type="number"
                min={1}
                max={30}
                value={disputeDays}
                onChange={(e) => setDisputeDays(Number(e.target.value))}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5"
              />
              <span className="text-[10px] text-slate-500 block">
                İş teslim edildikten sonra alıcının itiraz açabileceği azami gün sayısı. İtiraz yoksa süre bitiminde hakediş otomatik serbest bırakılır.
              </span>
            </div>

            {/* Refund Commission Policy */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-navy-900 block">İptal/İade Komisyon Politikası</label>
              <select
                value={refundAction}
                onChange={(e) => setRefundAction(e.target.value as any)}
                className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-slate-50"
              >
                <option value="refund_full">refund_full (Ödeme iptalinde platform komisyonu da sıfırlanıp alıcıya tam iade yapılır)</option>
                <option value="retain_fee">retain_fee (Platform hizmet komisyonunu keser, kalan tutar iade edilir)</option>
              </select>
            </div>

            <div className="pt-3 border-t">
              <button
                type="button"
                onClick={handleSaveSettings}
                disabled={isSavingSettings}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs shadow-md transition disabled:opacity-50"
              >
                {isSavingSettings ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hakem Çözüm Modalı (2FA Zorunlu) */}
      {resolutionModalOpen && selectedDispute && (
        <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
            <div className="flex items-center justify-between border-b pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-600" />
                <h3 className="text-base font-black text-navy-900">Hakem Kararı & 2FA Onayı</h3>
              </div>
              <button
                onClick={() => setResolutionModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <strong>Zorunlu Güvenlik Kuralı:</strong> Hakem kararı doğrudan para transferini veya iadesini icra eder. Her karar gerekçeli olmak ve yönetici denetim loglarına 2FA imzasıyla kaydedilmek zorundadır.
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Karar Türü</label>
                <select
                  value={resolutionType}
                  onChange={(e) => setResolutionType(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-xl p-2.5 bg-slate-50 font-bold"
                >
                  <option value="transfer_to_company">1. Firmaya Aktar (Alıcı haksız bulundu / Hizmet ifa edildi)</option>
                  <option value="full_refund_to_buyer">2. Alıcıya Tam İade (%100 İade - Firma kusurlu)</option>
                  <option value="split">3. Kısmi Paylaşım (Kusur oranında paylaştır)</option>
                </select>
              </div>

              {resolutionType === 'split' && (
                <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Alıcıya İade (TL)</label>
                    <input
                      type="number"
                      value={buyerRefundAmount}
                      onChange={(e) => setBuyerRefundAmount(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-xl p-2"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Firmaya Aktarım (TL)</label>
                    <input
                      type="number"
                      value={companyTransferAmount}
                      onChange={(e) => setCompanyTransferAmount(Number(e.target.value))}
                      className="w-full border border-slate-300 rounded-xl p-2"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Zorunlu Hakem Gerekçesi (En az 5 karakter)
                </label>
                <textarea
                  rows={3}
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Sevk irsaliyesi ve tutanak incelemelerine istinaden..."
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div className="p-3 bg-slate-100 rounded-xl flex items-center gap-2">
                <input
                  type="checkbox"
                  id="twoFactor"
                  checked={twoFactorChecked}
                  onChange={(e) => setTwoFactorChecked(e.target.checked)}
                  className="rounded text-orange-600 focus:ring-orange-500 w-4 h-4"
                />
                <label htmlFor="twoFactor" className="text-[11px] font-bold text-navy-900 cursor-pointer">
                  2FA İki Adımlı Doğrulama ve Yönetici Yetki İmzasını Onaylıyorum
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => setResolutionModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={handleSubmitResolution}
                disabled={isSubmittingResolution}
                className="px-4 py-2 rounded-xl text-xs font-black bg-navy-900 hover:bg-navy-800 text-white transition disabled:opacity-50"
              >
                {isSubmittingResolution ? 'İşleniyor...' : 'Hakem Kararını Uygula'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
