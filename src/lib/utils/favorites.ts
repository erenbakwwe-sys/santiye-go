// /favorilerim ve /alici-paneli aynı yerel anahtarı okur: tam ilan nesnelerinden oluşan bir dizi.
export const FAVORITES_STORAGE_KEY = 'santiyego_favorites';

export type FavoriteItem = { id: string } & Record<string, unknown>;

export function parseFavoriteList(raw: string | null | undefined): FavoriteItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is FavoriteItem =>
        !!x && typeof x === 'object' && typeof (x as { id?: unknown }).id === 'string' && (x as { id: string }).id !== '',
    );
  } catch {
    return [];
  }
}

export function toggleFavoriteList<T extends { id: string }>(current: T[], item: T, on: boolean): T[] {
  const rest = current.filter((x) => x.id !== item.id);
  return on ? [item, ...rest] : rest;
}

// Yazım tutmadığında yalnız BU ilanın durumunu tersine çevirir; araya giren başka favoriler korunur.
// `current` geri alma anında yerel kayıttan yeniden okunmuş liste olmalı, tıklama anındaki anlık görüntü değil.
export function revertFavoriteList<T extends { id: string }>(current: T[], item: T, next: boolean): T[] {
  return toggleFavoriteList(current, item, !next);
}

export function isFavoriteId(list: { id: string }[], id: string): boolean {
  return list.some((x) => x.id === id);
}

// Supabase istemcisi hata FIRLATMAZ, { error } döndürür; yazım tutmadıysa true.
export function favoriteWriteFailed(res: unknown): boolean {
  return !!res && typeof res === 'object' && !!(res as { error?: unknown }).error;
}
