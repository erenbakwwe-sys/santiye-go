'use client';

import { useState, useEffect } from 'react';
import { listingCompanyName } from '@/lib/utils/listing-display';
import Link from 'next/link';
import {
  MessageSquare,
  Calendar,
  Send,
  Star,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Lock,
  X,
  AlertTriangle,
} from 'lucide-react';
import { Listing } from '@/types/database';
import QuoteRequestModal from '@/components/quotes/QuoteRequestModal';
import BookingModal from '@/components/booking/BookingModal';
import ReviewModal from '@/components/reviews/ReviewModal';
import { createClient } from '@/lib/supabase/client';

interface ListingActionBoxProps {
  listing: Listing;
}

export default function ListingActionBox({ listing }: ListingActionBoxProps) {
  const [quoteModalOpen, setQuoteModalOpen] = useState(false);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('fotografta_iletisim');
  const [reportNotes, setReportNotes] = useState('');
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportError, setReportError] = useState('');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const supabase = createClient();
      supabase.auth.getUser().then(({ data }) => {
        if (data?.user) setCurrentUserId(data.user.id);
      });
    } catch {}
  }, []);

  const isOwner = !!(
    currentUserId &&
    ((listing.company as any)?.user_id === currentUserId || listing.company_id === currentUserId)
  );

  const companyPhone = listing.company?.phone || '+905320000000';
  const whatsappNumber = (listing.company?.whatsapp || companyPhone).replace(/[^0-9]/g, '');
  const whatsappMessage = encodeURIComponent(
    `Merhaba, ŞantiyeGO üzerinden "${listing.title}" başlıklı ilanınız hakkında bilgi ve teklif almak istiyorum.`
  );

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-orange-500/30 p-6 shadow-xl space-y-5">
        {/* Pricing Info */}
        <div>
          <span className="text-xs font-bold text-slate-400">
            Fiyat Tarifesi
          </span>
          {listing.listing_type === 'sale' ? (
            <div className="mt-1">
              <div className="text-3xl font-black text-navy-900 tracking-tight">
                {listing.price_sale
                  ? `${Number(listing.price_sale).toLocaleString('tr-TR')} ₺`
                  : 'Teklif Alınız'}
              </div>
              <div className="text-xs text-slate-500 font-semibold mt-0.5">
                Satış Fiyatı (KDV vb. detaylar için teklif isteyiniz)
              </div>
            </div>
          ) : (
            <div className="mt-2 space-y-2">
              {listing.price_daily && (
                <div className="flex items-baseline justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Günlük Kiralama</span>
                  <span className="text-2xl font-black text-orange-600">
                    {Number(listing.price_daily).toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              )}
              {listing.price_weekly && (
                <div className="flex items-baseline justify-between py-1 border-b border-slate-100">
                  <span className="text-xs font-bold text-slate-600">Haftalık Kiralama</span>
                  <span className="text-lg font-bold text-navy-900">
                    {Number(listing.price_weekly).toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              )}
              {listing.price_monthly && (
                <div className="flex items-baseline justify-between py-1">
                  <span className="text-xs font-bold text-slate-600">Aylık Kiralama</span>
                  <span className="text-lg font-bold text-navy-900">
                    {Number(listing.price_monthly).toLocaleString('tr-TR')} ₺
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Primary Booking & Quote Actions */}
        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          {listing.listing_type === 'rental' && (
            <button
              type="button"
              onClick={() => setBookingModalOpen(true)}
              className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg transition flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              <span>Tarih seç ve rezervasyon yap</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setQuoteModalOpen(true)}
            className="w-full py-3 px-4 rounded-xl border-2 border-navy-900 hover:bg-navy-900 hover:text-white text-navy-900 font-extrabold text-sm transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 text-orange-500" />
            <span>Teklif iste</span>
          </button>
        </div>

        {/* Kontrollü İletişim & Güvenlik Koruma Kutusu (Prompt 9A) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          {isOwner ? (
            <div className="w-full py-3 px-4 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs flex items-center justify-center gap-2 border border-slate-200 cursor-not-allowed">
              <Lock className="w-4 h-4 text-slate-400" />
              <span>Bu İlan Size Ait (Kendi İlanınıza Mesaj Gönderilemez)</span>
            </div>
          ) : (
            <Link
              href={`/mesajlar?companyId=${listing.company_id || ''}&listingId=${listing.id}&listingTitle=${encodeURIComponent(listing.title)}&companyName=${encodeURIComponent(listingCompanyName(listing))}`}
              className="w-full py-3 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
            >
              <MessageSquare className="w-4 h-4 text-orange-400" />
              <span>Firmaya Mesaj Gönder</span>
            </Link>
          )}

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>ŞantiyeGO İletişim Güvencesi</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              İletişim bilgileri (telefon, WhatsApp ve tam konum), teklif veya rezervasyon onaylandıktan sonra her iki tarafa otomatik paylaşılır.
            </p>
          </div>
        </div>

        {/* Rate / Review Trigger for verified buyers */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <button
            type="button"
            onClick={() => setReviewModalOpen(true)}
            className="hover:text-orange-600 font-semibold inline-flex items-center gap-1.5 transition"
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Firmayı Değerlendir</span>
          </button>

          <button
            type="button"
            onClick={() => setReportModalOpen(true)}
            className="text-[11px] text-slate-400 hover:text-red-600 font-medium inline-flex items-center gap-1 transition"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Şikayet Et</span>
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-600" />
                İlanı Şikayet Et
              </h3>
              <button
                type="button"
                onClick={() => setReportModalOpen(false)}
                className="p-1 rounded text-slate-400 hover:text-navy-900"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {reportSuccess ? (
              <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Bildiriminiz moderatör ekibimize iletildi. İnceleme sonrası gereği yapılacaktır.</span>
              </div>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setReportSubmitting(true);
                  setReportError('');

                  try {
                    const res = await fetch('/api/messages/report', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        listingId: listing.id,
                        reason: reportReason,
                        details: reportNotes,
                      }),
                    });

                    const json = await res.json().catch(() => ({}));
                    if (res.ok && json.success) {
                      setReportSuccess(true);
                      setTimeout(() => {
                        setReportSuccess(false);
                        setReportModalOpen(false);
                        setReportNotes('');
                      }, 2500);
                    } else {
                      setReportError(json.error || 'Şikayet iletilemedi. Lütfen giriş yapınız.');
                    }
                  } catch (err) {
                    setReportError('Bağlantı hatası oluştu.');
                  } finally {
                    setReportSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                {reportError && (
                  <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                    {reportError}
                  </div>
                )}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Şikayet Nedeni (Prompt 9A):
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="fotografta_iletisim">Fotoğrafta telefon / iletişim bilgisi var</option>
                    <option value="iletisim_paylasimi">Başlık / açıklamada numara veya yönlendirme var</option>
                    <option value="fiyat_hatasi">Gerçeği yansıtmayan fiyat veya tonaj</option>
                    <option value="sahte_ilan">Mükerrer veya sahte ilan</option>
                    <option value="diger">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ek Açıklama (İsteğe Bağlı):
                  </label>
                  <textarea
                    rows={3}
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    placeholder="Fotoğraftaki numara, ilan uyuşmazlığı vb."
                    className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t">
                  <button
                    type="button"
                    onClick={() => setReportModalOpen(false)}
                    className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 hover:bg-slate-50"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold shadow-sm"
                  >
                    Şikayeti Gönder
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      <QuoteRequestModal
        listing={listing}
        isOpen={quoteModalOpen}
        onClose={() => setQuoteModalOpen(false)}
      />

      <BookingModal
        listing={listing}
        isOpen={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
      />

      <ReviewModal
        companyId={listing.company_id || 'f0000000-0000-0000-0000-000000000001'}
        companyName={listingCompanyName(listing)}
        listingId={listing.id}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
      />
    </>
  );
}
