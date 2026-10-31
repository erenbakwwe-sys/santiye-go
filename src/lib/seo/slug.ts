/**
 * ŞANTİYE GO – SEO SLUG & PROGRAMMATIC URL HELPER
 * Türkçe karakterleri uluslararası standartta temiz URL slug'ına dönüştürür.
 */

import { CATEGORIES, CITIES, DISTRICTS } from '@/lib/mock-data';
import { Category, City, District } from '@/types/database';

export function toCleanSlug(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/İ/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function findCityBySlug(slug: string): City | undefined {
  const clean = toCleanSlug(slug);
  return CITIES.find((c) => toCleanSlug(c.name) === clean);
}

export function findDistrictBySlug(slug: string, cityId?: number): District | undefined {
  const clean = toCleanSlug(slug);
  return DISTRICTS.find((d) => {
    if (cityId && d.city_id !== cityId) return false;
    return toCleanSlug(d.name) === clean;
  });
}

export function findCategoryBySlug(slug: string): Category | undefined {
  const clean = toCleanSlug(slug);
  // Check main categories
  for (const cat of CATEGORIES) {
    if (cat.slug === clean) return cat;
    // Check subcategories
    if (cat.subcategories) {
      const sub = cat.subcategories.find((s) => s.slug === clean);
      if (sub) return sub;
    }
  }
  return undefined;
}
