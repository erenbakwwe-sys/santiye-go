'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  TrendingUp,
  Receipt,
  FileQuestion,
  Bell,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  CreditPackage,
  CompanyCreditLedger,
  QuoteDispute,
  QuoteCreditConfig,
} from '@/types/database';
import {
  getCreditPackages,
  getCompanyCreditBalance,
  getCompanyCreditLedger,
  purchaseCredits,
  getCreditConfig,
  getQuoteDisputes,
} from '@/lib/services/credit-service';

export default function CompanyCreditsPage() {
  const [balance, setBalance] = useState<number>(0);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [ledgers, setLedgers] = useState<CompanyCreditLedger[]>([]);
  const [disputes, setDisputes] = useState<QuoteDispute[]>([]);
  const [config, setConfig] = useState<QuoteCreditConfig | null>(null);
  const [loading, setLoading] = useState(true);

  // Purchase Modal State
  const [selectedPkg, setSelectedPkg] = useState<CreditPackage | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  const [purchaseError, setPurchaseError] = useState('');

  // Notification Preferences State
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [quietHours, setQuietHours] = useState(false);
  const [notifSaved, setNotifSaved] = useState(false);

  const DEMO_COMPANY_ID = 'f0000000-0000-0000-0000-000000000001';

  const loadData = async () => {
    setLoading(true);
    try {
      const [bal, pkgs, ledg, cfg, disp] = await Promise.all([
        getCompanyCreditBalance(DEMO_COMPANY_ID),
        getCreditPackages(true),
        getCompanyCreditLedger(DEMO_COMPANY_ID),
        getCreditConfig(),
        getQuoteDisputes(),
      ]);

      setBalance(bal);
      setPackages(pkgs);
      setLedgers(ledg);
      setConfig(cfg);
      setDisputes(disp.filter((d) => d.company_id === DEMO_COMPANY_ID));
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleBuyPackage = async () => {
    if (!selectedPkg) return;
    setPurchasing(true);
    setPurchaseError('');

    const res = await purchaseCredits(DEMO_COMPANY_ID, selectedPkg.id);
    setPurchasing(false);

    if (res.success) {
      setPurchaseSuccess(true);
      if (typeof res.newBalance === 'number') {
        setBalance(res.newBalance);
      }
      setTimeout(() => {
        setPurchaseSuccess(false);
        setSelectedPkg(null);
        loadData();
      }, 1600);
    } else {
      setPurchaseError(res.error || 'Ödeme tamamlanamadı.');
    }
  };

  const handleSaveNotifs = (e: React.FormEvent) => {
    e.preventDefault();
    setNotifSaved(true);
    setTimeout(() => setNotifSaved(false), 3000);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        {/* Header Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-black uppercase">
                Firma Paneli
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">Cüzdan & Krediler</span>
            </div>
            <h1 className="text-2xl font-black text-navy-900 mt-1 flex items-center gap-2">
              <Coins className="w-6 h-6 text-orange-500" />
              Teklif Verme Kredisi & Cüzdan
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              İş makineleri taleplerine teklif vermek ve müşteri iletişim bilgilerini açmak için kullanılan kredi bakiyeniz.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/firma-paneli/talepler"
              className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-orange-500/20"
            >
              <Zap className="w-4 h-4" />
              Açık Talepleri Gör
            </Link>
            <Link
              href="/firma-paneli"
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition"
            >
              Panoya Dön
            </Link>
          </div>
        </div>

        {/* System Mode Notice */}
        {config && (
          <div
            className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs ${
              config.mode === 'ACTIVE'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : config.mode === 'SHADOW'
                ? 'bg-amber-50 border-amber-200 text-amber-900'
                : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 shrink-0 text-orange-500" />
              <div>
                <span className="font-extrabold uppercase tracking-wide">
                  Sistem Modu: {config.mode === 'ACTIVE' ? 'CANLI (AKTİF)' : config.mode === 'SHADOW' ? 'GÖLGE MOD (TEST/ÖLÇÜM)' : 'KAPALI'}
                </span>
                <p className="text-[11px] opacity-80 mt-0.5">
                  {config.mode === 'SHADOW'
                    ? 'Sistem şu anda deneme modundadır. Taleplere teklif verirken bakiyenizden kredi DÜŞMEZ; sistem teklif hacmini simüle eder.'
                    : config.mode === 'ACTIVE'
                    ? 'Her çoklu talebe teklif verdiğinizde 1 kredi düşer ve alıcının iletişim bilgileri güvenli kartta açılır.'
                    : 'Kredi sistemi kapalıdır, tüm teklifler ücretsizdir.'}
                </p>
              </div>
            </div>

            <div className="px-3 py-1 bg-white/75 rounded-lg border font-bold text-[11px] shrink-0">
              Talep Başına: {config.default_credit_cost} Kredi
            </div>
          </div>
        )}

        {/* Balance Card & Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-gradient-to-br from-navy-900 via-navy-800 to-navy-950 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between">
            <div className="absolute right-[-15px] top-[-15px] w-32 h-32 bg-orange-500/10 rounded-full blur-2xl" />
            <div>
              <span className="text-xs font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-4 h-4" />
                Mevcut Kredi Bakiyesi
              </span>
              <div className="text-4xl font-black mt-2 tracking-tight">
                {loading ? '...' : balance} <span className="text-lg font-bold text-orange-300">Kredi</span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-4 leading-relaxed">
              Bu bakiye ile yaklaşık <strong className="text-white">{balance} adet</strong> bölgesel talebe teklif verebilir ve alıcıyla doğrudan görüşebilirsiniz.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                Toplam Kullanılan Teklif Kredisi
              </span>
              <div className="text-3xl font-black text-navy-900 mt-2">
                {ledgers.filter((l) => ['spend', 'shadow_spend'].includes(l.transaction_type)).length} Adet
              </div>
            </div>
            <div className="text-xs text-slate-500 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span>Talep Başına Kontenjan:</span>
              <span className="font-black text-navy-900">4 Firma (Slot)</span>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col justify-between">
            <div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Kredi İade Güvencesi
              </span>
              <div className="text-base font-bold text-navy-900 mt-2 leading-snug">
                %100 Yanıtsız Numara & Sahte Talep İadesi
              </div>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              Ulaşılamayan veya sahte taleplerde 48 saat içinde itiraz edebilir, kredinizi geri alabilirsiniz.
            </p>
          </div>
        </div>

        {/* Credit Packages Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-navy-900 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-500" />
                Teklif Kredisi Paketleri
              </h2>
              <p className="text-xs text-slate-500">
                İhtiyacınıza uygun paketi seçin, sandbox test ödemesi ile bakiyenizi anında yükseltin.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {packages.map((pkg) => {
              const perCredit = Math.round(pkg.price / pkg.credits);
              return (
                <div
                  key={pkg.id}
                  className={`bg-white rounded-2xl border p-5 shadow-sm transition hover:shadow-md flex flex-col justify-between relative ${
                    pkg.discount_percentage && pkg.discount_percentage > 20
                      ? 'border-orange-400 ring-2 ring-orange-500/10'
                      : 'border-slate-200'
                  }`}
                >
                  {pkg.discount_percentage ? (
                    <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-orange-600 text-white text-[10px] font-black tracking-wide shadow-sm">
                      %{pkg.discount_percentage} İNDİRİM
                    </div>
                  ) : null}

                  <div>
                    <h3 className="font-black text-navy-900 text-sm">{pkg.name}</h3>
                    <div className="mt-3 flex items-baseline gap-1">
                      <span className="text-3xl font-black text-navy-900">{pkg.credits}</span>
                      <span className="text-xs font-bold text-slate-500">Kredi</span>
                    </div>

                    <div className="mt-2 text-xs text-slate-600">
                      Birim Maliyet: <strong className="text-navy-900">~{perCredit} ₺</strong> / teklif
                    </div>
                  </div>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-400 block text-[10px]">Toplam Fiyat</span>
                      <span className="text-lg font-black text-navy-900">{pkg.price.toLocaleString('tr-TR')} ₺</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedPkg(pkg);
                        setPurchaseError('');
                      }}
                      className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-black shadow-sm transition"
                    >
                      Satın Al
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Immutable Ledger Table (Değiştirilemez Defter) */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-navy-700" />
                Değiştirilemez Kredi Defteri (Hesap Ekstresi)
              </h2>
              <p className="text-xs text-slate-500">
                Tüm kredi yüklemeleri, teklif harcamaları ve iadelerin denetlenebilir dökümü.
              </p>
            </div>

            <button
              onClick={loadData}
              className="text-xs font-bold text-slate-600 hover:text-navy-900 flex items-center gap-1 self-start sm:self-auto"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Yenile
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Tarih</th>
                  <th className="py-2.5 px-3">İşlem Türü</th>
                  <th className="py-2.5 px-3">Açıklama / Referans</th>
                  <th className="py-2.5 px-3 text-right">Miktar</th>
                  <th className="py-2.5 px-3 text-right">Kalan Bakiye</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {ledgers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      Henüz defter hareketi bulunmamaktadır.
                    </td>
                  </tr>
                ) : (
                  ledgers.map((l) => {
                    const isPositive = l.amount > 0;
                    const isZero = l.amount === 0;

                    return (
                      <tr key={l.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-500">
                          {new Date(l.created_at).toLocaleString('tr-TR', {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                              l.transaction_type === 'purchase'
                                ? 'bg-emerald-100 text-emerald-800'
                                : l.transaction_type === 'spend'
                                ? 'bg-orange-100 text-orange-800'
                                : l.transaction_type === 'refund'
                                ? 'bg-blue-100 text-blue-800'
                                : l.transaction_type === 'welcome_bonus'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {l.transaction_type === 'purchase'
                              ? 'Paket Satın Alımı'
                              : l.transaction_type === 'spend'
                              ? 'Teklif Harcaması'
                              : l.transaction_type === 'refund'
                              ? 'Kredi İadesi'
                              : l.transaction_type === 'welcome_bonus'
                              ? 'Hoş Geldin Hediyesi'
                              : 'Gölge Harcama'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {l.notes || l.reference_id || 'İşlem kaydı'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black">
                          <span
                            className={
                              isPositive
                                ? 'text-emerald-600'
                                : isZero
                                ? 'text-slate-400'
                                : 'text-orange-600'
                            }
                          >
                            {isPositive ? `+${l.amount}` : l.amount} Kredi
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-extrabold text-navy-900">
                          {l.balance_after}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Dispute & Problematic Requests History */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
              <FileQuestion className="w-4 h-4 text-orange-500" />
              Sorunlu Talep & İade İtirazlarım
            </h2>
            <p className="text-xs text-slate-500">
              Telefonuna ulaşılamayan veya sahte çıkan talepler için oluşturduğunuz iade talepleri.
            </p>
          </div>

          {disputes.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              Kayıtlı herhangi bir iade itirazınız bulunmamaktadır.
            </div>
          ) : (
            <div className="space-y-3">
              {disputes.map((d) => (
                <div
                  key={d.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-navy-900">Talep Ref: {d.request_id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          d.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.status === 'approved'
                          ? 'İADE EDİLDİ (+1 Kredi)'
                          : d.status === 'rejected'
                          ? 'REDDEDİLDİ'
                          : 'İNCELENİYOR'}
                      </span>
                    </div>
                    <p className="text-slate-600">
                      <strong>Neden:</strong> {d.reason} — {d.description}
                    </p>
                    {d.admin_notes && (
                      <p className="text-slate-500 text-[11px] italic">
                        <strong>Moderatör Notu:</strong> {d.admin_notes}
                      </p>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 shrink-0">
                    {new Date(d.created_at).toLocaleDateString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Preferences */}
        <form
          onSubmit={handleSaveNotifs}
          className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4"
        >
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
                <Bell className="w-4 h-4 text-orange-500" />
                Yeni Talep Bildirim Tercihleri
              </h2>
              <p className="text-xs text-slate-500">
                Bölgenizde yeni bir iş makinesi talebi açıldığında anında haberdar olun (hızlı teklif verip slot kapın).
              </p>
            </div>
            {notifSaved && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Tercihler Kaydedildi
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={notifEmail}
                onChange={(e) => setNotifEmail(e.target.checked)}
                className="rounded text-orange-600 w-4 h-4"
              />
              <span className="font-bold text-slate-800">E-Posta Bildirimi</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={notifPush}
                onChange={(e) => setNotifPush(e.target.checked)}
                className="rounded text-orange-600 w-4 h-4"
              />
              <span className="font-bold text-slate-800">Uygulama / Tarayıcı Bildirimi</span>
            </label>

            <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
              <input
                type="checkbox"
                checked={quietHours}
                onChange={(e) => setQuietHours(e.target.checked)}
                className="rounded text-orange-600 w-4 h-4"
              />
              <span className="font-bold text-slate-800">Gece Sessiz Saatler (22:00 - 08:00)</span>
            </label>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition"
            >
              Tercihleri Kaydet
            </button>
          </div>
        </form>

        {/* Purchase Confirmation Modal (Test / Sandbox iyzico) */}
        {selectedPkg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  Kredi Paketi Satın Alımı
                </h3>
                <button
                  onClick={() => setSelectedPkg(null)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {purchaseSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-xs font-bold">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>Ödeme başarılı! {selectedPkg.credits} kredi cüzdanınıza eklendi.</span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Seçilen Paket:</span>
                      <strong className="text-navy-900">{selectedPkg.name}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Eklenecek Kredi:</span>
                      <strong className="text-orange-600 text-sm">+{selectedPkg.credits} Kredi</strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold">
                      <span className="text-slate-700">Ödenecek Tutar (KDV Dahil):</span>
                      <span className="text-base text-navy-900 font-black">
                        {selectedPkg.price.toLocaleString('tr-TR')} ₺
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                    <strong>Test / Sandbox Modu:</strong> Gerçek kredi kartınızdan çekim yapılmaz. Test ödeme altyapısı üzerinden anında cüzdanınıza bakiye tanımlanır.
                  </div>

                  {purchaseError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{purchaseError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setSelectedPkg(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold hover:bg-slate-100"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="button"
                      disabled={purchasing}
                      onClick={handleBuyPackage}
                      className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition disabled:opacity-50"
                    >
                      {purchasing ? 'İşleniyor...' : 'Test Ödemesini Onayla'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
