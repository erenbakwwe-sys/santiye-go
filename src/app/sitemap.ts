import { MetadataRoute } from 'next';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { CATEGORIES, DEMO_LISTINGS } from '@/lib/mock-data';
import { isDemoFallbackAllowed, isSupabaseConfigured } from '@/lib/config/runtime';

// Site haritası her istekte değil, saatte bir yeniden üretilir.
export const revalidate = 3600;

type SitemapListing = { id: string; slug?: string | null; updated_at?: string | null; created_at?: string | null };

async function getActiveListings(): Promise<SitemapListing[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)!,
        { auth: { persistSession: false } }
      );
      const { data, error } = await supabase
        .from('listings')
        .select('id, slug, updated_at, created_at')
        .eq('status', 'active')
        .order('updated_at', { ascending: false })
        .limit(45000);
      if (!error && data) return data;
    } catch {
      // aşağıdaki karara düşer
    }
    if (!isDemoFallbackAllowed()) return [];
  }
  return DEMO_LISTINGS.filter((l) => l.status === 'active');
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://santiyego.com').replace(/\/$/, '');
  const lastModified = new Date();

  const staticPaths: Array<[string, MetadataRoute.Sitemap[number]['changeFrequency'], number]> = [
    ['', 'daily', 1.0],
    ['/ilanlar', 'hourly', 0.9],
    ['/teklif-iste', 'weekly', 0.8],
    ['/santiyeden-santiyeye', 'daily', 0.7],
    ['/operatorler', 'daily', 0.6],
    ['/hesaplayici', 'monthly', 0.5],
    ['/rehber', 'weekly', 0.5],
    ['/nasil-kullanilir', 'monthly', 0.6],
    ['/kvkk', 'monthly', 0.3],
    ['/gizlilik', 'monthly', 0.3],
    ['/kullanim-kosullari', 'monthly', 0.3],
  ];
  const staticPages: MetadataRoute.Sitemap = staticPaths.map(([path, changeFrequency, priority]) => ({
    url: `${baseUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));

  const categoryPages: MetadataRoute.Sitemap = CATEGORIES.map((cat) => ({
    url: `${baseUrl}/ilanlar?category=${encodeURIComponent(cat.slug)}`,
    lastModified,
    changeFrequency: 'daily',
    priority: 0.8,
  }));

  const listings = await getActiveListings();
  const listingPages: MetadataRoute.Sitemap = listings.map((l) => ({
    url: `${baseUrl}/ilan/${encodeURIComponent(l.slug || l.id)}`,
    lastModified: new Date(l.updated_at || l.created_at || Date.now()),
    changeFrequency: 'daily',
    priority: 0.7,
  }));

  return [...staticPages, ...categoryPages, ...listingPages];
}
