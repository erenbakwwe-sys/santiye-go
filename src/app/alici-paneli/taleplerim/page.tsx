'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Clock,
  MapPin,
  Calendar,
  CheckCircle2,
  XCircle,
  MessageSquare,
  ArrowRight,
  Plus,
  Star,
  ShieldCheck,
  Wrench,
  Fuel,
  Truck,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { QuoteRequest, Quote } from '@/types/database';
import { getBuyerQuoteRequests, acceptQuote, rejectQuote } from '@/lib/services/quote-service';

export default function BuyerQuoteRequestsPage() {
  const [requests, setRequests] = useState<QuoteRequest[]>([]);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionSuccessMsg, setActionSuccessMsg] = useState('');

  const loadRequests = async () => {
    setLoading(true);
    const data = await getBuyerQuoteRequests('buyer-demo-001');
    setRequests(data);
    if (data.length > 0 && !expandedRequestId) {
      setExpandedRequestId(data[0].id);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleAccept = async (quoteId: string, requestId: string) => {
    const res = await acceptQuote(quoteId, requestId);
    if (res.success) {
      setActionSuccessMsg('Teklif başarıyla kabul edildi! Firma ile iletişime geçebilirsiniz.');
      loadRequests();
      setTimeout(() => setActionSuccessMsg(''), 4000);
    }
  };

  const handleReject = async (quoteId: string) => {
    const res = await rejectQuote(quoteId);
    if (res.success) {
      setActionSuccessMsg('Teklif reddedildi.');
      loadRequests();
      setTimeout(() => setActionSuccessMsg(''), 3000);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-black uppercase">
                Alıcı Paneli
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-xs text-slate-500 font-semibold">Teklif Karşılaştırma</span>
            </div>
            <h1 className="text-2xl font-black text-navy-900 mt-1">
              Teklif Taleplerim & Gelen Teklifler
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
              Oluşturduğunuz makine, malzeme ve nakliye taleplerine gelen teklifleri karşılaştırın.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/alici-paneli/sozlesmeler"
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs transition flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-blue-600" />
              SÖZLEŞMELERİM
            </Link>
            <Link
              href="/teklif-iste"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md shadow-orange-500/20 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              YENİ TEKLİF TALEBİ AÇ
            </Link>
          </div>
        </div>

        {actionSuccessMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-sm shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}

        {/* Requests List with nested Quote Comparison Tables */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400">
            Talepler yükleniyor...
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <FileText className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-navy-900 text-base">Henüz bir teklif talebiniz yok</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Şantiyenizin makine, malzeme ve nakliye ihtiyaçları için çoklu veya tekil teklif talebi oluşturabilirsiniz.
            </p>
            <div className="pt-2">
              <Link
                href="/teklif-iste"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 text-white font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                Hemen Teklif İste
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((req) => {
              const isExpanded = expandedRequestId === req.id;
              const quotes = req.quotes || [];

              return (
                <div
                  key={req.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Request Accordion Header */}
                  <div
                    onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                    className="p-5 sm:p-6 cursor-pointer hover:bg-slate-50/70 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                            req.request_type === 'single_listing'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {req.request_type === 'single_listing' ? 'İlan Teklifi' : 'Çoklu Firma Talebi'}
                        </span>

                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            req.status === 'accepted'
                              ? 'bg-emerald-100 text-emerald-800'
                              : req.status === 'quotes_received'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {req.status === 'accepted'
                            ? 'Teklif Kabul Edildi'
                            : req.status === 'quotes_received'
                            ? `${quotes.length} Teklif Geldi`
                            : 'Firma Yanıtı Bekleniyor'}
                        </span>

                        {req.request_type !== 'single_listing' && (
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Kontenjan: {req.used_quote_slots || quotes.length}/{req.max_quote_slots || 4} Firma
                          </span>
                        )}

                        <span className="text-xs text-slate-400">
                          {new Date(req.created_at).toLocaleDateString('tr-TR')}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-navy-900">{req.title}</h3>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {req.city_name || 'İstanbul'}
                          {req.district_name ? `, ${req.district_name}` : ''}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-navy-600" />
                          {req.start_date}
                          {req.end_date ? ` → ${req.end_date}` : ''}
                        </span>
                        <span>•</span>
                        <span>Miktar: {req.quantity} Adet</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-lg font-black text-navy-900">
                          {quotes.length} Teklif
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold">
                          {quotes.length > 0 ? 'Karşılaştırılabilir' : 'Bekleniyor'}
                        </div>
                      </div>
                      <button
                        type="button"
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                      >
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Quote Comparison Table */}
                  {isExpanded && (
                    <div className="p-5 sm:p-6 bg-slate-50/50 space-y-4">
                      {quotes.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs sm:text-sm">
                          Bu talep için henüz bir firma teklif vermedi. Talebiniz bölgenizdeki tedarikçilere iletilmiştir.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse text-xs sm:text-sm">
                            <thead>
                              <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-extrabold bg-slate-100/70">
                                <th className="p-3">Firma Bilgisi</th>
                                <th className="p-3">Mesafe</th>
                                <th className="p-3">Teklif Fiyatı</th>
                                <th className="p-3">Dahil Olanlar</th>
                                <th className="p-3">Teklif Notu</th>
                                <th className="p-3 text-right">İşlem</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                              {quotes.map((q) => {
                                const isAccepted = q.status === 'accepted';
                                const isRejected = q.status === 'rejected';

                                return (
                                  <tr
                                    key={q.id}
                                    className={`hover:bg-white transition ${
                                      isAccepted
                                        ? 'bg-emerald-50/60 font-semibold'
                                        : isRejected
                                        ? 'opacity-50 bg-slate-100'
                                        : 'bg-white'
                                    }`}
                                  >
                                    <td className="p-3">
                                      <div className="font-extrabold text-navy-900 text-sm">
                                        {q.company?.name || 'Onaylı Tedarikçi'}
                                      </div>
                                      <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold mt-0.5">
                                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                                        <span>{q.company?.rating_avg || 4.8}</span>
                                        <span className="text-slate-400 font-normal">
                                          ({q.company?.review_count || 12} Değerlendirme)
                                        </span>
                                      </div>
                                    </td>

                                    <td className="p-3">
                                      <span className="font-bold text-navy-900">
                                        {q.distance_km ? `${q.distance_km} km` : 'Bölgesel'}
                                      </span>
                                    </td>

                                    <td className="p-3">
                                      <div className="text-base font-black text-orange-600">
                                        {q.price_total.toLocaleString('tr-TR')} ₺
                                      </div>
                                      {q.price_unit && (
                                        <div className="text-[10px] text-slate-500">
                                          Birim: {q.price_unit.toLocaleString('tr-TR')} ₺
                                        </div>
                                      )}
                                    </td>

                                    <td className="p-3">
                                      <div className="flex flex-col gap-1 text-[11px] font-semibold">
                                        <span
                                          className={
                                            q.is_operator_included ? 'text-emerald-700' : 'text-slate-400 line-through'
                                          }
                                        >
                                          • Operatör {q.is_operator_included ? 'Dahil' : 'Hariç'}
                                        </span>
                                        <span
                                          className={
                                            q.is_fuel_included ? 'text-emerald-700' : 'text-slate-400 line-through'
                                          }
                                        >
                                          • Yakıt {q.is_fuel_included ? 'Dahil' : 'Hariç'}
                                        </span>
                                        <span
                                          className={
                                            q.is_transport_included ? 'text-emerald-700' : 'text-slate-400 line-through'
                                          }
                                        >
                                          • Nakliye {q.is_transport_included ? 'Dahil' : 'Hariç'}
                                        </span>
                                      </div>
                                    </td>

                                    <td className="p-3 max-w-xs text-xs text-slate-600">
                                      <div className="line-clamp-2">
                                        {q.notes || 'Özel bir şart belirtilmedi.'}
                                      </div>
                                    </td>

                                    <td className="p-3 text-right">
                                      <div className="flex items-center justify-end gap-2">
                                        {isAccepted ? (
                                          <span className="px-3 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold">
                                            KABUL EDİLDİ
                                          </span>
                                        ) : isRejected ? (
                                          <span className="px-3 py-1 bg-slate-300 text-slate-700 rounded-lg text-xs font-bold">
                                            REDDEDİLDİ
                                          </span>
                                        ) : (
                                          <>
                                            <button
                                              type="button"
                                              onClick={() => handleAccept(q.id, req.id)}
                                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition"
                                            >
                                              Kabul Et
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => handleReject(q.id)}
                                              className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-600 font-bold text-xs transition"
                                            >
                                              Reddet
                                            </button>
                                          </>
                                        )}

                                        <Link
                                          href={`/mesajlar?context=quote&id=${q.id}`}
                                          className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:text-navy-900 hover:bg-slate-100 transition"
                                          title="Firmaya Soru Sor"
                                        >
                                          <MessageSquare className="w-4 h-4" />
                                        </Link>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
