/**
 * Türkçe karakter duyarsız arama ve normalizasyon fonksiyonları
 */

export function normalizeTurkish(text: string): string {
  if (!text) return '';
  return text
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c');
}

export function turkishIncludes(source: string, search: string): boolean {
  if (!source || !search) return false;
  return normalizeTurkish(source).includes(normalizeTurkish(search));
}

export function formatPostalCode(input: string): string {
  return input.replace(/[^0-9]/g, '').slice(0, 5);
}
