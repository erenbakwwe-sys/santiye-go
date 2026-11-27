/** İlan kartındaki mesafe etiketi. Mesafe bilinmiyorsa null döner; kart hiçbir şey yazmaz. */
export function formatDistance(km: number | null | undefined): string | null {
  if (typeof km !== 'number' || !Number.isFinite(km) || km < 0) return null;
  if (km > 0 && km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toLocaleString('tr-TR', { maximumFractionDigits: 1 })} km`;
}

/**
 * Ana sayfada "yakın ilanlar" bölümü yalnız ayrı bir şey gösteriyorsa çıkar.
 * Konum bilinmediğinde bu liste son eklenenlerin aynısıdır; aynı ilanları iki kez göstermeyiz.
 */
export function shouldShowNearbySection(nearby: { id: string }[], newest: { id: string }[]): boolean {
  if (nearby.length === 0) return false;
  const newestIds = new Set(newest.map((l) => l.id));
  return nearby.some((l) => !newestIds.has(l.id));
}

/**
 * İlan kartında gösterilecek firma adı. Arama fonksiyonu adı düz alanda (company_name),
 * doğrudan tablo sorgusu iç içe (company.name) döndürür; ikisine de bakılır.
 */
export function listingCompanyName(listing: {
  company?: { name?: string | null } | null;
  company_name?: string | null;
}): string {
  const raw = listing.company?.name?.trim() || listing.company_name?.trim() || 'Tedarikçi';
  return raw.replace(/^\[DEMO\]\s*/i, '');
}

/** Dolu olan il/ilçe parçalarını virgülle birleştirir; ikisi de boşsa null (satır çizilmez). */
export function formatLocation(city?: string | null, district?: string | null): string | null {
  const parts = [city, district]
    .map((p) => (typeof p === 'string' ? p.trim() : ''))
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(', ') : null;
}

/**
 * Firma doğrulanmış mı? İç içe (company.is_verified) ya da düz (company_is_verified) alan
 * kesin `true` ise doğrulanmıştır; bilgi hiç yoksa false (rozet gösterilmez).
 */
export function isCompanyVerified(listing: {
  company?: { name?: string | null; is_verified?: boolean | null } | null;
  company_is_verified?: boolean | null;
}): boolean {
  return listing.company?.is_verified === true || listing.company_is_verified === true;
}
