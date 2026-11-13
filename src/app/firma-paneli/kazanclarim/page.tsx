'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  TrendingUp,
  Clock,
  CheckCircle2,
  Building2,
  ArrowLeft,
  ShieldCheck,
  FileText,
  AlertCircle,
  HelpCircle,
  Lock,
  RotateCcw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatCentsToTRY } from '@/lib/services/commission-service';
import { DEMO_TRANSACTIONS } from '@/lib/services/payment-service';
import { registerCompanySubMerchant } from '@/lib/services/escrow-service';

export default function CompanyEarningsPage() {
  const [loading, setLoading] = useState(true);
  const [companyTransactions, setCompanyTransactions] = useState<any[]>([]);
  const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
  const [subMerchantStatus, setSubMerchantStatus] = useState<'approved' | 'pending' | 'unregistered'>('unregistered');
  const [ibanLast4, setIbanLast4] = useState<string>('');
  const [subMerchantKey, setSubMerchantKey] = useState<string>('');
  const [legalTitle, setLegalTitle] = useState('Firma Hesabı');
  const [taxOffice, setTaxOffice] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [ibanInput, setIbanInput] = useState('');
  const [addressInput, setAddressInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    async function loadFinances() {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          const { data: comp } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          if (comp) {
            setLegalTitle(comp.name || user.user_metadata?.company_name || 'Firma Hesabı');
            if (comp.sub_merchant_status) {
              setSubMerchantStatus(comp.sub_merchant_status as any);
            }
            if (comp.iban_last4) {
              setIbanLast4(comp.iban_last4);
            }
            if (comp.sub_merchant_key) {
              setSubMerchantKey(comp.sub_merchant_key);
            }
            if (comp.tax_office) setTaxOffice(comp.tax_office);
            if (comp.tax_number) setTaxNumber(comp.tax_number);

            const { data } = await supabase
              .from('payment_transactions')
              .select('*')
              .eq('company_id', comp.id)
              .order('created_at', { ascending: false });

            setCompanyTransactions(data || []);
          } else {
            setCompanyTransactions([]);
          }
        } else {
          setCompanyTransactions([]);
        }
      } catch {
        setCompanyTransactions([]);
      } finally {
        setLoading(false);
      }
    }

    loadFinances();
  }, []);

  const handleRegisterSubMerchant = async () => {
    setIsSubmitting(true);
    const res = await registerCompanySubMerchant('f0000000-0000-0000-0000-000000000001', {
      legalType: 'LIMITED_OR_JOINT_STOCK_COMPANY',
      legalCompanyTitle: legalTitle,
      taxOffice,
      taxNumber,
      email: 'muhasebe@anadolumakine.com',
      gsmNumber: '+905320000101',
      address: addressInput,
      iban: ibanInput,
    });

    if (res.success && res.subMerchantKey && res.ibanLast4) {
      setSubMerchantKey(res.subMerchantKey);
      setIbanLast4(res.ibanLast4);
      setSubMerchantStatus('approved');
      setOnboardingModalOpen(false);
      setActionSuccess('Alt üye işyeri kaydınız başarıyla tamamlandı ve iyzico tarafından onaylandı.');
      setTimeout(() => setActionSuccess(''), 4000);
    } else {
      alert(res.error || 'Kayıt sırasında hata oluştu.');
    }
    setIsSubmitting(false);
  };

  const poolCents = companyTransactions
    .filter((t) => t.status === 'paid' || t.status === 'paid_escrow')
    .reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);

  const releasableCents = companyTransactions
    .filter((t) => t.status === 'releasable')
    .reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);

  const transferredCents = companyTransactions
    .filter((t) => t.status === 'transferred')
    .reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);

  const refundedCents = companyTransactions
    .filter((t) => t.status === 'refunded')
    .reduce((acc, t) => acc + (t.refund_amount_cents || t.amount_cents || 0), 0);

  const disputedCents = companyTransactions
    .filter((t) => t.status === 'disputed')
    .reduce((acc, t) => acc + (t.net_company_amount_cents || 0), 0);

  const totalCappedSavingsCents = companyTransactions.reduce(
    (acc, t) => acc + (t.capped_commission_savings_cents || 0),
    0
  );

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
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              iyzico Pazaryeri Entegrasyonu {subMerchantStatus === 'approved' ? 'Aktif' : 'Onay Bekliyor'}
            </span>
          </div>
        </div>

        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
        )}

        {/* Top Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-black uppercase">
              Firma Finans
            </span>
            <h1 className="text-2xl font-black text-navy-900 mt-1">
              Kazançlarım & Hakediş Raporu
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Platform emanet havuzunda bekleyen, onaylanan ve banka hesabınıza aktarılan hakedişlerinizi takip edin.
            </p>
          </div>

          {/* Submerchant IBAN Card (SADECE SON 4 HANE GÖSTERİLİR) */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-1 shrink-0">
            <div className="flex items-center justify-between gap-3">
              <span className="text-slate-400 font-bold uppercase text-[10px]">
                Alt Üye İşyeri Hesabı
              </span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  subMerchantStatus === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {subMerchantStatus === 'approved' ? 'Doğrulandı' : 'Kayıtsız'}
              </span>
            </div>
            <div className="font-mono font-bold text-navy-900">
              {ibanLast4 ? `TR** **** **** **** **** **${ibanLast4}` : 'IBAN Tanımlanmadı'}
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-semibold">{legalTitle.slice(0, 24)}...</span>
              <button
                onClick={() => setOnboardingModalOpen(true)}
                className="text-orange-600 hover:underline font-bold text-[10px] ml-2"
              >
                Bilgileri Güncelle
              </button>
            </div>
          </div>
        </div>

        {/* 5 Balance Cards (Prompt 9E Şartı) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* 1. Havuzda Bekleyen */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-700">
              <Lock className="w-3.5 h-3.5" />
              <span>Havuzda (Escrow)</span>
            </div>
            <div className="text-xl font-black text-navy-900">
              {formatCentsToTRY(poolCents)}
            </div>
            <div className="text-[10px] text-slate-400">İş teslimatı bekleniyor</div>
          </div>

          {/* 2. Serbest Bırakılabilir */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
              <Clock className="w-3.5 h-3.5" />
              <span>Serbest Bırakılabilir</span>
            </div>
            <div className="text-xl font-black text-amber-700">
              {formatCentsToTRY(releasableCents)}
            </div>
            <div className="text-[10px] text-slate-400">İtiraz süresi doluyor</div>
          </div>

          {/* 3. Aktarılan (Net) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Aktarılan (Net)</span>
            </div>
            <div className="text-xl font-black text-emerald-700">
              {formatCentsToTRY(transferredCents)}
            </div>
            <div className="text-[10px] text-slate-400">IBAN&apos;a gönderilen</div>
          </div>

          {/* 4. İade Edilen */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>İade Edilen</span>
            </div>
            <div className="text-xl font-black text-slate-700">
              {formatCentsToTRY(refundedCents)}
            </div>
            <div className="text-[10px] text-slate-400">İptal/iade işlemleri</div>
          </div>

          {/* 5. İtirazda Olan */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <div className="flex items-center gap-1.5 text-xs font-bold text-red-700">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>İtirazda (Dondurulmuş)</span>
            </div>
            <div className="text-xl font-black text-red-600">
              {formatCentsToTRY(disputedCents)}
            </div>
            <div className="text-[10px] text-slate-400">Hakem incelemesinde</div>
          </div>
        </div>

        {/* Tavan Komisyon Tasarruf Rozeti */}
        {totalCappedSavingsCents > 0 && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                <strong>Tavan Komisyon Tasarrufunuz:</strong> Platformumuzun adil azami komisyon tavanı sayesinde şu ana kadar toplam{' '}
                <strong>{formatCentsToTRY(totalCappedSavingsCents)}</strong> komisyon avantajı sağladınız.
              </span>
            </div>
            <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg font-black text-xs shrink-0">
              Korumalı Hakediş
            </span>
          </div>
        )}

        {/* Transaction Table */}
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-base font-black text-navy-900">Tüm Hakediş ve Ödeme Geçmişi</h2>
            <span className="text-xs text-slate-500 font-bold">
              Toplam {companyTransactions.length} Kayıt
            </span>
          </div>

          {companyTransactions.length === 0 ? (
            <div className="p-12 text-center space-y-3 bg-slate-50/60">
              <div className="w-12 h-12 rounded-2xl bg-orange-100/60 text-orange-600 flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-navy-900 text-sm">Henüz Bir Ödeme veya Hakediş Kaydı Yok</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Şantiye GO Güvenli Ödeme Sistemi üzerinden ilanlarınıza yapılan kiralama, satış veya hizmet ödemeleri burada listelenecektir.
                </p>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase font-black text-[10px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">İşlem / Tarih</th>
                    <th className="py-3 px-4">Alıcı</th>
                    <th className="py-3 px-4">Toplam Tutar</th>
                    <th className="py-3 px-4">Platform Komisyonu</th>
                    <th className="py-3 px-4">Net Hakedişiniz</th>
                    <th className="py-3 px-4">Ödeme Durumu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {companyTransactions.map((tx) => {
                    const statusColors: Record<string, string> = {
                      transferred: 'bg-emerald-100 text-emerald-800',
                      paid_escrow: 'bg-blue-100 text-blue-800',
                      paid: 'bg-blue-100 text-blue-800',
                      releasable: 'bg-amber-100 text-amber-800',
                      disputed: 'bg-red-100 text-red-800',
                      refunded: 'bg-slate-100 text-slate-600',
                      pending: 'bg-slate-100 text-slate-500',
                    };

                    const statusLabels: Record<string, string> = {
                      transferred: 'IBAN&apos;a Aktarıldı',
                      paid_escrow: 'Havuzda Bloke',
                      paid: 'Havuzda Bloke',
                      releasable: 'Serbest Bırakılabilir',
                      disputed: 'İtirazda (Donduruldu)',
                      refunded: 'İade Edildi',
                      pending: 'Bekliyor',
                    };

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4">
                          <div className="font-mono text-[11px] font-bold text-navy-900">
                            #{tx.id.slice(0, 14)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {new Date(tx.created_at).toLocaleDateString('tr-TR')}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-800">
                          {tx.buyer?.full_name || 'Alıcı Kullanıcı'}
                        </td>
                        <td className="py-3.5 px-4 font-black text-navy-900">
                          {formatCentsToTRY(tx.amount_cents)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="text-slate-600 font-semibold">
                            {formatCentsToTRY(tx.commission_amount_cents)}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            (%{tx.commission_rate_percent})
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-black text-emerald-700">
                          {formatCentsToTRY(tx.net_company_amount_cents)}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                              statusColors[tx.status] || 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {statusLabels[tx.status] || tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Alt Üye İşyeri Güncelleme Modalı */}
        {onboardingModalOpen && (
          <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-base font-black text-navy-900">iyzico Alt Üye İşyeri Bilgileri</h3>
                </div>
                <button
                  onClick={() => setOnboardingModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                <strong>Veri Güvenliği İlkesi:</strong> Banka hesap IBAN bilginiz sistem veritabanında ASLA tam olarak saklanmaz. Bilgiler lisanslı ödeme sağlayıcısına iletilir; tarafımızda yalnızca son 4 hane saklanır. Şahıs kimlik numarası talep edilmez, kurumsal Vergi Kimlik No (VKN) kullanılır.
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Resmi Şirket Unvanı</label>
                  <input
                    type="text"
                    value={legalTitle}
                    onChange={(e) => setLegalTitle(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Vergi Dairesi</label>
                    <input
                      type="text"
                      value={taxOffice}
                      onChange={(e) => setTaxOffice(e.target.value)}
                      className="w-full border border-slate-300 rounded-xl p-2.5"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">VKN (10 Haneli)</label>
                    <input
                      type="text"
                      value={taxNumber}
                      onChange={(e) => setTaxNumber(e.target.value)}
                      maxLength={11}
                      className="w-full border border-slate-300 rounded-xl p-2.5"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Hakediş Transfer IBAN (TR...)</label>
                  <input
                    type="text"
                    value={ibanInput}
                    onChange={(e) => setIbanInput(e.target.value)}
                    placeholder="TR330006100511123456789001"
                    maxLength={26}
                    className="w-full font-mono border border-slate-300 rounded-xl p-2.5 text-navy-900"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Girilen IBAN şirketin yasal unvanı ile birebir uyumlu olmalıdır.
                  </span>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Şirket Adresi</label>
                  <input
                    type="text"
                    value={addressInput}
                    onChange={(e) => setAddressInput(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setOnboardingModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  İptal
                </button>
                <button
                  type="button"
                  onClick={handleRegisterSubMerchant}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'Doğrulanıyor...' : 'iyzico Doğrulaması Gönder'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
