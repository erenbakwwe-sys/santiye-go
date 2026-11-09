'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShieldCheck,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Building2,
  Banknote,
  CreditCard,
  Lock,
} from 'lucide-react';
import { DEMO_BOOKINGS } from '@/lib/services/booking-service';
import { BookingWithDetails } from '@/lib/services/booking-service';
import { createClient } from '@/lib/supabase/client';
import { getPlatformEscrowSettings, createEscrowPaymentSession, confirmEscrowPaymentPaid } from '@/lib/services/escrow-service';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agreedSuccess, setAgreedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [paymentModeChoice, setPaymentModeChoice] = useState<'platform' | 'external'>('platform');
  const [isPlatformModeAvailable, setIsPlatformModeAvailable] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const settings = await getPlatformEscrowSettings();

        const isSupabaseConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (isSupabaseConfigured) {
          const { data, error } = await supabase
            .from('bookings')
            .select(`
              *,
              listing:listings(title, images),
              company:companies(name, phone, address, tax_number, accept_platform_escrow, sub_merchant_key),
              buyer:profiles(full_name, phone)
            `)
            .eq('id', bookingId)
            .maybeSingle();

          if (!error && data) {
            setBooking(data as any);
            const canUseEscrow = settings.payment_mode === 'platform' && Boolean(data.company?.accept_platform_escrow || data.company?.sub_merchant_key);
            setIsPlatformModeAvailable(canUseEscrow);
            setPaymentModeChoice(canUseEscrow ? 'platform' : 'external');
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.error('Error loading booking:', err);
      }

      // Fallback Demo
      const found = DEMO_BOOKINGS.find((b) => b.id === bookingId) || DEMO_BOOKINGS[0];
      setBooking(found);
      // Demo modda her iki opsiyon da denenebilir
      setIsPlatformModeAvailable(true);
      setPaymentModeChoice('platform');
      setLoading(false);
    }

    loadData();
  }, [bookingId]);

  const handleProcessPayment = async () => {
    if (!booking) return;

    setIsProcessing(true);
    setErrorMessage('');

    try {
      if (paymentModeChoice === 'platform') {
        // Platform Ödeme Güvencesi (Escrow)
        const session = await createEscrowPaymentSession({
          bookingId: booking.id,
          buyerId: booking.buyer_id || 'buyer-demo-001',
          paymentModeRequested: 'platform',
        });

        if (!session.success || !session.transaction) {
          throw new Error(session.error || 'Ödeme oturumu başlatılamadı.');
        }

        // Simüle 3D Secure Başarısı
        await confirmEscrowPaymentPaid(session.transaction.id, session.transaction.provider_payment_id || `iyz-${Date.now()}`);

        setAgreedSuccess(true);
        setTimeout(() => {
          router.push('/alici-paneli/rezervasyonlar');
        }, 2200);
      } else {
        // Doğrudan Platform Dışı Ödeme Mutabakatı
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
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'İşlem tamamlanamadı.');
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
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>{paymentModeChoice === 'platform' ? 'Platform Ödeme Güvencesi (Escrow)' : 'Doğrudan Mutabakat'}</span>
          </div>
        </div>

        {/* Ödeme Modu Seçim Kutusu */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 space-y-4 shadow-sm">
          <h2 className="text-base font-black text-navy-900">Ödeme Yöntemi Seçin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Platform Escrow Seçeneği */}
            <div
              onClick={() => isPlatformModeAvailable && setPaymentModeChoice('platform')}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer relative ${
                paymentModeChoice === 'platform'
                  ? 'border-emerald-500 bg-emerald-50/40'
                  : 'border-slate-200 hover:border-slate-300'
              } ${!isPlatformModeAvailable ? 'opacity-60 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-sm text-navy-900">
                  <Lock className="w-4 h-4 text-emerald-600" />
                  <span>Platform Ödeme Güvencesi</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                  Havuz Koruması
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Paranız iş tamamlanana kadar <strong>iyzico emanet havuzunda</strong> bloke edilir. İş sahada teslim edilip siz onay verince firmaya aktarılır.
              </p>
            </div>

            {/* Platform Dışı Doğrudan Ödeme Seçeneği */}
            <div
              onClick={() => setPaymentModeChoice('external')}
              className={`p-4 rounded-2xl border-2 transition cursor-pointer relative ${
                paymentModeChoice === 'external'
                  ? 'border-orange-500 bg-orange-50/40'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-black text-sm text-navy-900">
                  <Banknote className="w-4 h-4 text-orange-600" />
                  <span>Platform Dışı Doğrudan</span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-slate-100 text-slate-700">
                  Elden / Havale
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Platform üzerinden kart çekilmez. Anlaşılan tutar firma ile aranızda doğrudan mutabık kalınarak ödenir.
              </p>
            </div>
          </div>
        </div>

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
              <h2 className="text-2xl font-black text-navy-900">
                {paymentModeChoice === 'platform' ? 'Ödeme Korumalı Havuzda Bloke Edildi!' : 'Mutabakat Onaylandı!'}
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {paymentModeChoice === 'platform'
                  ? 'Tutar iyzico korumalı havuzuna başarıyla alındı. Makine teslim edilip iş tamamlandığında Alıcı Paneli üzerinden "İşi Onayla ve Ödemeyi Serbest Bırak" butonuna basarak aktarımı gerçekleştirebilirsiniz.'
                  : 'Rezervasyon kaydınız başarıyla oluşturuldu. Tedarikçi firma yetkilisi teslimat ve doğrudan ödeme detayları için iletişime geçecektir.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            {/* Rezervasyon Özeti */}
            <div className="border-b border-slate-100 pb-5 space-y-3">
              <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider block">
                Rezervasyon Dökümü
              </span>
              <h2 className="text-xl font-black text-navy-900">{booking.listing?.title}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span>
                    {booking.start_date} → {booking.end_date}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>{booking.site_address || 'İstanbul / Kadıköy'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span>{booking.company?.name}</span>
                </div>
              </div>
            </div>

            {/* Tutar Özeti */}
            <div className="bg-slate-50 rounded-2xl p-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-bold block">Toplam İş Bedeli</span>
                <span className="text-2xl font-black text-navy-900">
                  {totalAmount.toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-black">
                  {paymentModeChoice === 'platform' ? 'Platform Güvenceli' : 'Doğrudan'}
                </span>
              </div>
            </div>

            {paymentModeChoice === 'platform' && (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/60 text-emerald-950 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-900">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Platform Ödeme Güvencesi Kapsamındasınız</span>
                </div>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  Ödemeniz 3D Secure ile alınacak ve iş tamamlanana kadar lisanslı ödeme kuruluşu nezdinde bloke tutulacaktır. İş bitiminde onaylamadığınız veya itiraz ettiğiniz takdirde para aktarımı durdurulur.
                </p>
                <Link href="/odeme-guvencesi" target="_blank" className="text-[11px] font-bold text-emerald-700 underline block mt-1">
                  Ödeme Güvencesi ve İtiraz Koşullarını İncele →
                </Link>
              </div>
            )}

            <button
              onClick={handleProcessPayment}
              disabled={isProcessing}
              className={`w-full py-4 rounded-2xl font-black text-sm text-white transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
                paymentModeChoice === 'platform'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/25'
              }`}
            >
              {isProcessing ? (
                <span>İşleniyor...</span>
              ) : paymentModeChoice === 'platform' ? (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>3D Secure ile Havuzda Bloke Et ({totalAmount.toLocaleString('tr-TR')} ₺)</span>
                </>
              ) : (
                <>
                  <Banknote className="w-5 h-5" />
                  <span>Doğrudan Ödeme Mutabakatını Onayla</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
