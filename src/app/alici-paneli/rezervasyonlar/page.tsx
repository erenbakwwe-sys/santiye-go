'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import TripCounter from '@/components/TripCounter';
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
  ShieldCheck,
  AlertTriangle,
  Lock,
  QrCode,
  FileCheck2,
} from 'lucide-react';
import { BookingWithDetails, getBuyerBookings, cancelBooking } from '@/lib/services/booking-service';
import { DEMO_TRANSACTIONS } from '@/lib/services/payment-service';
import { openEscrowDispute } from '@/lib/services/escrow-service';
import {
  getOrCreateWaybillForBooking,
  canonicalBuyerId,
  DeliveryWaybill,
} from '@/lib/services/delivery-service';
import { getActiveProfile } from '@/lib/services/auth-service';
import DeliveryConfirmModal from '@/components/delivery/DeliveryConfirmModal';

export default function BuyerBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState('');
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [selectedBookingForDispute, setSelectedBookingForDispute] = useState<BookingWithDetails | null>(null);
  const [disputeReason, setDisputeReason] = useState('Makine sahaya gelmedi veya taahhüt edilen zamanda ulaşmadı');
  const [disputeNotes, setDisputeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [selectedWaybill, setSelectedWaybill] = useState<DeliveryWaybill | null>(null);
  // Oturumdaki alıcı kimliği (sabit 'buyer-demo-001' yerine doğrulanmış oturum)
  const [buyerId, setBuyerId] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    getActiveProfile()
      .then((p) => alive && setBuyerId(p?.id ?? null))
      .catch(() => alive && setBuyerId(null));
    return () => {
      alive = false;
    };
  }, []);

  const handleOpenDeliveryModal = (booking: BookingWithDetails) => {
    const wb = getOrCreateWaybillForBooking(booking.id, booking);
    setSelectedWaybill(wb);
    setDeliveryModalOpen(true);
  };

  const loadData = async () => {
    setLoading(true);
    try { setBookings(await getBuyerBookings()); }
    catch { setActionNotice('Rezervasyonlar yüklenemedi.'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancel = async (bookingId: string) => {
    if (confirm('Rezervasyon talebinizi iptal etmek istediğinize emin misiniz?')) {
      const res = await cancelBooking(bookingId);
      setActionNotice(res.success ? 'Rezervasyon talebi iptal edildi.' : res.error || 'Rezervasyon iptal edilemedi.');
      loadData();
      setTimeout(() => setActionNotice(''), 3000);
    }
  };

  const handleOpenDisputeModal = (booking: BookingWithDetails) => {
    setSelectedBookingForDispute(booking);
    setDisputeModalOpen(true);
  };

  const handleSubmitDispute = async () => {
    if (!selectedBookingForDispute) return;
    setIsSubmitting(true);

    // Başka bir rezervasyonun ödemesine düşmemek için yalnızca birebir eşleşen kayıt kullanılır
    const tx = DEMO_TRANSACTIONS.find((t) => t.booking_id === selectedBookingForDispute.id);
    if (!buyerId) {
      alert('İtiraz açmak için alıcı hesabınızla giriş yapmalısınız.');
    } else if (!tx) {
      alert('Bu rezervasyona bağlı bir emanet ödeme kaydı bulunamadı.');
    } else {
      const res = await openEscrowDispute(tx.id, canonicalBuyerId(buyerId), disputeReason, disputeNotes);
      if (res.success) {
        setDisputeModalOpen(false);
        setActionNotice('İtiraz başarıyla açıldı! Ödeme transferi donduruldu ve yönetim hakem kuyruğuna iletildi.');
        loadData();
        setTimeout(() => setActionNotice(''), 4000);
      } else {
        alert(res.error || 'İtiraz oluşturulamadı.');
      }
    }
    setIsSubmitting(false);
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
          <div className="flex items-center gap-2">
            <Link
              href="/odeme-guvencesi"
              target="_blank"
              className="text-xs font-bold text-emerald-700 hover:underline flex items-center gap-1"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              Ödeme Güvencesi Koşulları
            </Link>
          </div>
        </div>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="px-2.5 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-black">
              Alıcı Paneli
            </span>
            <h1 className="text-2xl font-black text-navy-900 mt-1">
              Rezervasyonlarım & Ödeme Durumu
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              İlanlardan oluşturduğunuz iş rezervasyonları, emanet havuz ödemeleri ve iş onay süreçleri.
            </p>
          </div>

          <Link
            href="/teslimat-onay"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition shrink-0"
          >
            <QrCode className="w-4 h-4" />
            <span>PIN / QR İle Teslim Al</span>
          </Link>
        </div>

        {actionNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm">
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
            <h3 className="font-bold text-navy-900 text-base">Henüz bir rezervasyonunuz yok</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              İlan detay sayfalarındaki tarih takvimini kullanarak doğrudan rezervasyon talebi oluşturabilirsiniz.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((b) => {
              const tx = DEMO_TRANSACTIONS.find((t) => t.booking_id === b.id);
              const isEscrowPaid = b.payment_status === 'paid' || tx?.status === 'paid' || tx?.status === 'paid_escrow';
              const isTransferred = tx?.status === 'transferred';
              const isDisputed = tx?.status === 'disputed';

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
                        Tarih: {new Date(b.created_at).toLocaleDateString('tr-TR')}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      {isDisputed ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          İtiraz İnceleniyor (Ödeme Donduruldu)
                        </span>
                      ) : isTransferred ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          İş Onaylandı & Hakediş Aktarıldı
                        </span>
                      ) : isEscrowPaid ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                          <Lock className="w-3.5 h-3.5 text-blue-600" />
                          Ödeme Havuzda (Güvence Altında)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="w-3.5 h-3.5" />
                          Onay Bekleniyor
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                    <div className="lg:col-span-8 space-y-2">
                      <h3 className="text-base sm:text-lg font-black text-navy-900">
                        {b.listing?.title || 'İş Makinesi Kiralama'}
                      </h3>
                      <TripCounter id={b.id} />
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

                      {/* Escrow Havuz Güvencesi Bildirim Şeridi */}
                      {isEscrowPaid && !isTransferred && !isDisputed && (
                        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between gap-2 mt-2">
                          <div className="flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                            <span>
                              <strong>Ödeme Güvencesi:</strong> Paranız iyzico havuzunda tutuluyor. İş tamamlandığında onaylayabilir veya sorun varsa itiraz edebilirsiniz.
                            </span>
                          </div>
                          <span className="text-xs font-bold bg-white px-2 py-0.5 rounded border border-emerald-200 text-emerald-700 shrink-0">
                            İtiraz süresi: 2 gün 18 saat
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-4 flex flex-col justify-between items-end border-t lg:border-t-0 lg:border-l lg:border-slate-100 lg:pl-5 pt-3 lg:pt-0">
                      <div className="text-right w-full">
                        <span className="text-xs text-slate-400 font-bold block">
                          İş Bedeli
                        </span>
                        <span className="text-2xl font-black text-orange-600">
                          {(b.total_price || b.agreed_price || 0).toLocaleString('tr-TR')} ₺
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-3 w-full justify-end flex-wrap">
                        {/* Ödeme Yap Butonu */}
                        {b.status === 'approved' && !isEscrowPaid && !isTransferred && (
                          <Link
                            href={`/odeme/${b.id}`}
                            className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            ÖDEME YAP
                          </Link>
                        )}

                        {/* Escrow Onayla / Serbest Bırak Butonu */}
                        {isEscrowPaid && !isTransferred && !isDisputed && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleOpenDeliveryModal(b)}
                              className="px-3.5 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-1.5"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                              Malzemeyi Teslim Al (QR / PIN)
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenDisputeModal(b)}
                              className="px-3 py-1.5 rounded-lg border border-amber-300 text-amber-800 hover:bg-amber-50 font-bold text-xs transition flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                              Sorun Bildir
                            </button>
                          </>
                        )}

                        {/* Teslim Edildi İrsaliye Butonu */}
                        {isTransferred && (
                          <button
                            type="button"
                            onClick={() => handleOpenDeliveryModal(b)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold text-xs transition flex items-center gap-1"
                          >
                            <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                            Dijital İrsaliye
                          </button>
                        )}

                        <Link
                          href={`/mesajlar?companyId=${b.company_id || b.listing?.company_id || ''}&listingId=${b.listing_id || ''}&listingTitle=${encodeURIComponent(b.listing?.title || 'Rezervasyon')}&companyName=${encodeURIComponent(b.company_name || (b.listing as any)?.company_name || 'Firma')}`}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition flex items-center gap-1"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          Mesaj
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* İtiraz / Sorun Bildirme Modalı */}
        {disputeModalOpen && selectedBookingForDispute && (
          <div className="fixed inset-0 z-50 bg-navy-950/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl border border-slate-100">
              <div className="flex items-center justify-between border-b pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-black text-navy-900">Uyuşmazlık Bildir & Ödemeyi Dondur</h3>
                </div>
                <button
                  onClick={() => setDisputeModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                İtiraz açıldığında lisanslı ödeme sağlayıcısı nezdindeki otomatik serbest bırakma talimatı <strong>derhal dondurulur</strong>. Tutar siz ve firma arasındaki uyuşmazlık yönetim tarafından incelenene kadar havuzda kalır.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Uyuşmazlık Nedeni</label>
                  <select
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5 bg-slate-50"
                  >
                    <option value="Makine sahaya gelmedi veya taahhüt edilen zamanda ulaşmadı">Makine sahaya gelmedi / Teslimat yapılmadı</option>
                    <option value="Makine arızalı veya ilandaki özelliklerle uyuşmuyor">Makine arızalı veya teknik specs uyuşmuyor</option>
                    <option value="Operatör ehliyetsiz veya İSG kurallarına aykırı">Operatör ehliyetsiz / İSG ihlali</option>
                    <option value="Hizmet taahhüt edilen süreden önce yarım bırakıldı">Hizmet yarım bırakıldı</option>
                    <option value="Diğer operasyonel uyuşmazlık">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Ayrıntılı Açıklama ve Deliller</label>
                  <textarea
                    rows={3}
                    value={disputeNotes}
                    onChange={(e) => setDisputeNotes(e.target.value)}
                    placeholder="Şantiyede yaşanan sorunu, tarih ve tutanak detaylarını yazınız..."
                    className="w-full text-xs font-medium border border-slate-300 rounded-xl p-2.5"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setDisputeModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Vazgeç
                </button>
                <button
                  type="button"
                  onClick={handleSubmitDispute}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-black bg-amber-600 hover:bg-amber-700 text-white transition disabled:opacity-50"
                >
                  {isSubmitting ? 'İşleniyor...' : 'Ödemeyi Dondur ve İtirazı Aç'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR Kodlu Teslimat Onay Modalı */}
        {deliveryModalOpen && selectedWaybill && (
          <DeliveryConfirmModal
            initialWaybill={selectedWaybill}
            initialTokenOrPin={selectedWaybill.delivery_pin}
            onSuccess={() => {
              setActionNotice('Dijital irsaliye onaylandı! Emanet ödeme satıcıya serbest bırakıldı.');
              loadData();
              setTimeout(() => setActionNotice(''), 4000);
            }}
            onClose={() => setDeliveryModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
