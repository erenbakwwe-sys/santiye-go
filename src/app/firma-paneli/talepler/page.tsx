'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  Send,
  Wrench,
  Fuel,
  Truck,
  AlertCircle,
  X,
  MessageSquare,
  ArrowRight,
  Filter,
  Coins,
  ShieldCheck,
  Flag,
  UserCheck,
  HelpCircle,
} from 'lucide-react';
import { QuoteRequest, Quote, QuoteCreditConfig, DisputeReason } from '@/types/database';
import { getCompanyQuoteRequests, submitQuote } from '@/lib/services/quote-service';
import {
  getCompanyCreditBalance,
  getCreditConfig,
  spendQuoteCredit,
  createQuoteDispute,
  submitQuoteOutcome,
} from '@/lib/services/credit-service';
import { checkRevealStatus, ContactCardDetails } from '@/lib/services/reveal-service';
import RevealedContactCard from '@/components/common/RevealedContactCard';

export default function CompanyQuoteRequestsPage() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [companyId, setCompanyId] = useState('f0000000-0000-0000-0000-000000000001');

  // Credit & Config State
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [creditConfig, setCreditConfig] = useState<QuoteCreditConfig | null>(null);

  // Credit Confirmation Modal State
  const [confirmingReq, setConfirmingReq] = useState<QuoteRequest | null>(null);
  const [spendingCredit, setSpendingCredit] = useState(false);
  const [spendError, setSpendError] = useState('');

  // Quote Submission Modal State
  const [activeRequest, setActiveRequest] = useState<QuoteRequest | null>(null);
  const [revealedDetails, setRevealedDetails] = useState<ContactCardDetails | null>(null);
  const [priceTotal, setPriceTotal] = useState<number>(0);
  const [priceUnit, setPriceUnit] = useState<number>(0);
  const [isOperatorIncluded, setIsOperatorIncluded] = useState(true);
  const [isFuelIncluded, setIsFuelIncluded] = useState(false);
  const [isTransportIncluded, setIsTransportIncluded] = useState(true);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Dispute (Sorunlu Talep) Modal State
  const [disputeTargetReq, setDisputeTargetReq] = useState<QuoteRequest | null>(null);
  const [disputeReason, setDisputeReason] = useState<DisputeReason>('unreachable_phone');
  const [disputeDesc, setDisputeDesc] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeSuccess, setDisputeSuccess] = useState(false);
  const [disputeError, setDisputeError] = useState('');

  // Action Notice Toast
  const [actionNotice, setActionNotice] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let activeCompId = companyId;
      if (user) {
        const { data: comp } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        activeCompId = comp?.id || user.id;
        setCompanyId(activeCompId);
      }

      const [reqData, bal, cfg] = await Promise.all([
        getCompanyQuoteRequests(activeCompId),
        getCompanyCreditBalance(activeCompId),
        getCreditConfig(),
      ]);

      setRequests(reqData);
      setCreditBalance(bal);
      setCreditConfig(cfg);
    } catch {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  // When clicking "TEKLİF VER":
  const handleInitiateQuote = async (req: QuoteRequest) => {
    // Check if direct single_listing request (exempt from credits)
    const isExempt = req.request_type === 'single_listing' && creditConfig?.exempt_single_listing;

    // Check if contact is already revealed
    const revealCheck = await checkRevealStatus(req.buyer_id, companyId);
    if (revealCheck.revealed && revealCheck.details) {
      setRevealedDetails(revealCheck.details);
      openQuoteForm(req);
      return;
    }

    if (isExempt || creditConfig?.mode === 'OFF') {
      // Free direct open
      openQuoteForm(req);
      return;
    }

    // Otherwise show credit confirmation dialog
    setConfirmingReq(req);
    setSpendError('');
  };

  // Confirming spending credit
  const handleConfirmSpendCredit = async () => {
    if (!confirmingReq) return;
    setSpendingCredit(true);
    setSpendError('');

    const res = await spendQuoteCredit(
      companyId,
      confirmingReq.id,
      confirmingReq.buyer_id
    );

    setSpendingCredit(false);

    if (res.success) {
      setCreditBalance(res.remainingBalance);
      setConfirmingReq(null);

      // Check revealed details
      const revealCheck = await checkRevealStatus(confirmingReq.buyer_id, companyId);
      if (revealCheck.revealed && revealCheck.details) {
        setRevealedDetails(revealCheck.details);
      }

      setActionNotice(
        res.mode === 'SHADOW'
          ? 'Gölge Mod: Simüle edilen teklif kontenjanı ayrıldı ve iletişim kartı açıldı!'
          : 'Teklif kredisi başarıyla kullanıldı! İletişim bilgileri açıldı.'
      );
      setTimeout(() => setActionNotice(''), 4500);

      // Open the quote form
      openQuoteForm(confirmingReq);
      // Reload request slots
      loadRequests();
    } else {
      setSpendError(res.error || 'Kredi harcama işlemi gerçekleştirilemedi.');
    }
  };

  const openQuoteForm = (req: QuoteRequest) => {
    setActiveRequest(req);
    setIsOperatorIncluded(req.need_operator);
    setIsFuelIncluded(req.need_fuel);
    setIsTransportIncluded(req.need_transport);
    setPriceTotal(0);
    setPriceUnit(0);
    setNotes('');
    setSubmitSuccess(false);
    setSubmitError('');
  };

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRequest) return;
    if (priceTotal <= 0) {
      setSubmitError('Lütfen geçerli bir teklif tutarı giriniz.');
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    const res = await submitQuote({
      request_id: activeRequest.id,
      company_id: companyId,
      listing_id: activeRequest.listing_id || null,
      price_total: Number(priceTotal),
      price_unit:
        priceUnit > 0
          ? Number(priceUnit)
          : Math.round(Number(priceTotal) / (activeRequest.quantity || 1)),
      currency: 'TRY',
      is_operator_included: isOperatorIncluded,
      is_fuel_included: isFuelIncluded,
      is_transport_included: isTransportIncluded,
      notes,
    });

    setSubmitting(false);

    if (res.success) {
      setSubmitSuccess(true);
      setTimeout(() => {
        setActiveRequest(null);
        setRevealedDetails(null);
        loadRequests();
      }, 1500);
    } else {
      setSubmitError(res.error || 'Teklif iletilemedi.');
    }
  };

  const handleOutcomeChange = async (
    quoteId: string,
    outcome: 'job_won' | 'job_lost' | 'could_not_reach' | 'unknown'
  ) => {
    await submitQuoteOutcome(quoteId, outcome);
    setActionNotice('Teklif sonucu kaydedildi. Katkınız için teşekkürler!');
    setTimeout(() => setActionNotice(''), 3000);
    loadRequests();
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeTargetReq) return;
    if (!disputeDesc.trim()) {
      setDisputeError('Lütfen sorunu açıklayınız.');
      return;
    }

    setDisputeSubmitting(true);
    setDisputeError('');

    const res = await createQuoteDispute(
      companyId,
      disputeTargetReq.id,
      disputeReason,
      disputeDesc.trim()
    );

    setDisputeSubmitting(false);

    if (res.success) {
      setDisputeSuccess(true);
      setTimeout(() => {
        setDisputeSuccess(false);
        setDisputeTargetReq(null);
        setDisputeDesc('');
      }, 1600);
    } else {
      setDisputeError(res.error || 'İtiraz iletilemedi.');
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (selectedStatus === 'all') return true;
    if (selectedStatus === 'responded') return r.quotes && r.quotes.length > 0;
    if (selectedStatus === 'pending') return !r.quotes || r.quotes.length === 0;
    return r.status === selectedStatus;
  });

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Notice alert */}
        {actionNotice && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionNotice}</span>
            </div>
            <button onClick={() => setActionNotice('')} className="text-emerald-600 hover:underline">
              Kapat
            </button>
          </div>
        )}

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-black uppercase">
                Firma Paneli
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">Tedarikçi Talepleri</span>
            </div>
            <h1 className="text-2xl font-black text-navy-900 mt-1">
              Gelen Teklif Talepleri & İş Fırsatları
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Bölgenizdeki şantiyelerden açılan talepler. En fazla 4 firma kontenjanı ile sınırlıdır.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Credit Balance Badge & Top-up */}
            <div className="p-2.5 px-4 rounded-xl bg-navy-900 text-white flex items-center gap-3 shadow-sm">
              <div>
                <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
                  Kredi Bakiyeniz
                </span>
                <span className="text-base font-black text-orange-400 flex items-center gap-1">
                  <Coins className="w-4 h-4 text-orange-400" />
                  {creditBalance} <span className="text-xs text-slate-300 font-normal">Kredi</span>
                </span>
              </div>
              <Link
                href="/firma-paneli/krediler"
                className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-xs transition shadow-sm"
              >
                Yükle
              </Link>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === 'all'
                ? 'bg-navy-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Tüm Talepler ({requests.length})
          </button>
          <button
            onClick={() => setSelectedStatus('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === 'pending'
                ? 'bg-orange-500 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Yanıt Bekleyenler ({requests.filter((r) => !r.quotes || r.quotes.length === 0).length})
          </button>
          <button
            onClick={() => setSelectedStatus('responded')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === 'responded'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            Teklif Verdiklerim ({requests.filter((r) => r.quotes && r.quotes.length > 0).length})
          </button>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            Talepler yükleniyor...
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-navy-900 text-base">Bu kategoride talep bulunamadı</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Bölgenizdeki müteahhitler talep açtığında veya ilanlarınızdan teklif istediğinde burada listelenecektir.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((req) => {
              const myQuote = req.quotes?.[0];
              const isResponded = Boolean(myQuote);
              const usedSlots = req.used_quote_slots || (req.quotes_count ?? 0);
              const maxSlots = req.max_quote_slots || 4;
              const isSlotsFull = usedSlots >= maxSlots;

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm hover:border-slate-300 transition space-y-4"
                >
                  {/* Top Bar of Request */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase ${
                          req.request_type === 'single_listing'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {req.request_type === 'single_listing'
                          ? 'İlana Özel Talep (Ücretsiz)'
                          : 'Bölgesel Çoklu Talep'}
                      </span>

                      {/* Slot Badge */}
                      {req.request_type !== 'single_listing' && (
                        <span
                          className={`px-2.5 py-0.5 rounded text-[11px] font-black ${
                            isSlotsFull
                              ? 'bg-red-100 text-red-800 border border-red-200'
                              : 'bg-amber-100 text-amber-900 border border-amber-200'
                          }`}
                        >
                          Kontenjan: {usedSlots}/{maxSlots} Firma Teklif Verdi
                        </span>
                      )}

                      <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {new Date(req.created_at).toLocaleDateString('tr-TR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>

                    <div>
                      {myQuote ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Teklifiniz İletildi ({myQuote.price_total.toLocaleString('tr-TR')} ₺)
                        </span>
                      ) : isSlotsFull ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                          Kontenjan Doldu (Kapandı)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold border border-orange-200">
                          <Clock className="w-3.5 h-3.5" />
                          Yanıt Bekleniyor
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 space-y-2">
                      <h3 className="text-base sm:text-lg font-black text-navy-900 leading-snug">
                        {req.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 line-clamp-2 leading-relaxed">
                        {req.description}
                      </p>

                      {/* Location & Details Badges */}
                      <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600">
                        <span className="flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {req.city_name || 'İstanbul'}
                          {req.district_name ? `, ${req.district_name}` : ''}
                        </span>

                        <span className="flex items-center gap-1 font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                          <Calendar className="w-3.5 h-3.5 text-navy-600" />
                          Başlangıç: {new Date(req.start_date).toLocaleDateString('tr-TR')}
                        </span>

                        <span className="font-semibold text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md">
                          Miktar: {req.quantity} Adet
                        </span>
                      </div>
                    </div>

                    {/* Right Action Column */}
                    <div className="lg:col-span-4 flex flex-col justify-center gap-2.5 lg:border-l lg:border-slate-100 lg:pl-5">
                      {myQuote ? (
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
                          <div className="font-extrabold text-navy-900">
                            Verilen Teklif: {myQuote.price_total.toLocaleString('tr-TR')} ₺
                          </div>

                          {/* Outcome Feedback Selector */}
                          <div className="pt-2 border-t border-slate-200/80">
                            <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                              Sonuç Bildir (Raporlama):
                            </span>
                            <select
                              value={myQuote.outcome_feedback || 'unknown'}
                              onChange={(e) =>
                                handleOutcomeChange(myQuote.id, e.target.value as any)
                              }
                              className="w-full text-xs p-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-700"
                            >
                              <option value="unknown">Henüz Belli Değil</option>
                              <option value="job_won">🎉 İşi Ben Aldım</option>
                              <option value="job_lost">❌ İş Başkasına Gitti</option>
                              <option value="could_not_reach">📞 Müşteriye Ulaşılamadı</option>
                            </select>
                          </div>

                          {/* Problematic request dispute trigger */}
                          <button
                            type="button"
                            onClick={() => {
                              setDisputeTargetReq(req);
                              setDisputeError('');
                            }}
                            className="text-[11px] text-red-600 hover:text-red-700 font-bold flex items-center gap-1 pt-1"
                          >
                            <Flag className="w-3 h-3" />
                            Sorunlu Talep / İade Bildir
                          </button>
                        </div>
                      ) : isSlotsFull ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-4 rounded-xl bg-slate-200 text-slate-500 font-bold text-xs cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          Kontenjan Doldu (Teklife Kapalı)
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleInitiateQuote(req)}
                          className="w-full py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2"
                        >
                          <Coins className="w-4 h-4" />
                          TEKLİF VER {req.request_type !== 'single_listing' ? '(1 Kredi)' : ''}
                        </button>
                      )}

                      <Link
                        href={`/mesajlar?context=quote_req&id=${req.id}`}
                        className="w-full py-2 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-navy-900" />
                        Alıcıya Soru Sor / Mesaj
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 1. Credit Confirmation Modal */}
        {confirmingReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  <h3 className="text-base font-black text-navy-900">
                    Teklif Kredisi & İletişim Açılışı
                  </h3>
                </div>
                <button
                  onClick={() => setConfirmingReq(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-bold text-navy-900">{confirmingReq.title}</div>
                <div className="flex justify-between text-slate-600">
                  <span>Maliyet:</span>
                  <strong className="text-orange-600">1 Teklif Kredisi</strong>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Mevcut Bakiyeniz:</span>
                  <strong className="text-navy-900">{creditBalance} Kredi</strong>
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 leading-relaxed">
                {creditConfig?.mode === 'SHADOW' ? (
                  <span>
                    <strong>Gölge Mod Aktif:</strong> Platform şu anda deneme modundadır. Bakiyenizden kredi <strong>DÜŞMEYECEKTİR</strong>; sistem teklif hacmini kaydedecektir.
                  </span>
                ) : (
                  <span>
                    Krediniz kullanıldığında bu talep için kontenjan ayrılır ve müşterinin doğrulanmış iletişim bilgileri (telefon, WhatsApp, şantiye açık adresi) anında size açılır.
                  </span>
                )}
              </div>

              {spendError && (
                <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{spendError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmingReq(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  disabled={spendingCredit}
                  onClick={handleConfirmSpendCredit}
                  className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition disabled:opacity-50"
                >
                  {spendingCredit ? 'İşleniyor...' : 'Onayla ve İletişimi Aç'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 2. Quote Submission Form Modal (With Revealed Contact Card if available) */}
        {activeRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div>
                  <span className="text-[10px] font-bold uppercase text-orange-600 tracking-wider">
                    Teklif Formu & İletişim Detayı
                  </span>
                  <h3 className="font-black text-navy-900 text-base line-clamp-1">
                    {activeRequest.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveRequest(null);
                    setRevealedDetails(null);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-200 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleQuoteSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
                {/* Revealed Contact Card Component */}
                {revealedDetails && (
                  <RevealedContactCard
                    details={revealedDetails}
                    roleLabel="Müşteri İletişim Kartı (Doğrulanmış)"
                  />
                )}

                {submitSuccess && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                    <span>Teklifiniz alıcıya başarıyla iletildi!</span>
                  </div>
                )}

                {submitError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Toplam Teklif Fiyatı (₺) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={priceTotal || ''}
                      onChange={(e) => setPriceTotal(Number(e.target.value))}
                      placeholder="Örn: 45000"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Birim Fiyat (₺ / Gün veya Adet)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={priceUnit || ''}
                      onChange={(e) => setPriceUnit(Number(e.target.value))}
                      placeholder="Opsiyonel"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 block">
                    Teklif Kapsamına Dahil Olanlar
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isOperatorIncluded}
                        onChange={(e) => setIsOperatorIncluded(e.target.checked)}
                        className="rounded text-orange-600"
                      />
                      <span>Operatör</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isFuelIncluded}
                        onChange={(e) => setIsFuelIncluded(e.target.checked)}
                        className="rounded text-orange-600"
                      />
                      <span>Yakıt</span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={isTransportIncluded}
                        onChange={(e) => setIsTransportIncluded(e.target.checked)}
                        className="rounded text-orange-600"
                      />
                      <span>Nakliye</span>
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teklif Notu & Makine Modeli
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Tahsis edilecek makine modeli, nakliye detayları veya ödeme vadesi şartlarınız..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveRequest(null);
                      setRevealedDetails(null);
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || submitSuccess}
                    className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition disabled:opacity-50"
                  >
                    {submitting ? 'Gönderiliyor...' : 'Teklifi İlet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 3. Dispute (Sorunlu Talep İtirazı) Modal */}
        {disputeTargetReq && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Flag className="w-5 h-5 text-red-600" />
                  <h3 className="text-base font-black text-navy-900">
                    Sorunlu Talep / Kredi İadesi Bildirimi
                  </h3>
                </div>
                <button
                  onClick={() => setDisputeTargetReq(null)}
                  className="text-slate-400 hover:text-slate-600 font-bold text-sm"
                >
                  ✕
                </button>
              </div>

              {disputeSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <span>İtirazınız admin masasına iletildi. İncelenip krediniz iade edilecektir.</span>
                </div>
              ) : (
                <form onSubmit={handleDisputeSubmit} className="space-y-3 text-xs">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Sorun Nedeni *
                    </label>
                    <select
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value as DisputeReason)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                    >
                      <option value="unreachable_phone">Telefona Ulaşılamıyor / Yanlış Numara</option>
                      <option value="fake_request">Talep Sahte veya Anlamsız</option>
                      <option value="wrong_category">Kategori Dışı Talep</option>
                      <option value="buyer_cancelled">Alıcı Talebi İptal Etti</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Açıklama & Kanıt *
                    </label>
                    <textarea
                      rows={3}
                      required
                      value={disputeDesc}
                      onChange={(e) => setDisputeDesc(e.target.value)}
                      placeholder="Müşteriyi kaç kez aradınız, ne yanıt aldınız? Lütfen kısaca belirtin..."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300"
                    />
                  </div>

                  <p className="text-[11px] text-slate-500">
                    Admin moderatörü itirazı inceleyerek onayladığında 1 teklif kredisi otomatik olarak cüzdanınıza iade edilir.
                  </p>

                  {disputeError && (
                    <div className="p-3 bg-red-50 text-red-700 rounded-xl text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{disputeError}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setDisputeTargetReq(null)}
                      className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold hover:bg-slate-100"
                    >
                      Vazgeç
                    </button>
                    <button
                      type="submit"
                      disabled={disputeSubmitting}
                      className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black shadow-md transition disabled:opacity-50"
                    >
                      {disputeSubmitting ? 'İletiliyor...' : 'İade Talebi Gönder'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
