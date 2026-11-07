'use client';

import { useState } from 'react';
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

  const companyPhone = listing.company?.phone || '+905320000000';
  const whatsappNumber = (listing.company?.whatsapp || companyPhone).replace(/[^0-9]/g, '');
  const whatsappMessage = encodeURIComponent(
    `Merhaba, Şantiye GO üzerinden "${listing.title}" başlıklı ilanınız hakkında bilgi ve teklif almak istiyorum.`
  );

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-orange-500/30 p-6 shadow-xl space-y-5">
        {/* Pricing Info */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
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
              className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg shadow-orange-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2"
            >
              <Calendar className="w-5 h-5" />
              <span>TARİH SEÇ & REZERVASYON YAP</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setQuoteModalOpen(true)}
            className="w-full py-3 px-4 rounded-xl border-2 border-navy-900 hover:bg-navy-900 hover:text-white text-navy-900 font-extrabold text-sm transition flex items-center justify-center gap-2"
          >
            <Send className="w-4 h-4 text-orange-500" />
            <span>DOĞRUDAN TEKLİF İSTE</span>
          </button>
        </div>

        {/* Kontrollü İletişim & Güvenlik Koruma Kutusu (Prompt 9A) */}
        <div className="space-y-3 pt-2 border-t border-slate-100">
          <Link
            href={`/mesajlar?companyId=${listing.company_id || ''}&listingId=${listing.id}`}
            className="w-full py-3 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 shadow-sm"
          >
            <MessageSquare className="w-4 h-4 text-orange-400" />
            <span>Firmaya Mesaj Gönder</span>
          </Link>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Şantiye GO İletişim Güvencesi</span>
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
                onSubmit={(e) => {
                  e.preventDefault();
                  setReportSuccess(true);
                  setTimeout(() => {
                    setReportSuccess(false);
                    setReportModalOpen(false);
                  }, 2000);
                }}
                className="space-y-4"
              >
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
        companyName={listing.company?.name || 'Onaylı Tedarikçi'}
        listingId={listing.id}
        isOpen={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
      />
    </>
  );
}
