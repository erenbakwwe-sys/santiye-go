/** Ad alanına göre Türkçe alfabe sırasıyla (Ç, Ğ, I/İ, Ö, Ş, Ü) yeni bir dizi döndürür; girdiyi değiştirmez. */
export function sortByTurkishName<T extends { name: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
}
