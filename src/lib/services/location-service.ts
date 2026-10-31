import { createClient } from '@/lib/supabase/client';
import { CITIES, DISTRICTS, NEIGHBORHOODS } from '@/lib/mock-data';
import { City, District, Neighborhood } from '@/types/database';
import { turkishIncludes, formatPostalCode } from '@/lib/turkish';

export interface LocationSuggestion {
  type: 'postal_code' | 'neighborhood' | 'district' | 'city';
  label: string;
  subLabel: string;
  cityId: number;
  districtId?: number;
  neighborhoodId?: number;
  postalCode?: string;
  lat: number;
  lng: number;
}

export async function getNeighborhoods(districtId?: number): Promise<Neighborhood[]> {
  try {
    const supabase = createClient();
    let query = supabase.from('neighborhoods').select('*').order('name');
    if (districtId) {
      query = query.eq('district_id', districtId);
    }
    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data;
    }
  } catch {
    // fallback
  }

  if (districtId) {
    return NEIGHBORHOODS.filter((n) => n.district_id === districtId);
  }
  return NEIGHBORHOODS;
}

/**
 * 5 haneli posta kodu ile anında konum çözme
 */
export async function lookupPostalCode(code: string): Promise<LocationSuggestion | null> {
  const cleanCode = formatPostalCode(code);
  if (cleanCode.length !== 5) return null;

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('neighborhoods')
      .select(`
        *,
        city:cities(name),
        district:districts(name)
      `)
      .eq('postal_code', cleanCode)
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      return {
        type: 'postal_code',
        label: `${cleanCode} - ${data.name}`,
        subLabel: `${data.city?.name}, ${data.district?.name}`,
        cityId: data.city_id,
        districtId: data.district_id,
        neighborhoodId: data.id,
        postalCode: cleanCode,
        lat: data.location?.coordinates?.[1] || data.lat || 41.0,
        lng: data.location?.coordinates?.[0] || data.lng || 29.0,
      };
    }
  } catch {
    // fallback
  }

  // Fallback to local memory dataset
  const match = NEIGHBORHOODS.find((n) => n.postal_code === cleanCode);
  if (match) {
    return {
      type: 'postal_code',
      label: `${cleanCode} - ${match.name}`,
      subLabel: `${match.city_name}, ${match.district_name}`,
      cityId: match.city_id,
      districtId: match.district_id,
      neighborhoodId: match.id,
      postalCode: cleanCode,
      lat: match.lat,
      lng: match.lng,
    };
  }

  return null;
}

/**
 * Türkçe duyarsız otomatik tamamlama (İl, İlçe, Mahalle, Posta Kodu)
 */
export async function searchLocationAutocomplete(query: string): Promise<LocationSuggestion[]> {
  const term = query.trim();
  if (!term || term.length < 2) return [];

  const results: LocationSuggestion[] = [];

  // 1. Posta Kodu eşleşmesi (sayısal)
  if (/^\d+$/.test(term)) {
    const postalMatches = NEIGHBORHOODS.filter((n) => n.postal_code.startsWith(term)).slice(0, 5);
    postalMatches.forEach((m) => {
      results.push({
        type: 'postal_code',
        label: `${m.postal_code} - ${m.name}`,
        subLabel: `${m.city_name}, ${m.district_name}`,
        cityId: m.city_id,
        districtId: m.district_id,
        neighborhoodId: m.id,
        postalCode: m.postal_code,
        lat: m.lat,
        lng: m.lng,
      });
    });
    return results;
  }

  // 2. Mahalle eşleşmeleri
  const neighborhoodMatches = NEIGHBORHOODS.filter((n) => turkishIncludes(n.name, term)).slice(0, 4);
  neighborhoodMatches.forEach((n) => {
    results.push({
      type: 'neighborhood',
      label: n.name,
      subLabel: `${n.city_name}, ${n.district_name} (${n.postal_code})`,
      cityId: n.city_id,
      districtId: n.district_id,
      neighborhoodId: n.id,
      postalCode: n.postal_code,
      lat: n.lat,
      lng: n.lng,
    });
  });

  // 3. İlçe eşleşmeleri
  const districtMatches = DISTRICTS.filter((d) => turkishIncludes(d.name, term)).slice(0, 4);
  districtMatches.forEach((d) => {
    const city = CITIES.find((c) => c.id === d.city_id);
    results.push({
      type: 'district',
      label: d.name,
      subLabel: city?.name || 'Türkiye',
      cityId: d.city_id,
      districtId: d.id,
      lat: d.lat,
      lng: d.lng,
    });
  });

  // 4. İl eşleşmeleri
  const cityMatches = CITIES.filter((c) => turkishIncludes(c.name, term)).slice(0, 3);
  cityMatches.forEach((c) => {
    results.push({
      type: 'city',
      label: c.name,
      subLabel: 'İl Merkezi',
      cityId: c.id,
      lat: c.lat,
      lng: c.lng,
    });
  });

  return results.slice(0, 8);
}
