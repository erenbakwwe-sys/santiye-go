import { MetadataRoute } from 'next';
import { CATEGORIES, CITIES, DEMO_LISTINGS } from '@/lib/mock-data';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://santiyego.com';
  const lastModified = new Date();

  // 1. Static Root Pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/ilanlar`,
      lastModified,
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/teklif-iste`,
      lastModified,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/kvkk`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/gizlilik`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/kullanim-kosullari`,
      lastModified,
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ];

  // 2. Main Categories
  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/ilanlar?category=${cat.slug}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  // 3. Active Listings (Only active listings, prioritizing production data)
  const activeListings = DEMO_LISTINGS.filter((l) => l.status === 'active');
  const listingPages: MetadataRoute.Sitemap = activeListings.map((l) => ({
    url: `${baseUrl}/ilan/${l.slug || l.id}`,
    lastModified: new Date(l.updated_at || l.created_at || Date.now()),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  // 4. Programmatic City + Category Pages (ONLY pairs that have active listings to prevent thin content!)
  const programmaticPages: MetadataRoute.Sitemap = [];
  const cityCategoryCombos = new Set<string>();

  activeListings.forEach((l) => {
    const city = CITIES.find((c) => c.id === l.city_id);
    const catSlug = l.category?.slug || l.category?.parent_slug;
    if (city && catSlug) {
      const citySlug = city.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const key = `${citySlug}/${catSlug}`;
      if (!cityCategoryCombos.has(key)) {
        cityCategoryCombos.add(key);
        programmaticPages.push({
          url: `${baseUrl}/${citySlug}/${catSlug}`,
          lastModified,
          changeFrequency: 'daily',
          priority: 0.8,
        });
      }
    }
  });

  return [...staticPages, ...categoryPages, ...listingPages, ...programmaticPages];
}
