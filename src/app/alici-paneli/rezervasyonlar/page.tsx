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
  X,
  PhoneCall,
  MessageSquare,
  CreditCard,
} from 'lucide-react';
import { BookingWithDetails, getBuyerBookings, cancelBooking } from '@/lib/services/booking-service';

export default function BuyerBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getBuyerBookings('buyer-demo-001');
    setBookings(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancel = async (bookingId: string) => {
    if (confirm('Rezervasyon talebinizi iptal etmek istediğinize emin misiniz?')) {
      await cancelBooking(bookingId);
      setActionNotice('Rezervasyon talebi iptal edildi.');
      loadData();
      setTimeout(() => setActionNotice(''), 3000);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/alici-paneli"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Alıcı Paneline Dön
          </Link>
          <Link
            href="/alici-paneli/taleplerim"
            className="text-xs font-bold text-orange-600 hover:underline"
          >
            Teklif Taleplerime Git →
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-black uppercase">
              Alıcı Paneli
            </span>
            <h1 className="text-2xl font-black text-navy-900 mt-1">
              Rezervasyon Taleplerim
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              İlanlardan oluşturduğunuz kiralama tarih rezervasyonları ve firma onay durumları.
            </p>
          </div>
        </div>

        {actionNotice && (
          <div className="p-3.5 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
        )}

        {/* Bookings List */}
        {loading ? (
          <div className="p-12 text-center text-slate-400">Yükleniyor...</div>
        ) : bookings.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
            <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-bold text-navy-900 text-base">Henüz bir rezervasyonunuz yok</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              İlan detay sayfalarındaki tarih takvimini kullanarak doğrudan rezervasyon talebi oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const statusBadges = {
                pending: {
                  label: 'Firma Onayı Bekleniyor (48 Saate Kadar)',
                  class: 'bg-orange-100 text-orange-800 border-orange-200',
                  icon: Clock,
                },
                approved: {
                  label: 'Firma Tarafından Onaylandı',
                  class: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                  icon: CheckCircle2,
                },
                rejected: {
                  label: 'Firma Reddetti',
                  class: 'bg-red-100 text-red-800 border-red-200',
                  icon: XCircle,
                },
                cancelled: {
                  label: 'İptal Edildi',
                  class: 'bg-slate-100 text-slate-600 border-slate-200',
                  icon: XCircle,
                },
                expired: {
                  label: 'Süresi Doldu (Otomatik İptal)',
                  class: 'bg-slate-100 text-slate-500 border-slate-200',
                  icon: AlertCircle,
                },
              };

              const currentBadge = statusBadges[b.status as keyof typeof statusBadges] || statusBadges.pending;
              const IconComp = currentBadge.icon;

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
                      <span className="text-xs text-slate-500 font-semibold">
                        Talep Tarihi: {new Date(b.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${currentBadge.class}`}
                    >
                      <IconComp className="w-3.5 h-3.5" />
                      {currentBadge.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 space-y-2">
                      <h3 className="text-base sm:text-lg font-black text-navy-900">
                        {b.listing?.title || 'İş Makinesi Kiralama'}
                      </h3>
                      <div className="text-xs font-bold text-slate-600">
                        Firma: {b.company_name}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-600">
                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-navy-600" />
                          {b.start_date} → {b.end_date}
                        </span>

                        <span className="flex items-center gap-1 bg-slate-100 px-2.5 py-1 rounded-md">
                          <MapPin className="w-3.5 h-3.5 text-orange-500" />
                          {b.site_address}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 text-[11px] font-semibold">
                        <span className="text-slate-400">Kapsam:</span>
                        <span className={b.operator_included ? 'text-emerald-700' : 'text-slate-400 line-through'}>
                          Operatör {b.operator_included ? 'Dahil' : 'Hariç'}
                        </span>
                        <span>•</span>
                        <span className={b.fuel_included ? 'text-emerald-700' : 'text-slate-400 line-through'}>
                          Yakıt {b.fuel_included ? 'Dahil' : 'Hariç'}
                        </span>
                        <span>•</span>
                        <span className={b.transport_included ? 'text-emerald-700' : 'text-slate-400 line-through'}>
                          Nakliye {b.transport_included ? 'Dahil' : 'Hariç'}
                        </span>
                      </div>
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

                      <div className="flex items-center gap-2 pt-3 w-full justify-end flex-wrap">
                        {b.status === 'approved' && b.payment_status !== 'paid' && (
                          <Link
                            href={`/odeme/${b.id}`}
                            className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            ÖDEME YAP
                          </Link>
                        )}

                        {b.payment_status === 'paid' && (
                          <span className="px-3 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Ödendi (Havuzda)
                          </span>
                        )}

                        <Link
                          href={`/mesajlar?context=booking&id=${b.id}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Mesaj
                        </Link>

                        {b.status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => handleCancel(b.id)}
                            className="px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs transition"
                          >
                            İptal Et
                          </button>
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
