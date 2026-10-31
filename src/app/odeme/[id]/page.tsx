'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  ShieldCheck,
  Lock,
  Calendar,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Info,
  Clock,
  Sparkles,
} from 'lucide-react';
import { DEMO_BOOKINGS } from '@/lib/services/booking-service';
import {
  createBookingPaymentSession,
  processPaymentSuccess,
} from '@/lib/services/payment-service';
import { formatCentsToTRY } from '@/lib/services/commission-service';
import { BookingWithDetails } from '@/lib/services/booking-service';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [booking, setBooking] = useState<BookingWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Credit Card Form State
  const [cardHolder, setCardHolder] = useState('AHMET YILMAZ');
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242');
  const [expiry, setExpiry] = useState('12/28');
  const [cvc, setCvc] = useState('123');

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const found = DEMO_BOOKINGS.find((b) => b.id === bookingId) || DEMO_BOOKINGS[0];
    setBooking(found);
    setLoading(false);
  }, [bookingId]);

  const handleFillTestCard = () => {
    setCardHolder('AHMET YILMAZ');
    setCardNumber('4242 4242 4242 4242');
    setExpiry('12/28');
    setCvc('123');
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;

    setIsProcessing(true);
    setErrorMessage('');

    // 1. Create payment session
    const session = await createBookingPaymentSession(booking.id);
    if (!session.success || !session.transaction) {
      setErrorMessage(session.error || 'Ödeme oturumu başlatılamadı.');
      setIsProcessing(false);
      return;
    }

    // 2. Simulate 3D Secure verification with iyzico sandbox
    setTimeout(async () => {
      const lastFour = cardNumber.replace(/\s/g, '').slice(-4) || '4242';
      await processPaymentSuccess(session.transaction!.id, lastFour);

      setIsProcessing(false);
      setPaymentSuccess(true);

      setTimeout(() => {
        router.push('/alici-paneli/rezervasyonlar');
      }, 2500);
    }, 1500);
  };

  if (loading || !booking) {
    return <div className="p-12 text-center text-slate-400">Yükleniyor...</div>;
  }

  const totalAmount = booking.total_price || booking.agreed_price || 0;

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/alici-paneli/rezervasyonlar"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Rezervasyonlarıma Dön
          </Link>
          <span className="px-2.5 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-bold flex items-center gap-1">
            <Lock className="w-3.5 h-3.5" />
            256-Bit SSL iyzico Güvenli Ödeme
          </span>
        </div>

        {/* Success Alert */}
        {paymentSuccess && (
          <div className="p-6 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-2xl shadow-lg flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="text-lg font-black">Ödemeniz Başarıyla Alındı! (3D Secure Onaylandı)</h2>
              <p className="text-xs text-emerald-700 leading-relaxed">
                Tutarınız iyzico güvenceli havuz hesabında bloke edildi. Şantiyenize makine teslim edilene kadar paranız korunur. Rezervasyonlarım sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Credit Card Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-7 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <h1 className="text-xl font-black text-navy-900 flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-orange-500" />
                    3D Secure Kredi / Banka Kartı
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kart bilgileriniz veritabanında saklanmaz; doğrudan iyzico altyapısına iletilir.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleFillTestCard}
                  className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold text-[11px] border border-orange-200 flex items-center gap-1 transition"
                  title="Sandbox test kartını otomatik doldur"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Test Kartı Doldur
                </button>
              </div>

              {errorMessage && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Virtual Card Graphic */}
              <div className="bg-gradient-to-tr from-navy-950 via-navy-900 to-slate-800 rounded-2xl p-5 text-white shadow-xl space-y-4 relative overflow-hidden">
                <div className="absolute right-0 top-0 translate-x-4 -translate-y-4 w-32 h-32 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-widest uppercase font-bold text-slate-300">
                    ŞANTİYE GO GÜVENLİ ÖDEME
                  </span>
                  <span className="font-mono text-xs font-bold text-orange-400">iyzico</span>
                </div>
                <div className="font-mono text-lg tracking-widest py-2">
                  {cardNumber || '•••• •••• •••• ••••'}
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[9px] uppercase text-slate-400">Kart Sahibi</div>
                    <div className="font-bold tracking-wide">{cardHolder || 'AD SOYAD'}</div>
                  </div>
                  <div>
                    <div className="text-[9px] uppercase text-slate-400">Son Kullanma</div>
                    <div className="font-bold tracking-wide font-mono">{expiry || 'AA/YY'}</div>
                  </div>
                </div>
              </div>

              {/* Card Inputs Form */}
              <form onSubmit={handlePaymentSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kart Üzerindeki İsim Soyisim *
                  </label>
                  <input
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value.toUpperCase())}
                    placeholder="AHMET YILMAZ"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kart Numarası *</label>
                  <input
                    type="text"
                    required
                    maxLength={19}
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="4242 •••• •••• 4242"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">
                      Son Kullanma Tarihi *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={5}
                      value={expiry}
                      onChange={(e) => setExpiry(e.target.value)}
                      placeholder="AA/YY"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Güvenlik Kodu (CVC) *</label>
                    <input
                      type="password"
                      required
                      maxLength={4}
                      value={cvc}
                      onChange={(e) => setCvc(e.target.value)}
                      placeholder="•••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500 font-mono text-center"
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isProcessing || paymentSuccess}
                    className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm tracking-wide shadow-lg shadow-orange-500/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    <span>
                      {isProcessing
                        ? '3D Secure Doğrulanıyor...'
                        : `${totalAmount.toLocaleString('tr-TR')} ₺ GÜVENLİ ÖDE`}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Order Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold text-navy-900 border-b pb-3 uppercase tracking-wider text-slate-400 text-[10px]">
                Sipariş & Rezervasyon Özeti
              </h2>

              <div>
                <h3 className="font-extrabold text-navy-900 text-base leading-snug">
                  {booking.listing?.title}
                </h3>
                <div className="text-xs text-slate-500 mt-0.5">
                  Tedarikçi: {booking.company_name}
                </div>
              </div>

              <div className="space-y-2 py-3 border-y border-slate-100 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-orange-500" />
                    Kiralama Tarihleri:
                  </span>
                  <span className="font-bold text-navy-900">
                    {booking.start_date} → {booking.end_date}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-orange-500" />
                    Şantiye Teslimatı:
                  </span>
                  <span className="font-bold text-navy-900 truncate max-w-[180px]">
                    {booking.site_address}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Operatör / Yakıt:</span>
                  <span className="font-bold text-navy-900">
                    {booking.operator_included ? 'Operatör Dahil' : 'Operatörsüz'}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <span className="font-bold text-slate-600 text-xs">Ödenecek Toplam Tutar:</span>
                <span className="text-2xl font-black text-navy-900">
                  {totalAmount.toLocaleString('tr-TR')} ₺
                </span>
              </div>
            </div>

            {/* Escrow Guarantee Trust Banner */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2 text-xs text-slate-600">
              <div className="font-bold text-navy-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Şantiye GO Havuz Hesabı Koruması
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Ödemeniz makine şantiyenize ulaşıp iş başlayana kadar iyzico havuzunda tutulur. Tedarikçi makineyi getirmez veya şartlara uymazsa kesintisiz iade hakkınız saklıdır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
