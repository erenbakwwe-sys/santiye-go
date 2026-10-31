import { createClient } from '@/lib/supabase/client';
import { calculateDistanceKm } from '@/lib/geo';
import { CATEGORIES, CITIES, DEMO_LISTINGS, DISTRICTS, NEIGHBORHOODS } from '@/lib/mock-data';
export { DEMO_LISTINGS } from '@/lib/mock-data';
import { Category, City, District, Listing, Neighborhood, SearchParams, SearchResult } from '@/types/database';
import { turkishIncludes } from '@/lib/turkish';

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
    }
  } catch (err) {
    console.error('Supabase query error, fallback to local engine:', err);
  }

  // =========================================================================
  // LOCAL POSTGIS / HAVERSINE EMULATION ENGINE (Offline & Demo Reliability)
  // =========================================================================
  let pool = [...DEMO_LISTINGS];

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
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('listings')
        .select(`
          *,
          company:companies(name, phone, whatsapp, logo_url),
          category:categories(name, slug),
          city:cities(name),
          district:districts(name),
          neighborhood:neighborhoods(name, postal_code)
        `)
        .or(`id.eq.${idOrSlug},slug.eq.${idOrSlug}`)
        .single();

      if (!error && data) {
        return {
          ...data,
          lat: data.location?.coordinates?.[1] || 41.0082,
          lng: data.location?.coordinates?.[0] || 28.9784,
          city_name: data.city?.name,
          district_name: data.district?.name,
          neighborhood_name: data.neighborhood?.name,
          postal_code: data.neighborhood?.postal_code,
        } as Listing;
      }
    }
  } catch {
    // fallback
  }

  const found = DEMO_LISTINGS.find((l) => l.id === idOrSlug || l.slug === idOrSlug);
  return found || null;
}
