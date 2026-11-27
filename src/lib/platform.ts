/**
 * "ŞantiyeGO Tedarik" platform hesabının ilanlarını arayüzde açıkça işaretlemek için.
 * Veritabanı (companies_protect_platform) platform hesabı dışındaki firmaların adında
 * "ŞantiyeGO" geçmesini engellediği için ada göre tanımak güvenlidir.
 */
export const PLATFORM_COMPANY_NAME = 'ŞantiyeGO Tedarik';

export function isPlatformCompanyName(name?: string | null): boolean {
  if (!name) return false;
  const normalized = name
    .replace(/[Şş]/g, 's')
    .replace(/[İı]/g, 'i')
    .replace(/\s+/g, '')
    .toLowerCase();
  return normalized.includes('santiyego');
}

export const PLATFORM_LISTING_NOTE = 'Anlaşmalı firmalarımız aracılığıyla ŞantiyeGO tarafından sağlanır';
