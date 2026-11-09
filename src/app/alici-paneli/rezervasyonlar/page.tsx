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
  ArrowLeft,
  X,
  MessageSquare,
  CreditCard,
  ShieldCheck,
  AlertTriangle,
  Timer,
} from 'lucide-react';
import { BookingWithDetails, getBuyerBookings, cancelBooking } from '@/lib/services/booking-service';
import { buyerApproveEscrow, buyerDisputeEscrow } from '@/lib/services/escrow-service';

export default function BuyerBookingsPage() {
  const [bookings, setBookings] = useState<BookingWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionNotice, setActionNotice] = useState('');
  const [disputeBookingId, setDisputeBookingId] = useState<string | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);

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

  const handleApproveEscrow = async (bookingId: string) => {
    if (confirm('Hizmeti/makineyi sorunsuz teslim aldığınızı ve ödemenin tedarikçi firmaya aktarılmasını onaylıyor musunuz?')) {
      try {
        const res = await buyerApproveEscrow(`pay-${bookingId}`);
        if (res.success) {
          setActionNotice('✅ Teslimat onaylandı! Ödeme tedarikçi firmanın hesabına aktarılmak üzere iyzico tarafından işleme alındı.');
        } else {
          setActionNotice(`⚠️ ${res.error || 'İşlem gerçekleştirilemedi.'}`);
        }
      } catch (err: any) {
        setActionNotice(`Hata: ${err.message}`);
      }
      loadData();
      setTimeout(() => setActionNotice(''), 5000);
    }
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeBookingId || !disputeReason.trim()) return;

    setDisputeSubmitting(true);
    try {
      const res = await buyerDisputeEscrow(`pay-${disputeBookingId}`, disputeReason.trim());
      if (res.success) {
        setActionNotice('🛑 İtirazınız kaydedildi! Ödeme aktarımı durduruldu ve inceleme için Şantiye Go İtiraz Masasına iletildi.');
        setDisputeBookingId(null);
        setDisputeReason('');
      } else {
        setActionNotice(`⚠️ ${res.error || 'İtiraz açılamadı.'}`);
      }
    } catch (err: any) {
      setActionNotice(`Hata: ${err.message}`);
    } finally {
      setDisputeSubmitting(false);
      loadData();
      setTimeout(() => setActionNotice(''), 5000);
    }
  };

  /**
   * Calculates remaining dispute window countdown (72 hours from delivery)
   */
  const getDisputeCountdown = (createdAt: string) => {
    // 72 hours window from delivery/creation
    const created = new Date(createdAt).getTime();
    const expires = created + 72 * 60 * 60 * 1000;
    const diffMs = expires - Date.now();
    if (diffMs <= 0) return 'Süre doldu (Otomatik aktarım sürecinde)';
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days > 0 ? `${days} gün ` : ''}${remHours} saat kaldı`;
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
          <div className="flex items-center gap-3">
            <Link
              href="/odeme-guvencesi-ve-itiraz-kosullari"
              className="text-xs font-bold text-slate-500 hover:text-navy-900 underline"
            >
              Ödeme Güvencesi Koşulları
            </Link>
            <Link
              href="/alici-paneli/taleplerim"
              className="text-xs font-bold text-orange-600 hover:underline"
            >
              Teklif Taleplerime Git →
            </Link>
          </div>
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
              İlanlardan oluşturduğunuz kiralama tarih rezervasyonları, ödeme modları ve onay süreçleri.
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
              const isPlatformEscrowMode = (b as any).payment_mode === 'platform';
              const isPaid = b.payment_status === 'paid';

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

                      {/* Ödeme Modu Rozeti */}
                      {isPlatformEscrowMode ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-black uppercase flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          Platform Ödeme Güvencesi
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold">
                          Doğrudan Firma Mutabakatı (Harici)
                        </span>
                      )}
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

                      {/* İtiraz Süresi Sayacı (Teslim Edilen ve Platform Modundaki İşlerde) */}
                      {isPlatformEscrowMode && isPaid && (
                        <div className="p-2.5 bg-blue-50/80 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2 mt-2">
                          <Timer className="w-4 h-4 text-blue-600 shrink-0" />
                          <div>
                            <span className="font-bold">İtiraz Süresi Sayacı: </span>
                            <span className="font-mono text-blue-800 font-extrabold">
                              {getDisputeCountdown(b.created_at)}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              Süre dolduğunda bedel otomatik olarak tedarikçiye aktarılır.
                            </span>
                          </div>
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

                      <div className="flex items-center gap-2 pt-3 w-full justify-end flex-wrap">
                        {b.status === 'approved' && !isPaid && (
                          <Link
                            href={`/odeme/${b.id}`}
                            className="px-4 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition flex items-center gap-1.5"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            {isPlatformEscrowMode ? 'GÜVENLİ ÖDEME YAP' : 'MUTABAKAT DETAYI'}
                          </Link>
                        )}

                        {/* Platform Escrow Modundaki Butonlar */}
                        {isPlatformEscrowMode && isPaid && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleApproveEscrow(b.id)}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition flex items-center gap-1"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              İşi Onayla & Ödemeyi Serbest Bırak
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setDisputeBookingId(b.id);
                                setDisputeReason('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs transition flex items-center gap-1"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Sorun Bildir
                            </button>
                          </div>
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

        {/* Escrow Dispute Modal */}
        {disputeBookingId && (
          <div className="fixed inset-0 bg-navy-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-red-100 text-red-600">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-black text-navy-900 text-base">
                      Ödeme İtirazı & Sorun Bildirimi
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ödemeniz iyzico havuzunda derhal askıya alınır.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setDisputeBookingId(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 leading-relaxed">
                İtiraz açıldığında sayac durur ve satıcıya para aktarımı blokenir. Şantiye Go İtiraz Masası teslim tutanaklarını inceleyerek para iadesi veya aktarım kararı verir.
              </div>

              <form onSubmit={handleSubmitDispute} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    İtiraz / Sorun Gerekçesi *
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="Örn: Makine taahhüt edilen tarihte şantiyeye getirilmedi / Eksik operatör ile çalışıldı..."
                    className="w-full p-3 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDisputeBookingId(null)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={disputeSubmitting || !disputeReason.trim()}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-black text-xs shadow-md transition"
                  >
                    {disputeSubmitting ? 'Kaydediliyor...' : 'İtirazı Başlat ve Ödemeyi Askıya Al'}
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
