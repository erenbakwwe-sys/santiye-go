/**
 * ŞANTİYE GO – SCHEMA.ORG (JSON-LD) YAPILANDIRILMIŞ VERİ ÜRETİCİSİ
 * Google zengin sonuçları (Rich Snippets) için doğrulanmış şema çıktıları üretir.
 * KURAL: Uydurma puan/yorum veya sahte fiyat kesinlikle yazılmaz.
 */

import { Company, Listing } from '@/types/database';

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Şantiye GO',
    url: 'https://santiyego.com',
    logo: 'https://santiyego.com/icon-512.svg',
    description: 'Türkiye geneli kiralık ve satılık iş makineleri, yapı malzemeleri ve inşaat hizmetleri dijital pazaryeri.',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+90-850-000-0000',
      contactType: 'customer service',
      areaServed: 'TR',
      availableLanguage: 'Turkish',
    },
    sameAs: [
      'https://twitter.com/santiyego',
      'https://www.linkedin.com/company/santiyego',
      'https://www.instagram.com/santiyego',
    ],
  };
}

export function getBreadcrumbSchema(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `https://santiyego.com${item.url}`,
    })),
  };
}

export function getListingProductSchema(listing: Listing) {
  const price = listing.price_daily || listing.price_sale || listing.price_monthly;
  const isAvailable = listing.status === 'active';

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: listing.title,
    description: listing.description || `${listing.title} - Şantiye GO güvencesiyle kiralık/satılık.`,
    image: listing.images && listing.images.length > 0 ? listing.images : ['https://santiyego.com/icon-512.svg'],
    category: listing.category?.name || 'İş Makineleri & Ekipman',
  };

  if (price && price > 0) {
    schema.offers = {
      '@type': 'Offer',
      price: price,
      priceCurrency: 'TRY',
      availability: isAvailable ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: `https://santiyego.com/ilan/${listing.slug || listing.id}`,
      seller: {
        '@type': 'Organization',
        name: listing.company?.name || 'Onaylı Tedarikçi',
      },
    };
  }

  // SADECE ve SADECE veritabanında gerçek doğrulanmış yorum ve puan varsa ekle
  if (listing.rating_avg && listing.review_count && listing.review_count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: listing.rating_avg.toFixed(1),
      reviewCount: listing.review_count,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return schema;
}

export function getLocalBusinessSchema(company: Company) {
  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: company.name,
    telephone: company.phone,
    url: `https://santiyego.com/firma/${company.id}`,
    image: company.logo_url || 'https://santiyego.com/icon-512.svg',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'TR',
      addressLocality: 'Türkiye',
      streetAddress: company.address || undefined,
    },
  };

  if (company.rating_avg && company.review_count && company.review_count > 0) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: company.rating_avg.toFixed(1),
      reviewCount: company.review_count,
      bestRating: '5',
      worstRating: '1',
    };
  }

  return schema;
}
