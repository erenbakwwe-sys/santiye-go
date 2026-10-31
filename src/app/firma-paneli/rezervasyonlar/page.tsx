'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Building2,
  ArrowLeft,
  Check,
  X,
  MessageSquare,
  Layers,
} from 'lucide-react';
import {
  BookingWithDetails,
  getCompanyBookings,
  approveBooking,
  rejectBooking,
} from '@/lib/services/booking-service';

export default function CompanyBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getCompanyBookings('f0000000-0000-0000-0000-000000000001');
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    await approveBooking(id);
    setActionNotice('Rezervasyon onaylandı ve takvime otomatik işlendi!');
    loadData();
    setTimeout(() => setActionNotice(''), 3000);
  };

  const handleReject = async (id: string) => {
    await rejectBooking(id);
    setActionNotice('Rezervasyon talebi reddedildi.');
    loadData();
    setTimeout(() => setActionNotice(''), 3000);
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/firma-paneli"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Firma Paneline Dön
          </Link>
          <Link
            href="/firma-paneli/takvim"
            className="text-xs font-bold text-orange-600 hover:underline"
          >
            Müsaitlik Takvimine Git →
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-xs font-black uppercase">
              Firma Paneli
            </span>
            <h1 className="text-2xl font-black text-navy-900 mt-1">
              Gelen Kiralama Rezervasyonları
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Makineleriniz için gelen tarihli rezervasyon talepleri. Onayladığınızda takvimdeki ilgili günler otomatik dolacaktır.
            </p>
          </div>
        </div>

        {actionNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Bookings List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Yükleniyor...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-navy-900 text-base">Gelen rezervasyon talebi yok</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Alıcılar ilanlarınız üzerinden tarih seçip rezervasyon talebi gönderdiklerinde burada görüntülenecektir.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const isPending = b.status === 'pending';
              const isApproved = b.status === 'approved';

              return (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-400">
                        #{b.id.slice(0, 12)}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="text-xs text-slate-600 font-bold">
                        Talep Eden: {b.buyer_name}
                      </span>
                    </div>

                    <div>
                      {isPending ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-100 text-orange-800 text-xs font-bold border border-orange-200">
                          <Clock className="w-3.5 h-3.5" />
                          Onayınız Bekleniyor (48 Saatlik Süreç)
                        </span>
                      ) : isApproved ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Onaylandı (Takvimde Dolu)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-bold">
                          {b.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 space-y-2">
                      <h3 className="text-base sm:text-lg font-black text-navy-900">
                        {b.listing?.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md font-semibold text-navy-900">
                          <Calendar className="w-3.5 h-3.5 text-navy-600" />
                          {b.start_date} → {b.end_date}
                        </span>

                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {b.site_address}
                        </span>
                      </div>

                      {b.notes && (
                        <div className="p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-100">
                          <strong>Müşteri Notu:</strong> {b.notes}
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-between items-end border-t lg:border-t-0 lg:border-l lg:border-slate-100 lg:pl-5 pt-3 lg:pt-0">
                      <div className="text-right w-full">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Tahmini Tutar
                        </span>
                        <span className="text-2xl font-black text-orange-600">
                          {(b.total_price || b.agreed_price || 0).toLocaleString('tr-TR')} ₺
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-3 w-full justify-end">
                        <Link
                          href={`/mesajlar?context=booking&id=${b.id}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Mesaj
                        </Link>

                        {isPending && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleApprove(b.id)}
                              className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center gap-1 shadow-sm"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Onayla
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReject(b.id)}
                              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition"
                            >
                              Reddet
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
