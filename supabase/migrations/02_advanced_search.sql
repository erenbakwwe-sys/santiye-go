-- ==============================================================================
-- ŞANTİYE GO – PROMPT 2: GELİŞMİŞ POSTGIS ARAMA & SAYFALAMA RPC FONKSİYONU
-- ==============================================================================

-- 1. PERFORMANS İNDEKSLERİ
CREATE INDEX IF NOT EXISTS idx_listings_price_daily ON listings(price_daily);
CREATE INDEX IF NOT EXISTS idx_listings_price_sale ON listings(price_sale);
CREATE INDEX IF NOT EXISTS idx_listings_type ON listings(listing_type);
CREATE INDEX IF NOT EXISTS idx_listings_district ON listings(district_id);
CREATE INDEX IF NOT EXISTS idx_listings_city ON listings(city_id);

-- 2. GELİŞMİŞ MESAFE VE FİLTRELEME RPC FONKSİYONU
CREATE OR REPLACE FUNCTION search_listings_advanced(
    p_user_lat DOUBLE PRECISION,
    p_user_lng DOUBLE PRECISION,
    p_radius_km DOUBLE PRECISION DEFAULT 25.0,
    p_category_id UUID DEFAULT NULL,
    p_subcategory_slug TEXT DEFAULT NULL,
    p_keyword TEXT DEFAULT NULL,
    p_city_id INT DEFAULT NULL,
    p_district_id INT DEFAULT NULL,
    p_neighborhood_id INT DEFAULT NULL,
    p_postal_code VARCHAR DEFAULT NULL,
    p_min_price NUMERIC DEFAULT NULL,
    p_max_price NUMERIC DEFAULT NULL,
    p_listing_type listing_type DEFAULT NULL,
    p_operator_included BOOLEAN DEFAULT NULL,
    p_fuel_included BOOLEAN DEFAULT NULL,
    p_transport_included BOOLEAN DEFAULT NULL,
    p_status listing_status DEFAULT 'active',
    p_sort_by TEXT DEFAULT 'distance', -- 'distance', 'price_asc', 'newest'
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    company_name VARCHAR,
    company_logo TEXT,
    company_phone VARCHAR,
    company_whatsapp VARCHAR,
    category_id UUID,
    category_name VARCHAR,
    category_slug VARCHAR,
    title VARCHAR,
    slug VARCHAR,
    description TEXT,
    listing_type listing_type,
    price_daily NUMERIC,
    price_weekly NUMERIC,
    price_monthly NUMERIC,
    price_sale NUMERIC,
    currency VARCHAR,
    is_operator_included BOOLEAN,
    is_fuel_included BOOLEAN,
    is_transport_included BOOLEAN,
    status listing_status,
    city_name VARCHAR,
    district_name VARCHAR,
    neighborhood_name VARCHAR,
    postal_code VARCHAR,
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    technical_specs JSONB,
    images TEXT[],
    distance_km DOUBLE PRECISION,
    is_demo BOOLEAN,
    created_at TIMESTAMPTZ,
    total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_geo GEOGRAPHY;
BEGIN
    IF p_user_lat IS NOT NULL AND p_user_lng IS NOT NULL THEN
        user_geo := ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography;
    END IF;

    RETURN QUERY
    WITH filtered AS (
        SELECT 
            l.id,
            l.company_id,
            c.name AS company_name,
            c.logo_url AS company_logo,
            c.phone AS company_phone,
            c.whatsapp AS company_whatsapp,
            l.category_id,
            cat.name AS category_name,
            cat.slug AS category_slug,
            l.title,
            l.slug,
            l.description,
            l.listing_type,
            l.price_daily,
            l.price_weekly,
            l.price_monthly,
            l.price_sale,
            l.currency,
            l.is_operator_included,
            l.is_fuel_included,
            l.is_transport_included,
            l.status,
            ci.name AS city_name,
            di.name AS district_name,
            n.name AS neighborhood_name,
            COALESCE(n.postal_code, '') AS postal_code,
            ST_Y(l.location::geometry) AS lat,
            ST_X(l.location::geometry) AS lng,
            l.technical_specs,
            l.images,
            CASE 
                WHEN user_geo IS NOT NULL THEN 
                    ROUND((ST_Distance(l.location, user_geo) / 1000.0)::numeric, 1)::DOUBLE PRECISION
                ELSE NULL 
            END AS distance_km,
            l.is_demo,
            l.created_at,
            COUNT(*) OVER() AS total_count
        FROM listings l
        JOIN companies c ON l.company_id = c.id
        JOIN categories cat ON l.category_id = cat.id
        JOIN cities ci ON l.city_id = ci.id
        JOIN districts di ON l.district_id = di.id
        LEFT JOIN neighborhoods n ON l.neighborhood_id = n.id
        WHERE (p_status IS NULL OR l.status = p_status)
          -- PostGIS mesafe filtresi (p_radius_km belirtilmişse ve koordinat varsa)
          AND (
            p_radius_km IS NULL 
            OR p_radius_km <= 0 
            OR user_geo IS NULL 
            OR ST_DWithin(l.location, user_geo, p_radius_km * 1000.0)
          )
          -- Kategori filtresi (Ana kategori veya alt kategori)
          AND (
            p_category_id IS NULL 
            OR l.category_id = p_category_id 
            OR cat.parent_id = p_category_id
          )
          AND (
            p_subcategory_slug IS NULL 
            OR cat.slug = p_subcategory_slug
          )
          -- İl / İlçe / Mahalle / Posta Kodu Filtresi
          AND (p_city_id IS NULL OR l.city_id = p_city_id)
          AND (p_district_id IS NULL OR l.district_id = p_district_id)
          AND (p_neighborhood_id IS NULL OR l.neighborhood_id = p_neighborhood_id)
          AND (p_postal_code IS NULL OR n.postal_code = p_postal_code)
          -- Metin Araması
          AND (
            p_keyword IS NULL 
            OR l.title ILIKE '%' || p_keyword || '%' 
            OR l.description ILIKE '%' || p_keyword || '%'
            OR c.name ILIKE '%' || p_keyword || '%'
          )
          -- İlan Türü (Kiralık / Satılık)
          AND (p_listing_type IS NULL OR l.listing_type = p_listing_type)
          -- Fiyat Aralığı
          AND (
            p_min_price IS NULL 
            OR COALESCE(l.price_daily, l.price_sale, 0) >= p_min_price
          )
          AND (
            p_max_price IS NULL 
            OR COALESCE(l.price_daily, l.price_sale, 99999999) <= p_max_price
          )
          -- Dahil Olan Hizmetler
          AND (p_operator_included IS NULL OR l.is_operator_included = p_operator_included)
          AND (p_fuel_included IS NULL OR l.is_fuel_included = p_fuel_included)
          AND (p_transport_included IS NULL OR l.is_transport_included = p_transport_included)
    )
    SELECT * FROM filtered
    ORDER BY
        CASE WHEN p_sort_by = 'distance' AND user_geo IS NOT NULL THEN distance_km END ASC,
        CASE WHEN p_sort_by = 'price_asc' THEN COALESCE(price_daily, price_sale) END ASC,
        CASE WHEN p_sort_by = 'newest' THEN created_at END DESC,
        id DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$;

-- 3. YARIÇAP GENİŞLETME ÖNERİSİ HESAPLAMA RPC FONKSİYONU
CREATE OR REPLACE FUNCTION count_listings_by_radii(
    p_user_lat DOUBLE PRECISION,
    p_user_lng DOUBLE PRECISION,
    p_category_id UUID DEFAULT NULL,
    p_keyword TEXT DEFAULT NULL,
    p_status listing_status DEFAULT 'active'
)
RETURNS TABLE (
    count_50km BIGINT,
    count_100km BIGINT,
    count_all BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_geo GEOGRAPHY;
BEGIN
    user_geo := ST_SetSRID(ST_MakePoint(p_user_lng, p_user_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        COUNT(*) FILTER (WHERE ST_DWithin(l.location, user_geo, 50000)) AS count_50km,
        COUNT(*) FILTER (WHERE ST_DWithin(l.location, user_geo, 100000)) AS count_100km,
        COUNT(*) AS count_all
    FROM listings l
    JOIN categories cat ON l.category_id = cat.id
    WHERE l.status = p_status
      AND (p_category_id IS NULL OR l.category_id = p_category_id OR cat.parent_id = p_category_id)
      AND (p_keyword IS NULL OR l.title ILIKE '%' || p_keyword || '%' OR l.description ILIKE '%' || p_keyword || '%');
END;
$$;
