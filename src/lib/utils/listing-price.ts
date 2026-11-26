/**
 * Karşılaştırma penceresi için fiyat kuralı (ilan kartı ve ilan detayıyla aynı):
 * - satılık ilan  -> yalnız satış fiyatı (ListingCard.tsx, ListingActionBox.tsx)
 * - kiralık/hizmet -> yalnız kira fiyatları; satış fiyatı gösterilmez
 * 0, negatif, NaN veya sayı olmayan değer "fiyat yok" (null) sayılır.
 */

export interface PriceSource {
  listing_type?: string | null;
  price_daily?: number | string | null;
  price_weekly?: number | string | null;
  price_monthly?: number | string | null;
  price_sale?: number | string | null;
  pricing_type?: string | null;
  price_unit?: string | null;
}

export interface ComparablePrices {
  daily: number | null;
  weekly: number | null;
  monthly: number | null;
  sale: number | null;
}

function valid(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Birim fiyat (ListingCard.renderPrice ile aynı kural): unit_rate ise (tür fark etmez)
 * price_daily || price_sale, birim price_unit || 'm²'. Aksi halde null.
 * Kira/satış kıyasına (comparablePrices, cheapestId) KARIŞMAZ.
 */
const UNIT_LABELS: Record<string, string> = {
  m2: 'm²',
  m3: 'm³',
  m2_ay: 'm²/ay',
  m2_gun: 'm²/gün',
  m2_hafta: 'm²/hafta',
  m_ay: 'm/ay',
  mt: 'm',
  gun: 'gün',
  gün: 'gün',
  ay: 'ay',
  saat: 'saat',
  ton: 'ton',
  adet: 'adet',
};

/** price_unit ham değerini okunur etikete çevirir; bilinmeyende "_" -> "/", boşsa ''. */
export function unitLabel(raw: string | null | undefined): string {
  const t = (raw ?? '').trim();
  if (!t) return '';
  const known = UNIT_LABELS[t.toLowerCase()];
  return known ?? t.replace(/_+/g, '/');
}

export function unitRatePrice(l: PriceSource): { amount: number; unit: string } | null {
  if (l.pricing_type !== 'unit_rate') return null;
  const amount = valid(l.price_daily) ?? valid(l.price_sale);
  return amount === null ? null : { amount, unit: unitLabel(l.price_unit) || 'm²' };
}

export function comparablePrices(l: PriceSource): ComparablePrices {
  if (l.pricing_type === 'unit_rate') {
    return { daily: null, weekly: null, monthly: null, sale: null };
  }
  if (l.listing_type === 'sale') {
    return { daily: null, weekly: null, monthly: null, sale: valid(l.price_sale) };
  }
  return {
    daily: valid(l.price_daily),
    weekly: valid(l.price_weekly),
    monthly: valid(l.price_monthly),
    sale: null,
  };
}

/**
 * En ucuz ilanın id'si. Rozet için en az iki geçerli fiyat gerekir ve en düşük fiyat tek bir
 * ilana ait olmalıdır; tek fiyat ya da en düşükte eşitlik varsa null.
 */
export function cheapestId(
  listings: ReadonlyArray<PriceSource & { id: string }>,
  kind: 'daily' | 'sale',
): string | null {
  const priced: { id: string; p: number }[] = [];
  for (const l of listings) {
    const p = comparablePrices(l)[kind];
    if (p !== null) priced.push({ id: l.id, p });
  }
  if (priced.length < 2) return null;
  const min = Math.min(...priced.map((x) => x.p));
  const lowest = priced.filter((x) => x.p === min);
  return lowest.length === 1 ? lowest[0].id : null;
}
