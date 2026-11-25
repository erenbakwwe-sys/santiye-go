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
