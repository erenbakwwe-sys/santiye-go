'use client';

import Image from 'next/image';
import { formatDistance, listingCompanyName } from '@/lib/utils/listing-display';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Heart, Scale, CameraOff } from 'lucide-react';
import { unitRatePrice } from '@/lib/utils/listing-price';
import { Listing } from '@/types/database';
import { recordAdClick } from '@/lib/services/ad-service';
import { createClient } from '@/lib/supabase/client';
import {
  FAVORITES_STORAGE_KEY,
  parseFavoriteList,
  toggleFavoriteList,
  isFavoriteId,
  favoriteWriteFailed,
  revertFavoriteList,
} from '@/lib/utils/favorites';

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

  // Üst bileşen yönetmiyorsa durum /favorilerim ile aynı yerel kayıttan okunur
  // (ilk çizim boş, hidrasyon uyumsuzluğu olmasın diye useEffect içinde).
  useEffect(() => {
    if (onFavoriteToggle) {
      setFav(isFavorited);
      return;
    }
    try {
      const list = parseFavoriteList(localStorage.getItem(FAVORITES_STORAGE_KEY));
      setFav(isFavorited || isFavoriteId(list, listing.id));
    } catch {}
  }, [listing.id, onFavoriteToggle, isFavorited]);

  const persistFavorite = async (next: boolean) => {
    // /favorilerim girişsiz ziyaretçide yerel kaydı, girişlide Supabase "favorites" tablosunu okur.
    try {
      const list = parseFavoriteList(localStorage.getItem(FAVORITES_STORAGE_KEY));
      localStorage.setItem(
        FAVORITES_STORAGE_KEY,
        JSON.stringify(toggleFavoriteList(list, listing as unknown as { id: string }, next)),
      );
    } catch {}

    // Veritabanı yazımı tutmazsa kalp ve yerel kayıt eski hâline döner (aksi halde /favorilerim boş kalır).
    const revert = () => {
      setFav(!next);
      try {
        // Kaydı O AN yeniden oku; yalnız bu ilanı tersine çevir (araya giren başka favoriler silinmesin).
        const current = parseFavoriteList(localStorage.getItem(FAVORITES_STORAGE_KEY));
        localStorage.setItem(
          FAVORITES_STORAGE_KEY,
          JSON.stringify(revertFavoriteList(current, listing as unknown as { id: string }, next)),
        );
      } catch {}
    };

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const res = next
        ? await supabase.from('favorites').upsert({ user_id: user.id, listing_id: listing.id })
        : await supabase.from('favorites').delete().eq('user_id', user.id).eq('listing_id', listing.id);
      if (favoriteWriteFailed(res)) {
        console.error('Favori kaydedilemedi:', res.error);
        revert();
      }
    } catch (err) {
      console.error('Favori kaydedilemedi:', err);
      revert();
    }
  };

  const handleFavClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !fav;
    setFav(next);
    if (onFavoriteToggle) {
      onFavoriteToggle(listing.id, next);
    } else {
      void persistFavorite(next);
    }
  };

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onCompareToggle) {
      onCompareToggle(listing.id);
    }
  };

  const fmt = (n: number | string) => Number(n).toLocaleString('tr-TR');

  const renderPrice = () => {
    const main = 'text-[17px] font-semibold text-navy-900 tabular';
    const unit = 'text-xs font-normal text-slate-500 ml-1';

    const unitRate = unitRatePrice(listing);
    if (unitRate) {
      return (
        <div className={main}>
          {fmt(unitRate.amount)} ₺<span className={unit}>/ {unitRate.unit}</span>
        </div>
      );
    }

    if (listing.listing_type === 'service' || listing.pricing_type === 'custom_quote') {
      return <div className="text-sm font-medium text-slate-700">Teklif usulü</div>;
    }

    if (listing.listing_type === 'sale') {
      return listing.price_sale ? (
        <div className={main}>{fmt(listing.price_sale)} ₺</div>
      ) : (
        <div className="text-sm font-medium text-slate-700">Fiyat sorunuz</div>
      );
    }

    if (listing.price_daily) {
      return (
        <div>
          <div className={main}>
            {fmt(listing.price_daily)} ₺<span className={unit}>/ gün</span>
          </div>
          {listing.price_monthly && (
            <div className="text-xs text-slate-500 tabular">Aylık {fmt(listing.price_monthly)} ₺</div>
          )}
        </div>
      );
    }

    if (listing.price_monthly) {
      return (
        <div className={main}>
          {fmt(listing.price_monthly)} ₺<span className={unit}>/ ay</span>
        </div>
      );
    }

    return <div className="text-sm font-medium text-slate-700">Fiyat sorunuz</div>;
  };

  const hasImage = !!(listing.images && listing.images.length > 0 && listing.images[0]);
  const imageSrc = hasImage ? listing.images![0] : '';

  const rawTitle = listing.title.replace(/^\[DEMO\]\s*/i, '');
  const displayTitle = listing.is_demo
    ? rawTitle.toLowerCase().startsWith('örnek')
      ? rawTitle
      : `Örnek: ${rawTitle}`
    : rawTitle;
  const distanceLabel = formatDistance(listing.distance_km);
  const displayCompanyName = listingCompanyName(listing);
  const href = `/ilan/${listing.slug || listing.id}`;
  const typeLabel =
    listing.listing_type === 'rental' ? 'Kiralık' : listing.listing_type === 'service' ? 'Hizmet' : 'Satılık';

  const inclusions = [
    listing.is_operator_included && 'Operatörlü',
    listing.is_transport_included && 'Nakliye dahil',
    listing.is_fuel_included && 'Yakıt dahil',
  ].filter(Boolean) as string[];

  const onOpen = () => {
    if (listing.ad_campaign_id) recordAdClick(listing.ad_campaign_id);
  };

  return (
    <article
      className={`group relative bg-white rounded-md border overflow-hidden flex flex-col transition-colors ${
        isCompareSelected ? 'border-orange-500 ring-1 ring-orange-500' : 'border-slate-200 hover:border-slate-400'
      }`}
    >
      <Link href={href} onClick={onOpen} className="block relative aspect-[4/3] bg-slate-100 overflow-hidden">
        {hasImage ? (
          <Image
            src={imageSrc}
            alt={displayTitle}
            fill
            className="object-cover text-[0px]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <CameraOff className="w-7 h-7" strokeWidth={1.5} />
            <span className="text-xs mt-1.5">Fotoğraf yok</span>
          </div>
        )}

        <div className="absolute top-2 left-2 flex gap-1">
          <span className="px-1.5 py-0.5 rounded-sm bg-white/95 text-[11px] font-medium text-navy-900">
            {typeLabel}
          </span>
          {listing.is_sponsored && (
            <span className="px-1.5 py-0.5 rounded-sm bg-navy-900/90 text-[11px] font-medium text-white">
              Sponsorlu
            </span>
          )}
          {listing.is_demo && (
            <span className="px-1.5 py-0.5 rounded-sm bg-orange-500 text-[11px] font-medium text-white">
              Örnek
            </span>
          )}
        </div>

        {distanceLabel && (
          <span className="absolute bottom-2 left-2 px-1.5 py-0.5 rounded-sm bg-navy-900/85 text-white text-[11px] font-medium tabular">
            {distanceLabel}
          </span>
        )}
      </Link>

      <div className="absolute top-2 right-2 flex items-center gap-1">
        {onCompareToggle && (
          <button
            type="button"
            onClick={handleCompareClick}
            className={`w-8 h-8 rounded-sm flex items-center justify-center transition-colors ${
              isCompareSelected ? 'bg-orange-500 text-white' : 'bg-white/95 text-slate-700 hover:text-navy-900'
            }`}
            title="Karşılaştır"
            aria-label="Karşılaştır"
            aria-pressed={isCompareSelected}
          >
            <Scale className="w-4 h-4" strokeWidth={1.75} />
          </button>
        )}
        <button
          type="button"
          onClick={handleFavClick}
          className={`w-8 h-8 rounded-sm flex items-center justify-center transition-colors ${
            fav ? 'bg-white text-red-600' : 'bg-white/95 text-slate-700 hover:text-red-600'
          }`}
          title={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}
          aria-label="Favori"
          aria-pressed={fav}
        >
          <Heart className={`w-4 h-4 ${fav ? 'fill-current' : ''}`} strokeWidth={1.75} />
        </button>
      </div>

      <div className="p-3.5 flex-1 flex flex-col">
        <Link href={href} onClick={onOpen}>
          <h3 className="text-[15px] font-medium text-navy-900 leading-snug line-clamp-2 group-hover:text-orange-700 transition-colors">
            {displayTitle}
          </h3>
        </Link>
        <p className="mt-1 text-[13px] text-slate-500 truncate">
          {listing.city_name || 'Türkiye'}
          {listing.district_name ? `, ${listing.district_name}` : ''}
          {listing.category?.name ? ` · ${listing.category.name}` : ''}
        </p>
        {inclusions.length > 0 && (
          <p className="mt-1.5 text-[13px] text-slate-600">{inclusions.join(' · ')}</p>
        )}

        <div className="mt-auto pt-3">
          <div className="pt-3 border-t border-slate-100 flex items-end justify-between gap-3">
            {renderPrice()}
            <span
              className="text-xs text-slate-500 truncate max-w-[45%] flex items-center gap-1"
              title={displayCompanyName}
            >
              <span className="truncate">{displayCompanyName}</span>
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
