'use client';

import { useState, useEffect, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  Building2,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Banknote,
  CreditCard,
  Lock,
} from 'lucide-react';
import { Booking } from '@/types/database';
import { DEMO_BOOKINGS } from '@/lib/services/booking-service';
import { createClient } from '@/lib/supabase/client';
import { createBookingPaymentSession } from '@/lib/services/payment-service';

export default function BookingPaymentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const bookingId = resolvedParams.id;
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [agreedSuccess, setAgreedSuccess] = useState(false);

  const supabase = createClient();

  // Mode resolution: defaults to 'external' per Rule 4
  const urlMode = searchParams.get('mode');
  const isPlatformMode =
    urlMode === 'platform' || (booking as any)?.payment_mode === 'platform';

  useEffect(() => {
    async function loadBooking() {
      try {
        const isSupabaseConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('bookings')
            .select(`
              *,
              listing:listings(title, category_id, city_id, district_id),
              company:companies(name, phone, address, tax_number, sub_merchant_key),
              buyer:profiles(full_name, phone)
            `)
            .eq('id', bookingId)
            .maybeSingle();

          if (!error && data) {
            setBooking(data as any);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading booking:', err);
      }

      // Fallback to demo booking if enabled
      const allowDemo = process.env.NEXT_PUBLIC_SHOW_DEMO_DATA === 'true';
      if (allowDemo) {
        const found = DEMO_BOOKINGS.find((b) => b.id === bookingId) || DEMO_BOOKINGS[0];
        setBooking(found);
      }
      setLoading(false);
    }

    loadBooking();
  }, [bookingId]);

  const handleConfirmDirectPayment = async () => {
    if (!booking) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isSupabaseConfigured) {
        await supabase
          .from('bookings')
          .update({
            status: 'confirmed',
            notes: 'Müşteri platform dışı doğrudan ödeme mutabakatını onayladı.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', booking.id);
      }

      setAgreedSuccess(true);
      setTimeout(() => {
        router.push('/alici-paneli/rezervasyonlar');
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Onay işlemi tamamlanamadı.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartPlatformEscrowPayment = async () => {
    if (!booking) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const session = await createBookingPaymentSession(booking.id);
      if (session.success && session.paymentUrl) {
        router.push(session.paymentUrl);
      } else {
        setErrorMessage(session.error || 'Ödeme oturumu başlatılamadı.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Ödeme sağlayıcısına bağlanırken hata oluştu.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400 font-bold text-xs">Rezervasyon yükleniyor...</div>;
  }

  if (!booking) {
    return (
      <div className="p-12 text-center space-y-4">
        <h3 className="text-base font-bold text-navy-900">Rezervasyon Bulunamadı</h3>
        <Link href="/alici-paneli/rezervasyonlar" className="text-xs text-orange-600 font-bold hover:underline">
          Rezervasyonlarıma Dön
        </Link>
      </div>
    );
  }

  const totalAmount = booking.total_price || booking.agreed_price || 0;

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/alici-paneli/rezervasyonlar"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Rezervasyonlarıma Dön</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
            {isPlatformMode ? (
              <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Platform Ödeme Güvencesi (Escrow)
              </span>
            ) : (
              <span className="flex items-center gap-1 text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                <Banknote className="w-3.5 h-3.5 text-slate-500" />
                Doğrudan Firma Mutabakatı (Harici)
              </span>
            )}
          </div>
        </div>

        {/* Modal-specific Explanation Notice */}
        {isPlatformMode ? (
          <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-5 sm:p-6 space-y-2 text-emerald-950">
            <div className="flex items-center gap-2 font-black text-sm text-emerald-900">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Platform Ödeme Güvencesi Modu</span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Ödemeniz doğrudan satıcıya aktarılmaz; iş tamamlanıp teslim edilene ve siz onay verene kadar <strong>iyzico lisanslı havuz hesabında bloke tutulur</strong>. Teslimat sonrası 72 saatlik kontrol süreniz bulunmaktadır.
            </p>
            <div className="pt-1">
              <Link
                href="/odeme-guvencesi-ve-itiraz-kosullari"
                target="_blank"
                className="text-[11px] font-bold text-emerald-900 underline"
              >
                Ödeme Güvencesi ve İtiraz Koşulları Sözleşmesini İnceleyin →
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 sm:p-6 space-y-2 text-amber-950">
            <div className="flex items-center gap-2 font-black text-sm text-amber-900">
              <Banknote className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Platform Dışı Doğrudan Ödeme Modu</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Şantiye GO şu anda varsayılan olarak <strong>Platform Dışı Doğrudan Ödeme (Havale / Şantiyede Teslim)</strong> modelinde hizmet vermektedir. Anlaşılan tutar doğrudan tedarikçi firma ile aranızda mutabık kalınarak ödenir.
            </p>
          </div>
        )}

        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {agreedSuccess ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <CheckCircle2 className="w-9 h-9" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-navy-900">Mutabakat Onaylandı!</h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Rezervasyon kaydınız başarıyla oluşturuldu. Tedarikçi firma yetkilisi şantiye teslimatı ve ödeme detayları için sizinle iletişime geçecektir.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Rezervasyon Özeti */}
            <div className="border-b border-slate-100 pb-5 space-y-3">
              <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider block">
                Rezervasyon & Hizmet Detayı
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-navy-900">
                {booking.listing?.title || 'Kiralama / Hizmet Talebi'}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 font-semibold pt-1">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-orange-500" />
                  {booking.start_date} → {booking.end_date} ({booking.total_days || 1} Gün)
                </span>
                <span className="flex items-center gap-1.5">
                  <Building2 className="w-4 h-4 text-navy-800" />
                  {booking.company?.name || 'Tedarikçi Firma'}
                </span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  {booking.company?.phone || 'Telefon Kayıtlı'}
                </span>
              </div>
            </div>

            {/* Tutar & Mutabakat Koşulları */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600">Hizmet / Kiralama Bedeli:</span>
                <span className="text-2xl font-black text-navy-900">
                  {totalAmount.toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div className="text-[11px] text-slate-500 space-y-1 pt-2 border-t border-slate-200">
                <p>• Bu tutar KDV dahil nihai anlaşma tutarıdır.</p>
                {isPlatformMode ? (
                  <p>• 3D Secure kredi kartı / banka kartı ile güvenle tahsil edilir ve iş teslimine kadar iyzico havuzunda bloke kalır.</p>
                ) : (
                  <p>• Ödeme yöntemi (Banka Havalesi / Şantiyede Nakit / Hakediş) firma ile mutabık kalınarak ödenir.</p>
                )}
              </div>
            </div>

            {/* Onay Butonu */}
            <div className="pt-2">
              {isPlatformMode ? (
                <button
                  type="button"
                  onClick={handleStartPlatformEscrowPayment}
                  disabled={isProcessing}
                  className="w-full py-4 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm tracking-wide shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Güvenli Ödeme Sayfasına Yönlendiriliyor...
                    </span>
                  ) : (
                    <>
                      <Lock className="w-5 h-5" />
                      <span>3D SECURE İLE GÜVENLİ ÖDE (İYZİCO HAVUZ KORUMASI)</span>
                    </>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmDirectPayment}
                  disabled={isProcessing}
                  className="w-full py-4 px-6 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm tracking-wide shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      Rezervasyon Onaylanıyor...
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 className="w-5 h-5" />
                      <span>MUTABAKATI ONAYLA VE REZERVASYONU BAŞLAT</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
