'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Calendar,
  Layers,
  MapPin,
  ShieldCheck,
  CreditCard,
  AlertCircle,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { DEFAULT_AD_PRODUCTS, createAdCampaign, payAdCampaignWithSandbox } from '@/lib/services/ad-service';
import { DEMO_LISTINGS } from '@/lib/services/listing-service';
import { AdProductId, AdProduct } from '@/types/database';

export default function PromoteListingPage() {
  const router = useRouter();
  const companyId = 'f0000000-0000-0000-0000-000000000001';
  const myListings = DEMO_LISTINGS.filter((l) => l.company_id === companyId);

  const [selectedProductId, setSelectedProductId] = useState<AdProductId>('sponsored_listing');
  const [selectedListingId, setSelectedListingId] = useState<string>(myListings[0]?.id || '');
  const [durationDays, setDurationDays] = useState<number>(7);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selectedProduct = DEFAULT_AD_PRODUCTS.find((p) => p.id === selectedProductId) || DEFAULT_AD_PRODUCTS[0];
  const selectedListing = myListings.find((l) => l.id === selectedListingId);

  // Active membership plan discount (e.g., 10% for Pro)
  const discountPercent = 10;

  // Calculate pricing
  const basePriceCents =
    durationDays === 14
      ? selectedProduct.price_14_days_cents
      : durationDays === 30
      ? selectedProduct.price_30_days_cents
      : selectedProduct.price_7_days_cents;

  const discountCents = Math.round((basePriceCents * discountPercent) / 100);
  const netPayableCents = basePriceCents - discountCents;

  const formatTRY = (cents: number) => {
    return (cents / 100).toLocaleString('tr-TR', { minimumFractionDigits: 2 }) + ' ₺';
  };

  const handlePurchase = async () => {
    if (!selectedListingId && selectedProductId !== 'featured_company') {
      alert('Lütfen öne çıkarılacak ilanınızı seçin.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createAdCampaign({
        companyId,
        productId: selectedProductId,
        listingId: selectedListingId || undefined,
        title: `${selectedListing?.title || 'Firma'} - ${selectedProduct.name}`,
        targetCityId: selectedListing?.city_id || 34,
        targetCategoryId: selectedListing?.category_id,
        durationDays,
        discountPercent,
      });

      if (res.success && res.campaign) {
        // Trigger sandbox payment
        await payAdCampaignWithSandbox(res.campaign.id);
        setSuccessMessage('Reklam kampanyanız başarıyla oluşturuldu ve ödemesi sandbox ile onaylandı! Admin moderasyonu ardından anında yayına alınacaktır.');
        setTimeout(() => {
          router.push('/firma-paneli/reklamlarim');
        }, 2500);
      } else {
        alert(res.error || 'Kampanya oluşturulamadı.');
      }
    } catch (e: any) {
      alert(e.message || 'İşlem başarısız.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Back button & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/firma-paneli"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Firma Paneline Dön
          </Link>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-500" />
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
              İlanını & Firmanı Öne Çıkar
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Müteahhitlerin ve şantiye şeflerinin aramalarında ilk sırada görünün, teklif ve kiralama taleplerinizi 3 kata kadar artırın.
          </p>
        </div>

        <Link
          href="/firma-paneli/reklamlarim"
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center justify-center gap-1.5"
        >
          <Layers className="w-4 h-4" />
          Aktif Kampanyalarım
        </Link>
      </div>

      {successMessage ? (
        <div className="p-8 bg-emerald-50 border border-emerald-300 rounded-3xl text-center space-y-4 shadow-sm animate-fade-in">
          <CheckCircle2 className="w-16 h-16 text-emerald-600 mx-auto" />
          <h2 className="text-xl font-black text-emerald-950">Ödeme Başarılı! (iyzico Sandbox)</h2>
          <p className="text-sm text-emerald-800 max-w-lg mx-auto">
            {successMessage}
          </p>
          <p className="text-xs text-slate-500">Reklamlarım sayfasına yönlendiriliyorsunuz...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Left: Product & Duration Selectors */}
          <div className="lg:col-span-2 space-y-6">
            {/* Step 1: Product Selection */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">1</span>
                  Öne Çıkarma Ürünü Seçin
                </h2>
                <span className="text-[11px] font-bold text-slate-500">Slot Kapasiteli</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DEFAULT_AD_PRODUCTS.map((prod) => {
                  const isSelected = prod.id === selectedProductId;
                  return (
                    <button
                      key={prod.id}
                      type="button"
                      onClick={() => setSelectedProductId(prod.id)}
                      className={`text-left p-4 rounded-xl border transition relative flex flex-col justify-between ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/40 ring-2 ring-orange-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-black text-navy-900 text-sm">{prod.name}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-orange-500" />}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {prod.description}
                        </p>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="text-slate-500">Başlangıç:</span>
                        <span className="font-black text-navy-900">{formatTRY(prod.price_7_days_cents)}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2: Listing Selection */}
            {selectedProductId !== 'featured_company' && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
                <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">2</span>
                  Öne Çıkarılacak İlanınızı Seçin
                </h2>

                <div className="space-y-2">
                  {myListings.map((listing) => {
                    const isSelected = listing.id === selectedListingId;
                    return (
                      <label
                        key={listing.id}
                        className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition ${
                          isSelected
                            ? 'border-orange-500 bg-orange-50/30'
                            : 'border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="radio"
                          name="selected_listing"
                          value={listing.id}
                          checked={isSelected}
                          onChange={() => setSelectedListingId(listing.id)}
                          className="accent-orange-500 w-4 h-4"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-navy-900 text-xs sm:text-sm truncate">
                            {listing.title}
                          </p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-orange-500" />
                              {listing.address_detail || 'İstanbul'}
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-navy-900">
                              {listing.price_daily?.toLocaleString('tr-TR')} ₺/gün
                            </span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 3: Duration Selector */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-sm">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">3</span>
                Yayın Süresini Seçin
              </h2>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { days: 7, label: '7 Günlük', discount: '' },
                  { days: 14, label: '14 Günlük', discount: '%10 İndirimli' },
                  { days: 30, label: '30 Günlük', discount: '%25 Avantajlı' },
                ].map((dur) => {
                  const isSelected = durationDays === dur.days;
                  const price =
                    dur.days === 14
                      ? selectedProduct.price_14_days_cents
                      : dur.days === 30
                      ? selectedProduct.price_30_days_cents
                      : selectedProduct.price_7_days_cents;

                  return (
                    <button
                      key={dur.days}
                      type="button"
                      onClick={() => setDurationDays(dur.days)}
                      className={`p-4 rounded-xl border text-center transition relative ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/50 ring-2 ring-orange-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {dur.discount && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-emerald-600 text-[9px] font-black text-white">
                          {dur.discount}
                        </span>
                      )}
                      <div className="font-extrabold text-navy-900 text-sm">{dur.label}</div>
                      <div className="text-xs font-black text-orange-600 mt-1">
                        {formatTRY(price)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Checkout & Price Summary Card */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl space-y-6 sticky top-6">
            <h2 className="text-lg font-black text-navy-900 border-b pb-3">
              Sipariş Özeti
            </h2>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center text-slate-600">
                <span>Seçilen Ürün:</span>
                <span className="font-bold text-navy-900 text-right">{selectedProduct.name}</span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Yayın Süresi:</span>
                <span className="font-bold text-navy-900">{durationDays} Gün</span>
              </div>

              {selectedListing && (
                <div className="flex justify-between items-start text-slate-600 pt-2 border-t">
                  <span>Hedef İlan:</span>
                  <span className="font-semibold text-navy-900 text-right max-w-[160px] truncate">
                    {selectedListing.title}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center text-slate-600 pt-2 border-t">
                <span>Paket Liste Fiyatı:</span>
                <span className="font-semibold text-slate-800">{formatTRY(basePriceCents)}</span>
              </div>

              <div className="flex justify-between items-center text-emerald-700 font-medium">
                <span>Profesyonel Üyelik İndirimi (%{discountPercent}):</span>
                <span>-{formatTRY(discountCents)}</span>
              </div>

              <div className="pt-3 border-t-2 border-slate-900 flex justify-between items-center">
                <span className="font-black text-navy-900 text-base">Toplam Tutar:</span>
                <span className="text-xl font-black text-orange-600">
                  {formatTRY(netPayableCents)}
                </span>
              </div>
            </div>

            {/* Sandbox Notice Banner */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong>Sandbox Test Modu:</strong>
                <p className="text-[11px] text-blue-800 mt-0.5">
                  Ödeme iyzico sandbox test ortamı üzerinden güvenle simüle edilir. Gerçek kredi kartınızdan para çekilmez.
                </p>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handlePurchase}
              className="w-full py-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-black text-sm tracking-wide shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>İşleniyor...</span>
              ) : (
                <>
                  <CreditCard className="w-5 h-5" />
                  <span>ÖDEME YAP VE YAYINA GÖNDER</span>
                </>
              )}
            </button>

            <p className="text-[11px] text-slate-500 text-center">
              Satın alarak <Link href="/reklam-kosullari" target="_blank" className="underline hover:text-navy-900">Reklam Şartları</Link>&apos;nı kabul etmiş sayılırsınız. Reddedilen reklamlar %100 tam iade edilir.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
