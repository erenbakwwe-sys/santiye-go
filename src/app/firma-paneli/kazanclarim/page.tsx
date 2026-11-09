'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Clock,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Send,
  AlertTriangle,
  RotateCcw,
  Building,
  PlusCircle,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCentsToTRY } from '@/lib/services/commission-service';
import {
  sellerMarkDelivered,
  getCompanySubMerchant,
  registerCompanySubMerchant,
} from '@/lib/services/escrow-service';

export default function CompanyEarningsPage() {
  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any>(null);
  const [subMerchant, setSubMerchant] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [actionNotice, setActionNotice] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Sub-merchant Onboarding Modal State
  const [showSubMerchantModal, setShowSubMerchantModal] = useState(false);
  const [subMerchantType, setSubMerchantType] = useState<
    'LIMITED_OR_JOINT_STOCK_COMPANY' | 'PRIVATE_COMPANY' | 'PERSONAL'
  >('LIMITED_OR_JOINT_STOCK_COMPANY');
  const [ibanInput, setIbanInput] = useState('');
  const [taxOfficeInput, setTaxOfficeInput] = useState('');
  const [taxNumberInput, setTaxNumberInput] = useState('');
  const [isSubmittingSubMerchant, setIsSubmittingSubMerchant] = useState(false);

  async function loadCompanyFinances() {
    try {
      setLoading(true);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: comp } = await supabase
          .from('companies')
          .select('id, name, phone, address, iban, tax_number, tax_office, sub_merchant_key')
          .eq('user_id', user.id)
          .maybeSingle();

        if (comp) {
          setCompany(comp);
          setIbanInput(comp.iban || '');
          setTaxOfficeInput(comp.tax_office || '');
          setTaxNumberInput(comp.tax_number || '');

          // 1. Fetch sub-merchant profile
          const subm = await getCompanySubMerchant(comp.id);
          setSubMerchant(subm);

          // 2. Fetch real transactions from payment_transactions table
          let { data: txData, error } = await supabase
            .from('payment_transactions')
            .select(`
              *,
              buyer:profiles(full_name, phone)
            `)
            .eq('company_id', comp.id)
            .order('created_at', { ascending: false });

          if (error || !txData) {
            const { data: fallbackData } = await supabase
              .from('payments')
              .select('*')
              .eq('company_id', comp.id)
              .order('created_at', { ascending: false });
            txData = fallbackData || [];
          }

          setTransactions(txData || []);
        }
      }
    } catch (err: any) {
      console.warn('loadCompanyFinances warning:', err.message);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCompanyFinances();
  }, []);

  const handleMarkDelivered = async (txId: string) => {
    if (
      confirm(
        'İşi/makineyi şantiyeye teslim ettiğinizi bildirmek istiyor musunuz? Alıcıya bildirim gidecek ve 72 saatlik kontrol süresi başlayacaktır.'
      )
    ) {
      setProcessingId(txId);
      try {
        const res = await sellerMarkDelivered(txId);
        if (res.success) {
          setActionNotice(
            '✅ Teslimat bildirildi! 72 saatlik kontrol süresi başladı. Alıcı onayladığında veya süre dolduğunda tutar IBAN hesabınıza aktarılacaktır.'
          );
          loadCompanyFinances();
        } else {
          setActionNotice(`⚠️ ${res.error || 'İşlem gerçekleştirilemedi.'}`);
        }
      } catch (err: any) {
        setActionNotice(`Hata: ${err.message}`);
      } finally {
        setProcessingId(null);
        setTimeout(() => setActionNotice(''), 5000);
      }
    }
  };

  const handleRegisterSubMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    const cleanIban = ibanInput.replace(/\s+/g, '').toUpperCase();
    if (!cleanIban.startsWith('TR') || cleanIban.length !== 26) {
      alert('Lütfen geçerli bir TR ile başlayan 26 haneli IBAN numarası giriniz.');
      return;
    }

    setIsSubmittingSubMerchant(true);
    try {
      const res = await registerCompanySubMerchant({
        companyId: company.id,
        subMerchantType,
        name: company.name || 'Firma Yetkilisi',
        email: 'firma@santiye-go.com',
        phone: company.phone || '+905321112233',
        iban: cleanIban,
        taxOffice: taxOfficeInput,
        taxNumber: taxNumberInput,
        address: company.address || 'Türkiye',
      });

      if (res.success) {
        setActionNotice('✅ iyzico Alt Üye İşyeri kaydı başarıyla oluşturuldu!');
        setShowSubMerchantModal(false);
        loadCompanyFinances();
      } else {
        alert(`Kayıt hatası: ${res.error || 'Bilinmeyen hata'}`);
      }
    } catch (err: any) {
      alert(`Hata: ${err.message}`);
    } finally {
      setIsSubmittingSubMerchant(false);
    }
  };

  // Financial Metrics Calculation across 5 Escrow Buckets
  const heldTx = transactions.filter(
    (t) => t.escrow_status === 'paid_held' || (t.status === 'paid' && !t.escrow_status)
  );
  const releasableTx = transactions.filter((t) => t.escrow_status === 'releasable');
  const transferredTx = transactions.filter(
    (t) => t.escrow_status === 'transferred' || t.status === 'transferred'
  );
  const disputedTx = transactions.filter((t) => t.escrow_status === 'disputed');
  const refundedTx = transactions.filter((t) => t.escrow_status === 'refunded' || t.status === 'refunded');

  const heldVolume = heldTx.reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);
  const releasableVolume = releasableTx.reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);
  const transferredVolume = transferredTx.reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);
  const disputedVolume = disputedTx.reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);
  const refundedVolume = refundedTx.reduce((acc, t) => acc + (t.amount_cents || 0), 0);

  // Filtered Table Records
  const filtered = transactions.filter((t) => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'held') return t.escrow_status === 'paid_held' || t.status === 'paid';
    if (selectedFilter === 'releasable') return t.escrow_status === 'releasable';
    if (selectedFilter === 'transferred') return t.escrow_status === 'transferred' || t.status === 'transferred';
    if (selectedFilter === 'disputed') return t.escrow_status === 'disputed';
    if (selectedFilter === 'refunded') return t.escrow_status === 'refunded' || t.status === 'refunded';
    return true;
  });

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/firma-paneli"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Firma Paneline Dön
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/odeme-guvencesi-ve-itiraz-kosullari"
              className="text-xs font-bold text-slate-500 hover:text-navy-900 underline"
            >
              Ödeme Güvencesi Şartları
            </Link>
          </div>
        </div>

        {/* Top Header & Sub-merchant Profile */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-black uppercase">
              Firma Finans & Escrow
            </span>
            <h1 className="text-2xl font-black text-navy-900 mt-1">
              Kazançlarım & Hakediş Defteri
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              iyzico lisanslı havuzundaki bakiyeler, teslimat onayları ve IBAN transfer durumları.
            </p>
          </div>

          {/* Sub-merchant Status Card */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1.5 shrink-0 max-w-sm w-full md:w-auto">
            <div className="flex items-center justify-between gap-2">
              <span className="text-slate-400 font-bold uppercase text-[10px]">
                iyzico Alt Üye İşyeri:
              </span>
              {subMerchant?.sub_merchant_key || company?.sub_merchant_key ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[10px] flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Onaylı
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSubMerchantModal(true)}
                  className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-800 hover:bg-orange-200 font-bold text-[10px] flex items-center gap-1"
                >
                  <PlusCircle className="w-3 h-3" /> Tanımla
                </button>
              )}
            </div>

            <div className="font-mono font-bold text-navy-900 text-xs truncate">
              {subMerchant?.iban || company?.iban || 'IBAN Tanımlanmamış'}
            </div>
            <div className="text-[10px] text-slate-500">
              VKN/TCKN: {subMerchant?.tax_number || company?.tax_number || 'Belirtilmedi'} •{' '}
              {subMerchant?.tax_office || company?.tax_office || ''}
            </div>
          </div>
        </div>

        {actionNotice && (
          <div className="p-3.5 bg-blue-50 border border-blue-300 text-blue-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Financial KPI Cards - 5 Escrow Buckets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Havuzda Bekleyen</div>
            <div className="text-xl font-black text-blue-600">{formatCentsToTRY(heldVolume)}</div>
            <div className="text-[10px] text-slate-400">{heldTx.length} İşlem (Teslim/Onay)</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">Serbest Bırakılabilir</div>
            <div className="text-xl font-black text-amber-600">{formatCentsToTRY(releasableVolume)}</div>
            <div className="text-[10px] text-slate-400">{releasableTx.length} Onaylı (Aktarımda)</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">IBAN&apos;a Aktarılan</div>
            <div className="text-xl font-black text-emerald-600">{formatCentsToTRY(transferredVolume)}</div>
            <div className="text-[10px] text-emerald-700 font-bold">{transferredTx.length} Hesapta</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">İtirazda / Askıda</div>
            <div className="text-xl font-black text-red-600">{formatCentsToTRY(disputedVolume)}</div>
            <div className="text-[10px] text-red-600 font-bold">{disputedTx.length} İtiraz Masasında</div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase">İade Edilen</div>
            <div className="text-xl font-black text-slate-600">{formatCentsToTRY(refundedVolume)}</div>
            <div className="text-[10px] text-slate-400">{refundedTx.length} İptal/İade</div>
          </div>
        </div>

        {/* Explanation Alert */}
        <div className="p-4 bg-orange-50/70 border border-orange-200 rounded-2xl text-xs text-orange-950 flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold">Ödeme Güvencesi Hakediş Süreci:</div>
            <p className="text-slate-600 leading-relaxed">
              İşi teslim ettiğinizde listeden <strong>&quot;İşi Teslim Ettim&quot;</strong> butonuna basınız. Alıcı doğrudan onaylayabilir veya 72 saatlik kontrol süresi dolduğunda platform komisyonu kesilerek kalan net hak edişiniz otomatik olarak iyzico tarafından kayıtlı IBAN hesabınıza aktarılır.
            </p>
          </div>
        </div>

        {/* Transactions Table & Filters */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <h2 className="text-base font-extrabold text-navy-900">
              Hakediş Hareketleri ({filtered.length})
            </h2>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto">
              {[
                { id: 'all', label: 'Tümü' },
                { id: 'held', label: 'Havuzda' },
                { id: 'releasable', label: 'Serbest' },
                { id: 'transferred', label: 'Aktarılan' },
                { id: 'disputed', label: 'İtirazda' },
                { id: 'refunded', label: 'İade' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedFilter(tab.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition shrink-0 ${
                    selectedFilter === tab.id
                      ? 'bg-navy-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs font-bold">Yükleniyor...</div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-navy-900">
                Bu Filtrede Bir Finansal Hareket Bulunamadı
              </p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Kiralama rezervasyonları tamamlandığında ve ödemeler gerçekleştiğinde hakediş dökümleriniz burada anlık olarak listelenecektir.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-3 px-4">İşlem & Tarih</th>
                    <th className="py-3 px-4">Alıcı</th>
                    <th className="py-3 px-4">Tahsil Edilen (Brüt)</th>
                    <th className="py-3 px-4">Komisyon (%)</th>
                    <th className="py-3 px-4">Net Hak Ediş</th>
                    <th className="py-3 px-4">Escrow Durumu</th>
                    <th className="py-3 px-4">Aksiyon</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.map((t) => {
                    const isTransferred =
                      t.escrow_status === 'transferred' || t.status === 'transferred';
                    const isDisputed = t.escrow_status === 'disputed';
                    const isReleasable = t.escrow_status === 'releasable';
                    const isRefunded =
                      t.escrow_status === 'refunded' || t.status === 'refunded';
                    const isDelivered = Boolean(t.delivered_at);

                    return (
                      <tr key={t.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4">
                          <div className="font-mono font-bold text-navy-900">{t.id}</div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(t.created_at).toLocaleDateString('tr-TR')}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-navy-900">
                            {t.buyer?.full_name || 'Alıcı'}
                          </div>
                          <div className="text-[10px] text-slate-400">{t.buyer?.phone || ''}</div>
                        </td>

                        <td className="py-3 px-4 font-black text-navy-900 text-sm">
                          {formatCentsToTRY(t.amount_cents)}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-bold text-orange-600">
                            -{formatCentsToTRY(t.commission_amount_cents)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            %{t.commission_rate_percent} (Dondurulmuş Oran)
                          </div>
                        </td>

                        <td className="py-3 px-4 font-black text-emerald-700 text-sm">
                          {formatCentsToTRY(t.net_company_amount_cents)}
                        </td>

                        <td className="py-3 px-4">
                          {isTransferred && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> IBAN&apos;a Aktarıldı
                            </span>
                          )}

                          {isDisputed && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 text-[11px] font-bold">
                              <AlertTriangle className="w-3.5 h-3.5" /> İtirazda / Askıda
                            </span>
                          )}

                          {isReleasable && !isTransferred && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Serbest Bırakılabilir
                            </span>
                          )}

                          {isRefunded && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-bold">
                              <RotateCcw className="w-3.5 h-3.5" /> Alıcıya İade Edildi
                            </span>
                          )}

                          {!isTransferred &&
                            !isDisputed &&
                            !isReleasable &&
                            !isRefunded &&
                            isDelivered && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold">
                                <Clock className="w-3.5 h-3.5" /> Teslim Edildi (Sayac Aktif)
                              </span>
                            )}

                          {!isTransferred &&
                            !isDisputed &&
                            !isReleasable &&
                            !isRefunded &&
                            !isDelivered && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                                <Clock className="w-3.5 h-3.5" /> Havuzda (Teslim Bekleniyor)
                              </span>
                            )}
                        </td>

                        <td className="py-3 px-4">
                          {!isTransferred && !isDelivered && !isDisputed && !isRefunded && (
                            <button
                              type="button"
                              disabled={processingId === t.id}
                              onClick={() => handleMarkDelivered(t.id)}
                              className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold text-xs shadow-sm transition flex items-center gap-1"
                            >
                              <Send className="w-3.5 h-3.5" />
                              {processingId === t.id ? 'İşleniyor...' : 'İşi Teslim Ettim'}
                            </button>
                          )}
                          {isDelivered && !isTransferred && !isRefunded && (
                            <span className="text-[11px] text-slate-500 font-semibold">
                              Teslim Bildirildi
                            </span>
                          )}
                          {isTransferred && (
                            <span className="text-[11px] text-emerald-600 font-bold">
                              Tamamlandı
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Sub-merchant Onboarding Modal */}
        {showSubMerchantModal && (
          <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-black text-navy-900 text-base">
                    iyzico Alt Üye İşyeri Tanımlama
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ödemelerin doğrudan banka hesabınıza aktarılması için resmi firma bilgilerinizi giriniz.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowSubMerchantModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRegisterSubMerchant} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-navy-900 mb-1">Şirket Türü *</label>
                  <select
                    value={subMerchantType}
                    onChange={(e: any) => setSubMerchantType(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-semibold focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="LIMITED_OR_JOINT_STOCK_COMPANY">
                      Limited veya Anonim Şirket (Ltd. / A.Ş.)
                    </option>
                    <option value="PRIVATE_COMPANY">Şahıs Şirketi</option>
                    <option value="PERSONAL">Bireysel / Vergi Mükellefi Olmayan</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-navy-900 mb-1">
                    Hak Ediş Aktarılacak IBAN (TR...) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={32}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    value={ibanInput}
                    onChange={(e) => setIbanInput(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 font-mono font-bold focus:ring-2 focus:ring-orange-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    IBAN sahibi şirket unvanı veya şirket yetkilisinin adına kayıtlı olmalıdır.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-navy-900 mb-1">Vergi Numarası / TCKN *</label>
                    <input
                      type="text"
                      required
                      placeholder="10 haneli VKN veya 11 haneli TCKN"
                      value={taxNumberInput}
                      onChange={(e) => setTaxNumberInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 font-mono focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-navy-900 mb-1">Vergi Dairesi</label>
                    <input
                      type="text"
                      placeholder="Örn: Tuzla VD"
                      value={taxOfficeInput}
                      onChange={(e) => setTaxOfficeInput(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                  Girdiğiniz IBAN ve VKN bilgileri iyzico Pazaryeri sistemine iletilecek ve her onaylanan hakedişte otomatik EFT bu hesaba yapılacaktır.
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSubMerchantModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingSubMerchant}
                    className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition"
                  >
                    {isSubmittingSubMerchant ? 'Kaydediliyor...' : 'Kaydet ve iyzico Onayına Gönder'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
