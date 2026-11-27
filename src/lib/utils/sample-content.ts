/**
 * Örnek (demo) içeriğin ne zaman görüneceğine karar veren saf yardımcılar.
 * Kural: gerçek kayıt varsa yalnız o gösterilir; yoksa örnekler yalnız demo izinliyse gösterilir.
 */

export function visibleItems<T>(real: readonly T[], samples: readonly T[], demoAllowed: boolean): T[] {
  if (real.length > 0) return [...real];
  return demoAllowed ? [...samples] : [];
}

/** Sayaçlar yalnız gerçek kayıt sayısını gösterir; örnekler buraya hiç verilmez. */
export function realCount(real: readonly unknown[]): number {
  return real.length;
}
