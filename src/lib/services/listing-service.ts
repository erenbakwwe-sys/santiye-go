// Browser client - sadece client-side fonksiyonlarda kullanılır
import { createClient } from '@/lib/supabase/client';
// Supabase-js direkt client - Server Component'lerde (getListingBySlugOrId gibi) kullanılır
// createBrowserClient yerine createClient from @supabase/supabase-js: cookie gerektirmez, her ortamda çalışır
import { createClient as createSupabaseDirectClient } from '@supabase/supabase-js';
import { calculateDistanceKm } from '@/lib/geo';
import { CATEGORIES, CITIES, DEMO_LISTINGS, DISTRICTS, NEIGHBORHOODS } from '@/lib/mock-data';
export { DEMO_LISTINGS } from '@/lib/mock-data';
import { Category, City, District, Listing, Neighborhood, SearchParams, SearchResult } from '@/types/database';
import { turkishIncludes } from '@/lib/turkish';

// Server-safe Supabase client (cookie gerektirmez, hem server hem client'ta çalışır)
function createServerSafeClient() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    'placeholder-key';
  return createSupabaseDirectClient(supabaseUrl, supabaseKey);
}

export async function getCategories(): Promise<Category[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('order_index');

    if (!error && data && data.length > 0) {
      const parents = data.filter((c) => !c.parent_id);
      return parents.map((parent) => ({
        ...parent,
        subcategories: data.filter((c) => c.parent_id === parent.id),
      }));
    }
  } catch {
    // fallback
  }
  return CATEGORIES;
}

export async function getCities(): Promise<City[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.from('cities').select('*').order('name');
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }
  return CITIES;
}

export async function getDistricts(cityId?: number): Promise<District[]> {
  try {
    const supabase = createClient();
    let query = supabase.from('districts').select('*').order('name');
    if (cityId) {
      query = query.eq('city_id', cityId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }
  if (cityId) {
    return DISTRICTS.filter((d) => d.city_id === cityId);
  }
  return DISTRICTS;
}

export async function searchListings(params: SearchParams): Promise<SearchResult> {
  const {
    q,
    category,
    subcategory,
    city,
    district,
    neighborhood,
    postal_code,
    radius = 25, // default 25 km as requested in Prompt 2
    lat,
    lng,
    min_price,
    max_price,
    listing_type,
    operator_included,
    fuel_included,
    transport_included,
    status = 'active',
    sort = 'distance',
    page = 1,
    limit = 12,
  } = params;

  const offset = (page - 1) * limit;

  // Supabase PostGIS RPC Integration
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.rpc('search_listings_advanced', {
        p_user_lat: lat || null,
        p_user_lng: lng || null,
        p_radius_km: radius && radius > 0 ? radius : null,
        p_category_id: category || null,
        p_subcategory_slug: subcategory || null,
        p_keyword: q || null,
        p_city_id: city ? Number(city) : null,
        p_district_id: district ? Number(district) : null,
        p_neighborhood_id: neighborhood ? Number(neighborhood) : null,
        p_postal_code: postal_code || null,
        p_min_price: min_price || null,
        p_max_price: max_price || null,
        p_listing_type: listing_type || null,
        p_operator_included: operator_included !== undefined ? operator_included : null,
        p_fuel_included: fuel_included !== undefined ? fuel_included : null,
        p_transport_included: transport_included !== undefined ? transport_included : null,
        p_status: status || 'active',
        p_sort_by: sort || 'distance',
        p_limit: limit,
        p_offset: offset,
      });

      if (!error && data) {
        const total = data.length > 0 ? Number(data[0].total_count) : 0;
        let countsByRadius: { radius50: number; radius100: number } | undefined;

        // If 0 results with coordinates, fetch radius expansion counts
        if (total === 0 && lat && lng) {
          const { data: countData } = await supabase.rpc('count_listings_by_radii', {
            p_user_lat: lat,
            p_user_lng: lng,
            p_category_id: category || null,
            p_keyword: q || null,
            p_status: status || 'active',
          });
          if (countData && countData[0]) {
            countsByRadius = {
              radius50: Number(countData[0].count_50km),
              radius100: Number(countData[0].count_100km),
            };
          }
        }

        return {
          listings: data as Listing[],
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
          countsByRadius,
        };
      }

      // RPC hata verirse veya boş dönerse doğrudan Supabase tablosundan çek (Fallback)
      if (error) {
        console.warn('RPC search_listings_advanced error, fallback to direct query:', error.message);
        let directQuery = supabase
          .from('listings')
          .select(`
            *,
            company:companies(name, logo_url),
            category:categories(name, slug),
            city:cities(name),
            district:districts(name)
          `, { count: 'exact' })
          .eq('status', status || 'active');

        if (category) directQuery = directQuery.eq('category_id', category);
        if (city) directQuery = directQuery.eq('city_id', Number(city));
        if (district) directQuery = directQuery.eq('district_id', Number(district));
        if (q && q.trim()) directQuery = directQuery.ilike('title', `%${q.trim()}%`);

        const { data: dbData, count } = await directQuery
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1);

        if (dbData && dbData.length > 0) {
          const formatted = dbData.map((d: any) => ({
            ...d,
            city_name: d.city?.name,
            district_name: d.district?.name,
            category_name: d.category?.name,
            company_name: d.company?.name,
            company_logo: d.company?.logo_url,
          }));
          return {
            listings: formatted as Listing[],
            total: count || formatted.length,
            page,
            limit,
            totalPages: Math.ceil((count || formatted.length) / limit) || 1,
          };
        }
      }
    }
  } catch (err) {
    console.error('Supabase query error, fallback to local engine:', err);
  }

  // =========================================================================
  // LOCAL POSTGIS / HAVERSINE EMULATION ENGINE (Offline & Demo Reliability)
  // =========================================================================
  const allowDemo = process.env.NEXT_PUBLIC_SHOW_DEMO_DATA === 'true';
  let pool = allowDemo ? [...DEMO_LISTINGS] : [];

  // 1. Status Filter
  if (status) {
    pool = pool.filter((l) => l.status === status);
  }

  // 2. Keyword Filter (Turkish Insensitive)
  if (q && q.trim()) {
    const term = q.trim();
    pool = pool.filter(
      (l) =>
        turkishIncludes(l.title, term) ||
        turkishIncludes(l.description, term) ||
        turkishIncludes(l.company?.name || '', term) ||
        turkishIncludes(l.category?.name || '', term) ||
        turkishIncludes(l.city_name || '', term) ||
        turkishIncludes(l.district_name || '', term)
    );
  }

  // 3. Category & Subcategory Filter
  if (subcategory) {
    pool = pool.filter((l) => l.category?.slug === subcategory);
  } else if (category) {
    pool = pool.filter(
      (l) =>
        l.category_id === category ||
        l.category?.slug === category ||
        l.category?.parent_slug === category
    );
  }

  // 4. Location Filters
  if (city) {
    pool = pool.filter((l) => l.city_id === Number(city));
  }
  if (district) {
    pool = pool.filter((l) => l.district_id === Number(district));
  }
  if (neighborhood) {
    pool = pool.filter((l) => l.neighborhood_id === Number(neighborhood));
  }
  if (postal_code) {
    pool = pool.filter((l) => l.postal_code === postal_code);
  }

  // 5. Listing Type (Rental vs Sale)
  if (listing_type) {
    pool = pool.filter((l) => l.listing_type === listing_type);
  }

  // 6. Price Range
  if (min_price !== undefined) {
    pool = pool.filter((l) => {
      const price = l.price_daily ?? l.price_sale ?? 0;
      return price >= min_price;
    });
  }
  if (max_price !== undefined) {
    pool = pool.filter((l) => {
      const price = l.price_daily ?? l.price_sale ?? 0;
      return price <= max_price;
    });
  }

  // 7. Inclusions (Operator, Fuel, Transport)
  if (operator_included !== undefined) {
    pool = pool.filter((l) => l.is_operator_included === operator_included);
  }
  if (fuel_included !== undefined) {
    pool = pool.filter((l) => l.is_fuel_included === fuel_included);
  }
  if (transport_included !== undefined) {
    pool = pool.filter((l) => l.is_transport_included === transport_included);
  }

  // 7.1 Dynamic Category Attributes Filter
  if (params.dynamic_filters && Object.keys(params.dynamic_filters).length > 0) {
    pool = pool.filter((l) => {
      if (!l.technical_specs) return false;
      const specs = l.technical_specs as Record<string, any>;
      for (const [key, filterVal] of Object.entries(params.dynamic_filters!)) {
        if (filterVal === undefined || filterVal === null || filterVal === '') continue;
        const itemVal = specs[key];
        if (itemVal === undefined || itemVal === null) return false;
        if (typeof filterVal === 'boolean' && itemVal !== filterVal) return false;
        if (typeof filterVal === 'number' && Number(itemVal) < filterVal) return false;
        if (typeof filterVal === 'string' && String(itemVal).toLowerCase() !== filterVal.toLowerCase()) return false;
      }
      return true;
    });
  }

  // 8. Distance Calculation (Haversine formula matching PostGIS ST_Distance)
  if (lat && lng) {
    pool = pool.map((l) => ({
      ...l,
      distance_km: calculateDistanceKm(lat, lng, l.lat, l.lng),
    }));
  }

  // Check counts for radius expansion suggestions if 0 results
  let countsByRadius: { radius50: number; radius100: number } | undefined;
  if (lat && lng) {
    const poolWithin50 = pool.filter((l) => (l.distance_km ?? 999999) <= 50);
    const poolWithin100 = pool.filter((l) => (l.distance_km ?? 999999) <= 100);
    countsByRadius = {
      radius50: poolWithin50.length,
      radius100: poolWithin100.length,
    };
  }

  // Apply distance filter with Service Area (Hizmet Bölgesi) support
  if (lat && lng && radius && radius > 0) {
    pool = pool.filter((l) => {
      const dist = l.distance_km ?? 999999;
      // 1. Direct location proximity (searcher within listing radius)
      if (dist <= radius) return true;

      // 2. Service area coverage (listing covers searcher's location)
      if (l.service_area_type === 'turkey_wide') return true;
      if (l.service_area_type === 'cities' && city && l.service_city_ids?.includes(Number(city))) return true;
      if (l.service_radius_km && dist <= l.service_radius_km) return true;

      return false;
    });
  }

  // 9. Sorting
  if (sort === 'distance' && lat && lng) {
    pool.sort((a, b) => (a.distance_km ?? 9999) - (b.distance_km ?? 9999));
  } else if (sort === 'price_asc') {
    pool.sort((a, b) => {
      const pA = a.price_daily ?? a.price_sale ?? 99999999;
      const pB = b.price_daily ?? b.price_sale ?? 99999999;
      return pA - pB;
    });
  } else {
    // newest
    pool.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const total = pool.length;
  const paginated = pool.slice(offset, offset + limit);

  return {
    listings: paginated,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
    countsByRadius,
  };
}

export async function getListingBySlugOrId(idOrSlug: string): Promise<Listing | null> {
  if (!idOrSlug) return null;

  // URL encode edilmiş slug'ları güvenle decode et (örn: %C3%A7imento -> çimento)
  let decoded = idOrSlug;
  try {
    decoded = decodeURIComponent(idOrSlug).trim();
  } catch {
    decoded = idOrSlug.trim();
  }

  console.log('[getListingBySlugOrId] Fetching:', decoded);

  try {
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      // Server-safe client kullan (createBrowserClient değil)
      const supabase = createServerSafeClient();

      // UUID format kontrolü - Eğer UUID değilse id.eq sorgusu Postgres'te type error (22P02) verir
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded);

      let query = supabase
        .from('listings')
        .select(`
          *,
          company:companies(name, logo_url, phone),
          category:categories(name, slug),
          city:cities(name),
          district:districts(name)
        `);

      if (isUuid) {
        query = query.or(`id.eq.${decoded},slug.eq.${decoded}`);
      } else {
        query = query.eq('slug', decoded);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error('[getListingBySlugOrId] Supabase error:', error.code, error.message);
      } else {
        console.log('[getListingBySlugOrId] Result:', data ? `FOUND: ${data.title}` : 'NOT FOUND in DB');
      }

      if (!error && data) {
        // PostGIS coordinates parse: Array, WKT string veya WKB hex
        let lat = 41.0082;
        let lng = 28.9784;

        if (data.location) {
          if (Array.isArray(data.location.coordinates)) {
            lng = Number(data.location.coordinates[0]);
            lat = Number(data.location.coordinates[1]);
          } else if (typeof data.location === 'string') {
            const match = data.location.match(/POINT\s*\(\s*([0-9.-]+)\s+([0-9.-]+)\s*\)/i);
            if (match) {
              lng = parseFloat(match[1]);
              lat = parseFloat(match[2]);
            }
          }
        }

        return {
          ...data,
          lat,
          lng,
          city_name: data.city?.name,
          district_name: data.district?.name,
          company_name: data.company?.name,
          company_phone: data.company?.phone,
        } as Listing;
      }
    }
  } catch (err) {
    console.error('[getListingBySlugOrId] Unexpected error:', err);
  }

  // Veritabanında bulunamazsa veya hata olursa, DEMO_LISTINGS listesinde eşleşen ilanı dön (404 hatasını önlemek için)
  const found = DEMO_LISTINGS.find(
    (l) => l.id === decoded || l.slug === decoded || l.id === idOrSlug || l.slug === idOrSlug
  );
  console.log('[getListingBySlugOrId] Demo fallback:', found ? `FOUND: ${found.title}` : 'NOT FOUND anywhere → 404');
  return found || null;
}
