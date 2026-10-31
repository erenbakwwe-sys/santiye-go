'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { MapPin, Heart, ShieldCheck, CheckCircle2, Scale, Sparkles } from 'lucide-react';
import { Listing } from '@/types/database';
import { recordAdClick } from '@/lib/services/ad-service';

interface ListingCardProps {
  listing: Listing;
  onFavoriteToggle?: (id: string, isFav: boolean) => void;
  isFavorited?: boolean;
  isCompareSelected?: boolean;
  onCompareToggle?: (id: string) => void;
}

export default function ListingCard({
  listing,
  onFavoriteToggle,
  isFavorited = false,
  isCompareSelected = false,
  onCompareToggle,
}: ListingCardProps) {
  const [fav, setFav] = useState(isFavorited);

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !fav;
    setFav(next);
    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id, next);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCompareToggle) {
      onCompareToggle(listing.id);
    }
  };

  // Price formatting helper
  const renderPrice = () => {
    // Service or Custom Quote Pricing
    if (listing.listing_type === 'service' || listing.pricing_type === 'custom_quote') {
      if (listing.pricing_type === 'unit_rate' && (listing.price_daily || listing.price_sale)) {
        const rate = listing.price_daily || listing.price_sale || 0;
        return (
          <div>
            <div className="text-lg sm:text-xl font-black text-orange-600 tracking-tight">
              {Number(rate).toLocaleString('tr-TR')} ₺
              <span className="text-[11px] font-semibold text-slate-500 ml-1">
                / {listing.price_unit || 'm²'}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">Birim Hizmet Fiyatı</div>
          </div>
        );
      }
      return (
        <div>
          <div className="text-base sm:text-lg font-black text-navy-900 tracking-tight">
            Teklife Göre
          </div>
          <div className="text-[10px] text-slate-500 font-semibold">Keşif & Proje Bazlı</div>
        </div>
      );
    }

    if (listing.listing_type === 'sale') {
      if (listing.price_sale) {
        return (
          <div>
            <div className="text-lg sm:text-xl font-black text-navy-900 tracking-tight">
              {Number(listing.price_sale).toLocaleString('tr-TR')} ₺
            </div>
            <div className="text-[10px] text-slate-500 font-semibold">Satış Fiyatı</div>
          </div>
        );
      }
      return <div className="text-xs font-bold text-slate-500">Teklif Alınız</div>;
    }

    // Rental
    if (listing.price_daily) {
      return (
        <div>
          <div className="text-lg sm:text-xl font-black text-orange-600 tracking-tight">
            {Number(listing.price_daily).toLocaleString('tr-TR')} ₺
            <span className="text-[11px] font-semibold text-slate-500 ml-1">/ gün</span>
          </div>
          {listing.price_monthly && (
            <div className="text-[10px] text-slate-500 font-medium">
              Aylık: {Number(listing.price_monthly).toLocaleString('tr-TR')} ₺
            </div>
          )}
        </div>
      );
    }

    if (listing.price_monthly) {
      return (
        <div>
          <div className="text-lg sm:text-xl font-black text-orange-600 tracking-tight">
            {Number(listing.price_monthly).toLocaleString('tr-TR')} ₺
            <span className="text-[11px] font-semibold text-slate-500 ml-1">/ ay</span>
          </div>
        </div>
      );
    }

    return <div className="text-xs font-bold text-slate-500">Fiyat Sorunuz</div>;
  };

  const imageSrc =
    listing.images && listing.images.length > 0
      ? listing.images[0]
      : 'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80';

  return (
    <div
      className={`group bg-white rounded-xl border overflow-hidden shadow-sm hover:shadow-lg transition-all duration-200 flex flex-col justify-between ${
        isCompareSelected
          ? 'border-orange-500 ring-2 ring-orange-500/20'
          : listing.is_sponsored
          ? 'border-amber-300 ring-1 ring-amber-300/40 bg-gradient-to-b from-amber-50/20 to-white'
          : 'border-slate-200'
      }`}
    >
      <div>
        {/* Card Image Banner */}
        <div className="relative aspect-[16/10] bg-slate-100 overflow-hidden">
          <Image
            src={imageSrc}
            alt={listing.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Badges on Image */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
            {listing.is_sponsored && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-sm flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-white" />
                Sponsorlu
              </span>
            )}
            {listing.is_demo && (
              <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-red-600 text-white shadow-sm">
                DEMO
              </span>
            )}
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide text-white shadow-sm ${
                listing.listing_type === 'rental'
                  ? 'bg-navy-900'
                  : listing.listing_type === 'service'
                  ? 'bg-purple-700'
                  : 'bg-emerald-700'
              }`}
            >
              {listing.listing_type === 'rental' ? 'Kiralık' : listing.listing_type === 'service' ? 'Hizmet' : 'Satılık'}
            </span>
            {listing.has_license_document && (
              <span
                className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-600 text-white shadow-sm flex items-center gap-0.5"
                title="Yetki / Mesleki Yeterlilik Belgesi Mevcut"
              >
                ✓ Belgeli
              </span>
            )}
          </div>

          {/* Top Right Actions: Compare & Favorite */}
          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10">
            {onCompareToggle && (
              <button
                type="button"
                onClick={handleCompareClick}
                className={`p-1.5 rounded-full backdrop-blur-md transition shadow-md text-xs flex items-center justify-center ${
                  isCompareSelected
                    ? 'bg-orange-500 text-white font-bold'
                    : 'bg-white/85 text-slate-700 hover:bg-white hover:text-orange-600'
                }`}
                title="Karşılaştırmaya Ekle / Çıkar"
                aria-label="Karşılaştır"
              >
                <Scale className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={handleFavClick}
              className={`p-1.5 rounded-full backdrop-blur-md transition shadow-md ${
                fav
                  ? 'bg-red-500 text-white'
                  : 'bg-white/85 text-slate-700 hover:bg-white hover:text-red-500'
              }`}
              title="Favoriye Ekle / Çıkar"
              aria-label="Favori"
            >
              <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Distance Badge if available */}
          {listing.distance_km !== undefined && (
            <div className="absolute bottom-2.5 left-2.5 px-2 py-0.5 rounded-md bg-navy-950/85 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1 shadow-md">
              <MapPin className="w-3 h-3 text-orange-400" />
              <span>{listing.distance_km} km mesafede</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-3.5 space-y-2">
          {/* Location & Category Header */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span className="flex items-center gap-1 text-slate-700 font-semibold truncate text-[11px]">
              <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
              {listing.city_name || 'Türkiye'}
              {listing.district_name ? `, ${listing.district_name}` : ''}
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-bold shrink-0">
              {listing.category?.name || 'Genel'}
            </span>
          </div>

          {/* Title */}
          <Link
            href={`/ilan/${listing.slug || listing.id}`}
            onClick={() => {
              if (listing.ad_campaign_id) {
                recordAdClick(listing.ad_campaign_id);
              }
            }}
          >
            <h3 className="font-bold text-navy-900 text-sm line-clamp-2 hover:text-orange-600 transition leading-snug">
              {listing.title}
            </h3>
          </Link>

          {/* Inclusions Tags */}
          <div className="flex flex-wrap gap-1 text-[10px]">
            {listing.is_operator_included && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 font-semibold border border-amber-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-amber-600" />
                Operatörlü
              </span>
            )}
            {listing.is_transport_included && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 font-semibold border border-blue-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-blue-600" />
                Nakliye Dahil
              </span>
            )}
            {listing.is_fuel_included && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">
                <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                Yakıt Dahil
              </span>
            )}
          </div>

          {/* Company Name */}
          <div className="pt-0.5 text-[11px] text-slate-500 flex items-center gap-1 truncate">
            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
            <span className="truncate">{listing.company?.name || 'Onaylı Tedarikçi'}</span>
          </div>
        </div>
      </div>

      {/* Footer Pricing & CTA Button */}
      <div className="p-3 pt-2.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div>{renderPrice()}</div>
        <Link
          href={`/ilan/${listing.slug || listing.id}`}
          className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-orange-500 text-white text-[11px] font-bold transition shadow-sm"
        >
          Detay
        </Link>
      </div>
    </div>
  );
}
