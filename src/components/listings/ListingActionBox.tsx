'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  PhoneCall,
  MessageCircle,
  Calendar,
  Send,
  Star,
  ShieldCheck,
  CheckCircle2,
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

        {/* Direct Call & WhatsApp Buttons */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <a
            href={`tel:${companyPhone}`}
            className="w-full py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <PhoneCall className="w-4 h-4 text-navy-900" />
            <span>Firmayı Ara ({companyPhone})</span>
          </a>

          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2"
          >
            <MessageCircle className="w-4 h-4" />
            <span>WhatsApp ile İletişime Geç</span>
          </a>
        </div>

        {/* Rate / Review Trigger for verified buyers */}
        <div className="pt-2 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => setReviewModalOpen(true)}
            className="text-xs text-slate-500 hover:text-orange-600 font-semibold inline-flex items-center gap-1.5 transition"
          >
            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Bu Firmayı Değerlendir & Yorum Yaz</span>
          </button>
        </div>
      </div>

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
