-- =========================================
-- FILE: supabase/migrations/01_schema.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – SUPABASE POSTGRESQL + POSTGIS ŞEMASI VE GÜVENLİK MODELİ (RLS)
-- ==============================================================================

-- 1. EKLENTİLER
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. TİPLER VE ENUM'LAR
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('buyer', 'company');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_type AS ENUM ('rental', 'sale');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE listing_status AS ENUM ('active', 'inactive', 'reserved', 'maintenance', 'draft');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. KONUM TABLOLARI
CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    plate_code INT NOT NULL UNIQUE,
    location GEOGRAPHY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_cities_location ON cities USING GIST(location);

CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_districts_city_id ON districts(city_id);
CREATE INDEX IF NOT EXISTS idx_districts_location ON districts USING GIST(location);

CREATE TABLE IF NOT EXISTS neighborhoods (
    id SERIAL PRIMARY KEY,
    district_id INT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    postal_code VARCHAR(10),
    location GEOGRAPHY(Point, 4326)
);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_district_id ON neighborhoods(district_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_postal_code ON neighborhoods(postal_code);

-- 4. KULLANICI PROFİLLERİ
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'buyer',
    full_name VARCHAR(150) NOT NULL,
    phone VARCHAR(30),
    avatar_url TEXT,
    kvkk_accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. FİRMA PROFİLLERİ
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    tax_number VARCHAR(50),
    phone VARCHAR(30) NOT NULL,
    whatsapp VARCHAR(30),
    logo_url TEXT,
    city_id INT REFERENCES cities(id),
    district_id INT REFERENCES districts(id),
    address TEXT,
    location GEOGRAPHY(Point, 4326),
    is_verified BOOLEAN DEFAULT false,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_companies_location ON companies USING GIST(location);

-- 6. KATEGORİLER
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    icon VARCHAR(50),
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- 7. İLANLAR
CREATE TABLE IF NOT EXISTS listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id),
    title VARCHAR(250) NOT NULL,
    slug VARCHAR(300) NOT NULL,
    description TEXT NOT NULL,
    listing_type listing_type NOT NULL DEFAULT 'rental',
    
    price_daily NUMERIC(12, 2),
    price_weekly NUMERIC(12, 2),
    price_monthly NUMERIC(12, 2),
    price_sale NUMERIC(12, 2),
    currency VARCHAR(3) DEFAULT 'TRY',
    
    is_operator_included BOOLEAN DEFAULT false,
    is_fuel_included BOOLEAN DEFAULT false,
    is_transport_included BOOLEAN DEFAULT false,
    
    status listing_status NOT NULL DEFAULT 'active',
    
    city_id INT NOT NULL REFERENCES cities(id),
    district_id INT NOT NULL REFERENCES districts(id),
    address_detail TEXT,
    location GEOGRAPHY(Point, 4326) NOT NULL,
    
    technical_specs JSONB DEFAULT '{}'::jsonb,
    images TEXT[] DEFAULT '{}',
    
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_listings_location ON listings USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_listings_category ON listings(category_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_is_demo ON listings(is_demo);
CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);

-- 8. FAVORİLER
CREATE TABLE IF NOT EXISTS favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id);

-- 9. GELECEK FAZLAR İÇİN TABLO TASLAKLARI (Future-Proofing)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES profiles(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id),
    listing_id UUID REFERENCES listings(id),
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    provider VARCHAR(20) NOT NULL,
    status VARCHAR(30) NOT NULL,
    provider_transaction_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- POSTGIS MESAFE ARAMA FONKSİYONU
-- ==============================================================================
CREATE OR REPLACE FUNCTION search_listings_by_distance(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_km DOUBLE PRECISION DEFAULT NULL,
    filter_category_id UUID DEFAULT NULL,
    search_keyword TEXT DEFAULT NULL,
    filter_city_id INT DEFAULT NULL,
    filter_district_id INT DEFAULT NULL,
    sort_by TEXT DEFAULT 'distance'
)
RETURNS TABLE (
    id UUID,
    company_id UUID,
    company_name VARCHAR,
    company_logo TEXT,
    company_phone VARCHAR,
    category_id UUID,
    category_name VARCHAR,
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
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    images TEXT[],
    distance_km DOUBLE PRECISION,
    is_demo BOOLEAN,
    created_at TIMESTAMPTZ
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.company_id,
        c.name AS company_name,
        c.logo_url AS company_logo,
        c.phone AS company_phone,
        l.category_id,
        cat.name AS category_name,
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
        ST_Y(l.location::geometry) AS lat,
        ST_X(l.location::geometry) AS lng,
        l.images,
        ROUND((ST_Distance(l.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) / 1000.0)::numeric, 1)::DOUBLE PRECISION AS distance_km,
        l.is_demo,
        l.created_at
    FROM listings l
    JOIN companies c ON l.company_id = c.id
    JOIN categories cat ON l.category_id = cat.id
    JOIN cities ci ON l.city_id = ci.id
    JOIN districts di ON l.district_id = di.id
    WHERE l.status = 'active'
      AND (radius_km IS NULL OR ST_DWithin(l.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography, radius_km * 1000.0))
      AND (filter_category_id IS NULL OR l.category_id = filter_category_id OR cat.parent_id = filter_category_id)
      AND (filter_city_id IS NULL OR l.city_id = filter_city_id)
      AND (filter_district_id IS NULL OR l.district_id = filter_district_id)
      AND (search_keyword IS NULL OR l.title ILIKE '%' || search_keyword || '%' OR l.description ILIKE '%' || search_keyword || '%')
    ORDER BY
        CASE WHEN sort_by = 'distance' THEN ST_Distance(l.location, ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography) END ASC,
        CASE WHEN sort_by = 'price_asc' THEN COALESCE(l.price_daily, l.price_sale) END ASC,
        CASE WHEN sort_by = 'newest' THEN l.created_at END DESC;
END;
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ==============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE cities ENABLE ROW LEVEL SECURITY;
ALTER TABLE districts ENABLE ROW LEVEL SECURITY;
ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- 1. Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 2. Companies
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON companies;
CREATE POLICY "Companies are viewable by everyone" ON companies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Company owners can insert their company" ON companies;
CREATE POLICY "Company owners can insert their company" ON companies FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Company owners can update their company" ON companies;
CREATE POLICY "Company owners can update their company" ON companies FOR UPDATE USING (auth.uid() = user_id);

-- 3. Categories / Cities / Districts (Read-only for public)
DROP POLICY IF EXISTS "Categories viewable by everyone" ON categories;
CREATE POLICY "Categories viewable by everyone" ON categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Cities viewable by everyone" ON cities;
CREATE POLICY "Cities viewable by everyone" ON cities FOR SELECT USING (true);

DROP POLICY IF EXISTS "Districts viewable by everyone" ON districts;
CREATE POLICY "Districts viewable by everyone" ON districts FOR SELECT USING (true);

DROP POLICY IF EXISTS "Neighborhoods viewable by everyone" ON neighborhoods;
CREATE POLICY "Neighborhoods viewable by everyone" ON neighborhoods FOR SELECT USING (true);

-- 4. Listings
DROP POLICY IF EXISTS "Active listings viewable by everyone" ON listings;
CREATE POLICY "Active listings viewable by everyone" ON listings FOR SELECT USING (status = 'active' OR auth.uid() IN (SELECT user_id FROM companies WHERE id = listings.company_id));

DROP POLICY IF EXISTS "Company owners can insert listings" ON listings;
CREATE POLICY "Company owners can insert listings" ON listings FOR INSERT WITH CHECK (auth.uid() IN (SELECT user_id FROM companies WHERE id = company_id));

DROP POLICY IF EXISTS "Company owners can update their listings" ON listings;
CREATE POLICY "Company owners can update their listings" ON listings FOR UPDATE USING (auth.uid() IN (SELECT user_id FROM companies WHERE id = listings.company_id));

DROP POLICY IF EXISTS "Company owners can delete their listings" ON listings;
CREATE POLICY "Company owners can delete their listings" ON listings FOR DELETE USING (auth.uid() IN (SELECT user_id FROM companies WHERE id = listings.company_id));

-- 5. Favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own favorites" ON favorites;
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- ==============================================================================
-- STORAGE BUCKET VE POLİTİKALAR (Supabase Storage)
-- ==============================================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES ('listings', 'listings', true) ON CONFLICT DO NOTHING;
-- INSERT INTO storage.buckets (id, name, public) VALUES ('company-logos', 'company-logos', true) ON CONFLICT DO NOTHING;


-- =========================================
-- FILE: supabase/migrations/02_advanced_search.sql
-- =========================================
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


-- =========================================
-- FILE: supabase/migrations/03_quotes_messages_bookings.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – PROMPT 3: TEKLİF, MESAJLAŞMA, TAKVİM, REZERVASYON VE PUANLAMA ŞEMASI
-- ==============================================================================

-- 1. YENİ TİP VE ENUM'LAR
DO $$ BEGIN
    CREATE TYPE quote_request_type AS ENUM ('single_listing', 'multi_vendor');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE quote_request_status AS ENUM ('draft', 'sent', 'quotes_received', 'accepted', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE quote_status AS ENUM ('submitted', 'accepted', 'rejected', 'withdrawn', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE availability_status AS ENUM ('available', 'booked', 'maintenance');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'approved', 'completed', 'cancelled', 'rejected', 'expired');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE notification_type AS ENUM (
        'new_quote_request', 'new_quote', 'quote_accepted', 'quote_rejected',
        'new_message', 'booking_requested', 'booking_confirmed', 'booking_cancelled',
        'new_review'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. TEKLİF TALEPLERİ (Tekil ilana veya Çoklu Firmaya Dağıtılan Talep)
CREATE TABLE IF NOT EXISTS quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    request_type quote_request_type NOT NULL DEFAULT 'single_listing',
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    category_id UUID NOT NULL REFERENCES categories(id),
    title VARCHAR(250) NOT NULL,
    description TEXT NOT NULL,
    quantity INT DEFAULT 1,
    start_date DATE NOT NULL,
    end_date DATE,
    city_id INT NOT NULL REFERENCES cities(id),
    district_id INT REFERENCES districts(id),
    address_detail TEXT,
    location GEOGRAPHY(Point, 4326),
    need_operator BOOLEAN DEFAULT false,
    need_fuel BOOLEAN DEFAULT false,
    need_transport BOOLEAN DEFAULT false,
    status quote_request_status NOT NULL DEFAULT 'sent',
    max_recipients INT DEFAULT 10,
    search_radius_km DOUBLE PRECISION DEFAULT 50.0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quote_requests_buyer ON quote_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_quote_requests_status ON quote_requests(status);
CREATE INDEX IF NOT EXISTS idx_quote_requests_location ON quote_requests USING GIST(location);

-- Çoklu teklifte eşleşen ve talebin iletildiği firmalar
CREATE TABLE IF NOT EXISTS quote_request_recipients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    notified_at TIMESTAMPTZ DEFAULT NOW(),
    distance_km DOUBLE PRECISION,
    is_read BOOLEAN DEFAULT false,
    UNIQUE(request_id, company_id)
);
CREATE INDEX IF NOT EXISTS idx_qr_recipients_company ON quote_request_recipients(company_id);

-- 3. FİRMALARIN VERDİĞİ TEKLİFLER
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES quote_requests(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    price_total NUMERIC(12, 2) NOT NULL,
    price_unit NUMERIC(12, 2),
    currency VARCHAR(3) DEFAULT 'TRY',
    is_operator_included BOOLEAN DEFAULT false,
    is_fuel_included BOOLEAN DEFAULT false,
    is_transport_included BOOLEAN DEFAULT false,
    notes TEXT,
    valid_until TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '3 days'),
    status quote_status NOT NULL DEFAULT 'submitted',
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(request_id, company_id)
);
CREATE INDEX IF NOT EXISTS idx_quotes_request ON quotes(request_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company ON quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- 4. BİREBİR MESAJLAŞMA SİSTEMİ
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    quote_request_id UUID REFERENCES quote_requests(id) ON DELETE SET NULL,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(buyer_id, company_id, listing_id)
);
CREATE INDEX IF NOT EXISTS idx_conversations_buyer ON conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_conversations_company ON conversations(company_id);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    attachment_url TEXT,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_is_read ON messages(is_read);

-- 5. MÜSAİTLİK TAKVİMİ & STOK YÖNETİMİ
ALTER TABLE listings ADD COLUMN IF NOT EXISTS stock_quantity INT DEFAULT 1;

CREATE TABLE IF NOT EXISTS listing_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status availability_status NOT NULL DEFAULT 'available',
    booked_quantity INT DEFAULT 0,
    notes VARCHAR(200),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(listing_id, date)
);
CREATE INDEX IF NOT EXISTS idx_availability_listing_date ON listing_availability(listing_id, date);

-- 6. REZERVASYON TALEPLERİ
CREATE TABLE IF NOT EXISTS bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    total_days INT NOT NULL,
    agreed_price NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'TRY',
    is_operator_included BOOLEAN DEFAULT false,
    is_fuel_included BOOLEAN DEFAULT false,
    is_transport_included BOOLEAN DEFAULT false,
    status booking_status NOT NULL DEFAULT 'pending',
    rejection_reason TEXT,
    payment_status VARCHAR(20) DEFAULT 'disabled',
    payment_amount NUMERIC(12, 2) DEFAULT 0.0,
    expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '48 hours'),
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT check_booking_dates CHECK (end_date >= start_date)
);
CREATE INDEX IF NOT EXISTS idx_bookings_buyer ON bookings(buyer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_company ON bookings(company_id);
CREATE INDEX IF NOT EXISTS idx_bookings_listing ON bookings(listing_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 7. DOĞRULANMIŞ PUANLAMA VE YORUMLAR (Sadece tamamlanmış rezervasyonu olanlar)
CREATE TABLE IF NOT EXISTS reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    company_reply TEXT,
    company_replied_at TIMESTAMPTZ,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reviews_company ON reviews(company_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- 8. GÜVENLİK: KULLANICI ENGELLEME VE ŞİKAYETLER
CREATE TABLE IF NOT EXISTS user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
    review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
    listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
    reason VARCHAR(100) NOT NULL,
    details TEXT,
    status VARCHAR(30) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. BİLDİRİMLER (In-App Notifications)
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type notification_type NOT NULL,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    link_url TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- ==============================================================================
-- ÇAKIŞMA KONTROLÜ VE YARDIMCI FONKSİYONLAR
-- ==============================================================================
CREATE OR REPLACE FUNCTION check_booking_overlap(
    p_listing_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stock INT;
    v_max_booked INT;
BEGIN
    SELECT COALESCE(stock_quantity, 1) INTO v_stock FROM listings WHERE id = p_listing_id;
    
    SELECT COALESCE(MAX(daily_count), 0) INTO v_max_booked
    FROM (
        SELECT d::date AS booking_day, COUNT(*) AS daily_count
        FROM bookings b,
             generate_series(b.start_date, b.end_date, '1 day'::interval) d
        WHERE b.listing_id = p_listing_id
          AND b.status IN ('confirmed', 'pending')
          AND d::date BETWEEN p_start_date AND p_end_date
        GROUP BY d::date
    ) sub;

    RETURN (v_max_booked < v_stock);
END;
$$;

-- Firmanın ağırlıklı Bayesyen ortalama puanını hesaplama
CREATE OR REPLACE FUNCTION get_company_weighted_rating(p_company_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
AS $$
DECLARE
    v_count INT;
    v_avg NUMERIC;
    v_m INT := 3; -- Güvenilirlik eşiği
    v_c NUMERIC := 4.5; -- Sistem genel tahmini
BEGIN
    SELECT COUNT(*), COALESCE(AVG(rating), 0)
    INTO v_count, v_avg
    FROM reviews
    WHERE company_id = p_company_id;

    IF v_count = 0 THEN
        RETURN 0;
    END IF;

    RETURN ROUND(((v_count::numeric / (v_count + v_m)) * v_avg + (v_m::numeric / (v_count + v_m)) * v_c)::numeric, 1);
END;
$$;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLİTİKALARI
-- ==============================================================================
ALTER TABLE quote_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_request_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Quote Requests
DROP POLICY IF EXISTS "Buyers view own quote requests" ON quote_requests;
CREATE POLICY "Buyers view own quote requests" ON quote_requests FOR SELECT USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Companies view assigned quote requests" ON quote_requests;
CREATE POLICY "Companies view assigned quote requests" ON quote_requests FOR SELECT USING (
    id IN (SELECT request_id FROM quote_request_recipients WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
);

DROP POLICY IF EXISTS "Buyers can insert quote requests" ON quote_requests;
CREATE POLICY "Buyers can insert quote requests" ON quote_requests FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Buyers can update own quote requests" ON quote_requests;
CREATE POLICY "Buyers can update own quote requests" ON quote_requests FOR UPDATE USING (auth.uid() = buyer_id);

-- Quotes
DROP POLICY IF EXISTS "Buyers and companies view relevant quotes" ON quotes;
CREATE POLICY "Buyers and companies view relevant quotes" ON quotes FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()) OR
    request_id IN (SELECT id FROM quote_requests WHERE buyer_id = auth.uid())
);

DROP POLICY IF EXISTS "Companies can insert quotes" ON quotes;
CREATE POLICY "Companies can insert quotes" ON quotes FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Companies can update own quotes" ON quotes;
CREATE POLICY "Companies can update own quotes" ON quotes FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

-- Conversations & Messages
DROP POLICY IF EXISTS "Users view own conversations" ON conversations;
CREATE POLICY "Users view own conversations" ON conversations FOR SELECT USING (
    auth.uid() = buyer_id OR
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users insert conversations" ON conversations;
CREATE POLICY "Users insert conversations" ON conversations FOR INSERT WITH CHECK (
    auth.uid() = buyer_id OR
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users view conversation messages" ON messages;
CREATE POLICY "Users view conversation messages" ON messages FOR SELECT USING (
    conversation_id IN (
        SELECT id FROM conversations WHERE buyer_id = auth.uid() OR company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    )
);

DROP POLICY IF EXISTS "Users insert messages" ON messages;
CREATE POLICY "Users insert messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
        SELECT id FROM conversations WHERE buyer_id = auth.uid() OR company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    )
);

-- Bookings
DROP POLICY IF EXISTS "Users view own bookings" ON bookings;
CREATE POLICY "Users view own bookings" ON bookings FOR SELECT USING (
    auth.uid() = buyer_id OR
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

DROP POLICY IF EXISTS "Buyers can insert bookings" ON bookings;
CREATE POLICY "Buyers can insert bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Parties can update relevant bookings" ON bookings;
CREATE POLICY "Parties can update relevant bookings" ON bookings FOR UPDATE USING (
    auth.uid() = buyer_id OR
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

-- Reviews
DROP POLICY IF EXISTS "Reviews viewable by everyone" ON reviews;
CREATE POLICY "Reviews viewable by everyone" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Buyers can insert review for completed booking" ON reviews;
CREATE POLICY "Buyers can insert review for completed booking" ON reviews FOR INSERT WITH CHECK (
    auth.uid() = buyer_id AND
    booking_id IN (SELECT id FROM bookings WHERE buyer_id = auth.uid() AND status = 'completed')
);

DROP POLICY IF EXISTS "Buyers update own reviews" ON reviews;
CREATE POLICY "Buyers update own reviews" ON reviews FOR UPDATE USING (auth.uid() = buyer_id);

DROP POLICY IF EXISTS "Companies reply to own reviews" ON reviews;
CREATE POLICY "Companies reply to own reviews" ON reviews FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

-- Notifications
DROP POLICY IF EXISTS "Users view own notifications" ON notifications;
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update own notifications" ON notifications;
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);


-- =========================================
-- FILE: supabase/migrations/04_admin_payments_commissions_memberships.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – PROMPT 4: YÖNETİM PANELİ, ÖDEME, KOMİSYON VE ÜYELİK ŞEMASI
-- ==============================================================================

-- 1. ADMİN ROLLERİ VE DENETİM LOGLARI
DO $$ BEGIN
    CREATE TYPE admin_role AS ENUM ('super_admin', 'moderator');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS admin_users (
    id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    role admin_role NOT NULL DEFAULT 'moderator',
    two_factor_enabled BOOLEAN DEFAULT false,
    two_factor_secret VARCHAR(64),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES profiles(id),
    action VARCHAR(64) NOT NULL,
    target_type VARCHAR(64) NOT NULL, -- 'user', 'company', 'listing', 'category', 'setting', 'payment', 'subscription'
    target_id VARCHAR(64),
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON admin_audit_logs(admin_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON admin_audit_logs(created_at);

-- 2. FİRMA BELGE DOĞRULAMA VE İYZİCO PAZARYERİ ALTYAPISI
DO $$ BEGIN
    CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN null; END $$;

ALTER TABLE companies
    ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'unverified',
    ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tax_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS legal_type VARCHAR(40) DEFAULT 'LIMITED_OR_JOINT_STOCK_COMPANY',
    ADD COLUMN IF NOT EXISTS tax_plate_url TEXT,
    ADD COLUMN IF NOT EXISTS signature_circular_url TEXT,
    ADD COLUMN IF NOT EXISTS verification_notes TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS sub_merchant_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS iban VARCHAR(34),
    ADD COLUMN IF NOT EXISTS accept_online_payments BOOLEAN DEFAULT true;

-- 3. SİSTEM AYARLARI TABLOSU (Kodda Hardcoded Olmayan Yönetilebilir Parametreler)
CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan sistem ayarları
INSERT INTO platform_settings (key, value, description) VALUES
('default_commission_rate', '{"rate_percent": 8.0}'::jsonb, 'Global varsayılan platform komisyon oranı (%)'),
('booking_cancellation_hours', '{"hours": 24}'::jsonb, 'Rezervasyon başlama saatinden kaç saat öncesine kadar cezasız iptal edilebilir'),
('quote_request_auto_expire_hours', '{"hours": 48}'::jsonb, 'Teklif veya rezervasyon talebinin yanıtsız kalması durumunda otomatik iptal süresi (saat)'),
('platform_payout_escrow_days', '{"days": 3}'::jsonb, 'İş tesliminden sonra şikayet süresi bitimi ve alt üye işyerine otomatik aktarım süresi (gün)')
ON CONFLICT (key) DO NOTHING;

-- 4. KOMİSYON KURALLARI VE İSTİSNALAR
CREATE TABLE IF NOT EXISTS commission_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_type VARCHAR(20) NOT NULL, -- 'global', 'category', 'company'
    category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    rate_percent NUMERIC(5, 2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_category_rule UNIQUE (rule_type, category_id),
    CONSTRAINT unique_company_rule UNIQUE (rule_type, company_id)
);

-- 5. ÖDEME VE İŞLEM HAREKETLERİ (Kuruş Cinsinden Tamsayı BIGINT)
DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'transferred', 'refunded', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES quotes(id) ON DELETE SET NULL,
    buyer_id UUID NOT NULL REFERENCES profiles(id),
    company_id UUID NOT NULL REFERENCES companies(id),
    provider VARCHAR(20) NOT NULL DEFAULT 'iyzico',
    provider_payment_id VARCHAR(100),
    provider_basket_id VARCHAR(100),
    idempotency_key VARCHAR(100) UNIQUE,
    amount_cents BIGINT NOT NULL,              -- Kuruş cinsinden (Örn: 15.000 ₺ -> 1500000)
    commission_rate_percent NUMERIC(5, 2) NOT NULL,
    commission_amount_cents BIGINT NOT NULL,
    vat_amount_cents BIGINT NOT NULL,          -- Hizmet komisyonunun KDV'si (%20)
    net_company_amount_cents BIGINT NOT NULL,  -- Firmaya aktarılacak tutar
    currency VARCHAR(3) DEFAULT 'TRY',
    status payment_status NOT NULL DEFAULT 'pending',
    is_transferred_to_submerchant BOOLEAN DEFAULT false,
    transferred_at TIMESTAMPTZ,
    refund_amount_cents BIGINT DEFAULT 0,
    refund_reason TEXT,
    refunded_at TIMESTAMPTZ,
    card_type VARCHAR(30),
    card_last_four VARCHAR(4),
    raw_provider_response JSONB,
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_payment_company ON payment_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_buyer ON payment_transactions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_booking ON payment_transactions(booking_id);

-- 6. ÜYELİK PAKETLERİ VE ABONELİKLER
CREATE TABLE IF NOT EXISTS membership_plans (
    id VARCHAR(32) PRIMARY KEY, -- 'free', 'pro', 'premium'
    name VARCHAR(64) NOT NULL,
    price_monthly_cents BIGINT NOT NULL,
    price_yearly_cents BIGINT NOT NULL,
    listing_limit INT NOT NULL,
    photo_limit INT NOT NULL,
    monthly_quote_limit INT NOT NULL,
    commission_discount_percent NUMERIC(4, 2) DEFAULT 0.0,
    has_premium_badge BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Varsayılan üyelik paketleri
INSERT INTO membership_plans (id, name, price_monthly_cents, price_yearly_cents, listing_limit, photo_limit, monthly_quote_limit, commission_discount_percent, has_premium_badge) VALUES
('free', 'Başlangıç (Ücretsiz)', 0, 0, 3, 3, 5, 0.0, false),
('pro', 'Profesyonel', 149000, 1490000, 15, 8, 30, 1.0, true),
('premium', 'Premium Tedarikçi', 349000, 3490000, 999, 15, 9999, 2.0, true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    plan_id VARCHAR(32) NOT NULL REFERENCES membership_plans(id),
    billing_cycle VARCHAR(10) NOT NULL DEFAULT 'monthly', -- 'monthly', 'yearly'
    status VARCHAR(20) NOT NULL DEFAULT 'active',         -- 'active', 'past_due', 'cancelled'
    current_period_start TIMESTAMPTZ NOT NULL,
    current_period_end TIMESTAMPTZ NOT NULL,
    cancel_at_period_end BOOLEAN DEFAULT false,
    assigned_by_admin UUID REFERENCES profiles(id),
    is_demo BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sub_company ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_sub_status ON company_subscriptions(status);

-- 7. ŞİKAYETLER TABLOSU GENİŞLETMESİ (Prompt 3 ile entegre)
ALTER TABLE reports
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS admin_notes TEXT,
    ADD COLUMN IF NOT EXISTS resolved_by UUID REFERENCES profiles(id),
    ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;


-- =========================================
-- FILE: supabase/migrations/05_ads_analytics_pwa.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – GÖÇ 05: REKLAM, ÖNE ÇIKARMA, İSTATİSTİKLER VE PWA
-- ==============================================================================

-- 1. REKLAM ÜRÜNLERİ TABLOSU
CREATE TABLE IF NOT EXISTS ad_products (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    slot_capacity INT NOT NULL DEFAULT 2,
    price_7_days_cents BIGINT NOT NULL,
    price_14_days_cents BIGINT NOT NULL,
    price_30_days_cents BIGINT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Başlangıç Reklam Ürünleri
INSERT INTO ad_products (id, name, description, slot_capacity, price_7_days_cents, price_14_days_cents, price_30_days_cents, is_active) VALUES
('showcase_home', 'Ana Sayfa Vitrini', 'Ana sayfa üst bandında görsel vitrin alanı, en yüksek marka bilinirliği.', 6, 75000, 135000, 245000, true),
('showcase_category', 'Kategori Vitrini', 'İlgili makine veya malzeme kategorisinin üst vitrin alanı.', 4, 50000, 90000, 165000, true),
('sponsored_listing', 'Sponsorlu Arama Sonucu', 'Arama listelerinde en üst 1-2 slotta belirgin Sponsorlu etiketiyle gösterim.', 2, 60000, 110000, 195000, true),
('regional_ad', 'Bölgesel Hedefli Reklam', 'Seçtiğiniz il/ilçe veya yarıçaptaki şantiye aramalarında gösterim.', 3, 45000, 80000, 145000, true),
('featured_company', 'Öne Çıkan Firma Profili', 'Firma dizininde en üst sıra, altın profil rozeti ve özel şantiye vitrini.', 5, 40000, 70000, 125000, true)
ON CONFLICT (id) DO UPDATE SET
    price_7_days_cents = EXCLUDED.price_7_days_cents,
    price_14_days_cents = EXCLUDED.price_14_days_cents,
    price_30_days_cents = EXCLUDED.price_30_days_cents,
    slot_capacity = EXCLUDED.slot_capacity;

-- 2. REKLAM KAMPANYALARI TABLOSU
CREATE TABLE IF NOT EXISTS ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id VARCHAR(50) NOT NULL REFERENCES ad_products(id),
    listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    target_city_id INT REFERENCES cities(id),
    target_district_id INT REFERENCES districts(id),
    target_category_id UUID REFERENCES categories(id),
    target_radius_km INT,
    pricing_model VARCHAR(20) NOT NULL DEFAULT 'fixed_duration', -- 'fixed_duration' | 'cpc'
    duration_days INT NOT NULL DEFAULT 7,
    starts_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    total_price_cents BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft, pending_payment, pending_moderation, active, paused, expired, rejected
    moderation_notes TEXT,
    payment_transaction_id UUID REFERENCES payment_transactions(id),
    impressions_count INT NOT NULL DEFAULT 0,
    clicks_count INT NOT NULL DEFAULT 0,
    is_demo BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status_active ON ad_campaigns(status, product_id, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_company ON ad_campaigns(company_id);

-- 3. HAFİF ANALİTİK OLAY TABLOSU (KVKK Uyumlu, Raw IP Yok)
CREATE TABLE IF NOT EXISTS analytics_events (
    id BIGSERIAL PRIMARY KEY,
    event_type VARCHAR(50) NOT NULL, -- 'listing_view', 'listing_favorite', 'phone_click', 'whatsapp_click', 'quote_click', 'ad_impression', 'ad_click', 'search_query'
    target_type VARCHAR(30) NOT NULL, -- 'listing', 'company', 'ad_campaign', 'search'
    target_id VARCHAR(100),
    campaign_id UUID REFERENCES ad_campaigns(id),
    session_hash VARCHAR(64) NOT NULL, -- Anonymized daily hash: sha256(session_id + salt + date)
    city_id INT,
    category_id UUID,
    search_keyword VARCHAR(150),
    search_results_count INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_target ON analytics_events(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_search ON analytics_events(event_type, search_keyword);

-- 4. GÜNLÜK TOPLULAŞTIRILMIŞ İSTATİSTİK TABLOSU
CREATE TABLE IF NOT EXISTS analytics_daily_summary (
    id BIGSERIAL PRIMARY KEY,
    date DATE NOT NULL,
    target_type VARCHAR(30) NOT NULL,
    target_id VARCHAR(100) NOT NULL,
    views_count INT NOT NULL DEFAULT 0,
    unique_visitors_count INT NOT NULL DEFAULT 0,
    favorites_count INT NOT NULL DEFAULT 0,
    phone_clicks_count INT NOT NULL DEFAULT 0,
    whatsapp_clicks_count INT NOT NULL DEFAULT 0,
    quote_requests_count INT NOT NULL DEFAULT 0,
    bookings_count INT NOT NULL DEFAULT 0,
    ad_impressions_count INT NOT NULL DEFAULT 0,
    ad_clicks_count INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(date, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_daily_summary_date_target ON analytics_daily_summary(date, target_type, target_id);

-- 5. WEB PUSH BİLDİRİM ABONELİKLERİ TABLOSU
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    keys JSONB NOT NULL,
    notify_messages BOOLEAN NOT NULL DEFAULT true,
    notify_quotes BOOLEAN NOT NULL DEFAULT true,
    notify_bookings BOOLEAN NOT NULL DEFAULT true,
    notify_marketing BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);


-- =========================================
-- FILE: supabase/migrations/06_dynamic_attributes_and_services.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – GÖÇ 06: DİNAMİK ÖZELLİK SİSTEMİ, KALAN KATEGORİLER VE HİZMET İLANLARI
-- ==============================================================================

-- 1. İlan Tiplerine 'service' (Hizmet) Eklenmesi
DO $$
BEGIN
    ALTER TYPE listing_type ADD VALUE IF NOT EXISTS 'service';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Kategoriler Tablosuna İzin Verilen İlan Tipleri Eklenmesi
ALTER TABLE categories ADD COLUMN IF NOT EXISTS allowed_listing_types TEXT[] DEFAULT ARRAY['rental', 'sale'];

-- 3. Dinamik Kategori Özellikleri Tablosu
CREATE TABLE IF NOT EXISTS category_attributes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    attribute_type VARCHAR(30) NOT NULL, -- 'text', 'number', 'select', 'boolean'
    unit VARCHAR(20),
    options JSONB,
    is_required BOOLEAN NOT NULL DEFAULT false,
    is_filterable BOOLEAN NOT NULL DEFAULT true,
    show_in_comparison BOOLEAN NOT NULL DEFAULT true,
    order_index INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(category_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_cat_attr_category ON category_attributes(category_id);

-- 4. Listings Tablosuna Hizmet, Malzeme ve Dinamik Alanlar Eklenmesi
ALTER TABLE listings ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(20) DEFAULT 'fixed'; -- 'fixed', 'custom_quote', 'unit_rate'
ALTER TABLE listings ADD COLUMN IF NOT EXISTS price_unit VARCHAR(30); -- 'm2_daily', 'm2_monthly', 'hourly', 'daily', 'per_job', 'ton', 'm3', 'piece'
ALTER TABLE listings ADD COLUMN IF NOT EXISTS min_order_quantity NUMERIC(10, 2);
ALTER TABLE listings ADD COLUMN IF NOT EXISTS delivery_available BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS delivery_max_distance_km INT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS delivery_fee_cents BIGINT;

-- Hizmet Bölgesi Alanları
ALTER TABLE listings ADD COLUMN IF NOT EXISTS service_area_type VARCHAR(20) DEFAULT 'radius'; -- 'radius', 'cities', 'turkey_wide'
ALTER TABLE listings ADD COLUMN IF NOT EXISTS service_radius_km INT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS service_city_ids INT[];

-- Hizmet Detayları, Ekip ve Belge Alanları
ALTER TABLE listings ADD COLUMN IF NOT EXISTS has_license_document BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS license_document_url TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS experience_years INT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS team_size INT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS portfolio_images TEXT[];
ALTER TABLE listings ADD COLUMN IF NOT EXISTS scope_description TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS methodology_description TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS available_from DATE;


-- =========================================
-- FILE: supabase/migrations/07_security_and_indexes.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 07: CANLI GÜVENLİK (RLS), İNDEKSLER VE SOFT LAUNCH
-- ==============================================================================

-- 0. SİSTEM AYARLARI TABLOSU (Eğer henüz oluşturulmadıysa)
CREATE TABLE IF NOT EXISTS system_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS platform_settings (
    key VARCHAR(64) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID REFERENCES profiles(id),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. ROW LEVEL SECURITY (RLS) AKTİFLEŞTİRME
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ad_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_daily_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE category_attributes ENABLE ROW LEVEL SECURITY;

-- 2. RLS POLİTİKALARI

-- 2.1 Admin Kullanıcıları (admin_users)
DROP POLICY IF EXISTS "admin_users_super_admin_all" ON admin_users;
CREATE POLICY "admin_users_super_admin_all" ON admin_users
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.role = 'super_admin' AND au.is_active = true
        )
    );

-- 2.2 Denetim Logları (admin_audit_logs)
DROP POLICY IF EXISTS "admin_audit_logs_read" ON admin_audit_logs;
CREATE POLICY "admin_audit_logs_read" ON admin_audit_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.is_active = true
        )
    );

DROP POLICY IF EXISTS "admin_audit_logs_insert" ON admin_audit_logs;
CREATE POLICY "admin_audit_logs_insert" ON admin_audit_logs
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.is_active = true
        ) OR auth.role() = 'service_role'
    );

-- 2.3 Sistem Ayarları (system_settings & platform_settings)
DROP POLICY IF EXISTS "system_settings_read_all" ON system_settings;
CREATE POLICY "system_settings_read_all" ON system_settings
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "system_settings_write_super_admin" ON system_settings;
CREATE POLICY "system_settings_write_super_admin" ON system_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.role = 'super_admin' AND au.is_active = true
        ) OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "platform_settings_read_all" ON platform_settings;
CREATE POLICY "platform_settings_read_all" ON platform_settings
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "platform_settings_write_super_admin" ON platform_settings;
CREATE POLICY "platform_settings_write_super_admin" ON platform_settings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.role = 'super_admin' AND au.is_active = true
        ) OR auth.role() = 'service_role'
    );

-- 2.4 Ödeme İşlemleri (payment_transactions)
DROP POLICY IF EXISTS "payments_party_or_admin_read" ON payment_transactions;
CREATE POLICY "payments_party_or_admin_read" ON payment_transactions
    FOR SELECT
    USING (
        buyer_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM bookings b
            JOIN listings l ON l.id = b.listing_id
            JOIN companies c ON c.id = l.company_id
            WHERE b.id = payment_transactions.booking_id AND c.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.is_active = true
        )
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "payments_insert_service_only" ON payment_transactions;
CREATE POLICY "payments_insert_service_only" ON payment_transactions
    FOR INSERT
    WITH CHECK (auth.role() = 'service_role' OR auth.uid() = buyer_id);

-- 2.5 Firma Üyelikleri (company_subscriptions)
DROP POLICY IF EXISTS "company_subscriptions_owner_read" ON company_subscriptions;
CREATE POLICY "company_subscriptions_owner_read" ON company_subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM companies c
            WHERE c.id = company_subscriptions.company_id AND c.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.is_active = true
        )
        OR auth.role() = 'service_role'
    );

-- 2.6 Reklam Kampanyaları (ad_campaigns)
DROP POLICY IF EXISTS "ad_campaigns_public_active_read" ON ad_campaigns;
CREATE POLICY "ad_campaigns_public_active_read" ON ad_campaigns
    FOR SELECT
    USING (status = 'active' OR auth.role() = 'service_role');

DROP POLICY IF EXISTS "ad_campaigns_owner_all" ON ad_campaigns;
CREATE POLICY "ad_campaigns_owner_all" ON ad_campaigns
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM companies c
            WHERE c.id = ad_campaigns.company_id AND c.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.is_active = true
        )
    );

-- 2.7 Analitik (analytics_events & summary)
DROP POLICY IF EXISTS "analytics_events_insert_anonymized" ON analytics_events;
CREATE POLICY "analytics_events_insert_anonymized" ON analytics_events
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "analytics_events_select_admin" ON analytics_events;
CREATE POLICY "analytics_events_select_admin" ON analytics_events
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.is_active = true
        )
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "analytics_summary_read_owner" ON analytics_daily_summary;
CREATE POLICY "analytics_summary_read_owner" ON analytics_daily_summary
    FOR SELECT
    USING (
        (target_type = 'company' AND EXISTS (
            SELECT 1 FROM companies c WHERE c.id::text = analytics_daily_summary.target_id AND c.user_id = auth.uid()
        ))
        OR (target_type = 'listing' AND EXISTS (
            SELECT 1 FROM listings l
            JOIN companies c ON c.id = l.company_id
            WHERE l.id::text = analytics_daily_summary.target_id AND c.user_id = auth.uid()
        ))
        OR EXISTS (
            SELECT 1 FROM admin_users au WHERE au.id = auth.uid() AND au.is_active = true
        )
    );

-- 2.8 Kategori Dinamik Özellikleri (category_attributes)
DROP POLICY IF EXISTS "category_attributes_read_all" ON category_attributes;
CREATE POLICY "category_attributes_read_all" ON category_attributes
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "category_attributes_write_admin" ON category_attributes;
CREATE POLICY "category_attributes_write_admin" ON category_attributes
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM admin_users au
            WHERE au.id = auth.uid() AND au.is_active = true
        )
        OR auth.role() = 'service_role'
    );

-- ==============================================================================
-- 3. PERFORMANS İNDEKSLERİ (POSTGIS VE BİLEŞİK İNDEKSLER)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_listings_location_gist 
ON listings USING GIST (location);

CREATE INDEX IF NOT EXISTS idx_listings_search_perf 
ON listings (status, category_id, city_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_listings_slug_lookup 
ON listings (slug);

CREATE INDEX IF NOT EXISTS idx_quote_requests_perf 
ON quote_requests (buyer_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_bookings_date_conflict 
ON bookings (listing_id, status, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_date 
ON messages (conversation_id, created_at ASC);

-- ==============================================================================
-- 4. SOFT LAUNCH (KADEMELİ AÇILIŞ) AYARLARI
-- ==============================================================================
INSERT INTO system_settings (key, value, description)
VALUES 
(
    'soft_launch_config',
    '{"is_active": true, "pilot_city_id": 55, "pilot_city_name": "Samsun", "allowed_categories": ["is-makineleri", "iskele-kalip", "nakliye", "yapi-malzemeleri"]}'::jsonb,
    'Soft launch kademeli açılış modu ayarları (aktifken diğer iller yakında mesajı verir)'
)
ON CONFLICT (key) DO NOTHING;


-- =========================================
-- FILE: supabase/migrations/08_production_auth_and_verifications.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 08: PRODUCTION AUTH, VERIFICATIONS & STORAGE
-- Prompt 8: Demo'dan Çıkış ve Gerçek Çalışan Sistem Altyapısı
-- ==============================================================================

-- 1. PHONE VERIFICATIONS (SMS OTP)
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    resend_after TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications (phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON public.phone_verifications (expires_at);

-- 2. EMAIL VERIFICATION TOKENS
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verif_token ON public.email_verification_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verif_user ON public.email_verification_tokens (user_id);

-- 3. PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON public.password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON public.password_reset_tokens (user_id);

-- 4. LOGIN SECURITY LOGS (BRUTE FORCE & AUDIT)
CREATE TABLE IF NOT EXISTS public.login_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'locked')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_ident ON public.login_security_logs (identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip ON public.login_security_logs (ip_address, created_at DESC);

-- 5. EXTEND PROFILES FOR VERIFICATION & PREFERENCES
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS kvkk_version VARCHAR(20) DEFAULT 'v1.0',
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb;

-- 6. EXTEND COMPANIES FOR ONBOARDING & VERIFICATION DOCUMENTS
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'profile_completed',
    ADD COLUMN IF NOT EXISTS tax_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tax_document_url TEXT,
    ADD COLUMN IF NOT EXISTS signature_circular_url TEXT,
    ADD COLUMN IF NOT EXISTS operating_license_url TEXT;

-- 7. STORAGE BUCKETS (LISTING PHOTOS & COMPANY DOCUMENTS)
-- If storage schema exists (standard in Supabase)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
            ('listing-photos', 'listing-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
            ('company-documents', 'company-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
        ON CONFLICT (id) DO UPDATE SET
            public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types;
    END IF;
END $$;

-- 8. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_security_logs ENABLE ROW LEVEL SECURITY;

-- Phone verifications: only service role can read/insert/update
DROP POLICY IF EXISTS "Service role manages phone verifications" ON public.phone_verifications;
CREATE POLICY "Service role manages phone verifications"
    ON public.phone_verifications FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Email verification tokens: only service role
DROP POLICY IF EXISTS "Service role manages email tokens" ON public.email_verification_tokens;
CREATE POLICY "Service role manages email tokens"
    ON public.email_verification_tokens FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Password reset tokens: only service role
DROP POLICY IF EXISTS "Service role manages password tokens" ON public.password_reset_tokens;
CREATE POLICY "Service role manages password tokens"
    ON public.password_reset_tokens FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Login logs: read by admin, write by service role
DROP POLICY IF EXISTS "Admins can view login logs" ON public.login_security_logs;
CREATE POLICY "Admins can view login logs"
    ON public.login_security_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Service role manages login logs" ON public.login_security_logs;
CREATE POLICY "Service role manages login logs"
    ON public.login_security_logs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 9. RPC FUNCTION: VERIFY PHONE OTP
CREATE OR REPLACE FUNCTION public.verify_phone_otp(
    p_phone VARCHAR,
    p_code_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record
    FROM public.phone_verifications
    WHERE phone = p_phone
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Aktif bir doğrulama kodu bulunamadı.');
    END IF;

    IF now() > v_record.expires_at THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.');
    END IF;

    IF v_record.attempts >= v_record.max_attempts THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maksimum deneme sayısını aştınız. Lütfen yeni kod isteyin.');
    END IF;

    IF v_record.code_hash <> p_code_hash THEN
        UPDATE public.phone_verifications
        SET attempts = attempts + 1
        WHERE id = v_record.id;
        
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Hatalı doğrulama kodu. Kalan deneme hakkı: %s', v_record.max_attempts - v_record.attempts - 1)
        );
    END IF;

    -- Success
    UPDATE public.phone_verifications
    SET verified_at = now()
    WHERE id = v_record.id;

    -- If user is logged in, mark profile phone as verified
    IF auth.uid() IS NOT NULL THEN
        UPDATE public.profiles
        SET is_phone_verified = true,
            phone_verified_at = now()
        WHERE id = auth.uid();
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Telefon numarası başarıyla doğrulandı.');
END;
$$;


-- =========================================
-- FILE: supabase/seed_categories.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – KATEGORİ VE ALT KATEGORİLER SEED VERİSİ
-- ==============================================================================

-- 1. ANA KATEGORİLER
INSERT INTO categories (id, parent_id, name, slug, icon, order_index) VALUES
('a0000000-0000-0000-0000-000000000001', NULL, 'İş Makineleri', 'is-makineleri', 'Wrench', 1),
('a0000000-0000-0000-0000-000000000002', NULL, 'Yapı Malzemeleri', 'yapi-malzemeleri', 'Boxes', 2),
('a0000000-0000-0000-0000-000000000003', NULL, 'Nakliye', 'nakliye', 'Truck', 3)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index;

-- 2. İŞ MAKİNELERİ ALT KATEGORİLERİ
INSERT INTO categories (id, parent_id, name, slug, icon, order_index) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ekskavatör', 'ekskavator', 'Wrench', 1),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Mini Ekskavatör', 'mini-ekskavator', 'Wrench', 2),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'JCB (Beko Loder)', 'jcb-beko-loder', 'Wrench', 3),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Dozer', 'dozer', 'Wrench', 4),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Greyder', 'greyder', 'Wrench', 5),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Loder (Yükleyici)', 'loder-yukleyici', 'Wrench', 6),
('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Forklift', 'forklift', 'Wrench', 7),
('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Vinç (Mobil / Kule)', 'vinc', 'Wrench', 8),
('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Beton Mikseri', 'beton-mikseri', 'Wrench', 9),
('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Silindir', 'silindir', 'Wrench', 10),
('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Kompresör', 'kompresor', 'Wrench', 11),
('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Jeneratör', 'jenerator', 'Wrench', 12)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index;

-- 3. YAPI MALZEMELERİ ALT KATEGORİLERİ
INSERT INTO categories (id, parent_id, name, slug, icon, order_index) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Çimento', 'cimento', 'Boxes', 1),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Demir / Donatı', 'demir-donati', 'Boxes', 2),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Kum & Çakıl', 'kum-cakil', 'Boxes', 3),
('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Hazır Beton', 'hazir-beton', 'Boxes', 4),
('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Tuğla & Bims', 'tugla-bims', 'Boxes', 5),
('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Gazbeton', 'gazbeton', 'Boxes', 6),
('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Alçı & Sıva', 'alci-siva', 'Boxes', 7),
('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Yalıtım & İzolasyon', 'yalitim-izolasyon', 'Boxes', 8),
('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'İnşaat Boyası', 'insaat-boyasi', 'Boxes', 9),
('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Seramik & Fayans', 'seramik-fayans', 'Boxes', 10)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index;

-- 4. NAKLİYE ALT KATEGORİLERİ
INSERT INTO categories (id, parent_id, name, slug, icon, order_index) VALUES
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Hafriyat Nakliyesi', 'hafriyat-nakliyesi', 'Truck', 1),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Kamyon Kiralama', 'kamyon-kiralama', 'Truck', 2),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Lowbed (Ağır Nakliyat)', 'lowbed-agir-nakliyat', 'Truck', 3),
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Vinçli Nakliye', 'vincli-nakliye', 'Truck', 4),
('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'İş Makinesi Nakliyesi', 'is-makinesi-nakliyesi', 'Truck', 5),
('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Moloz Taşıma', 'moloz-tasima', 'Truck', 6)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index;


-- =========================================
-- FILE: supabase/seed_cities_districts.sql
-- =========================================
-- ==============================================================================
-- ŞANTİYE GO – TÜRKİYE 81 İL VE İLÇELERİ SEED VERİSİ (WGS84 KOORDİNATLARIYLA)
-- ==============================================================================

INSERT INTO cities (id, plate_code, name, location) VALUES
(1, 1, 'Adana', ST_SetSRID(ST_MakePoint(35.3213, 37.0000), 4326)::geography),
(2, 2, 'Adıyaman', ST_SetSRID(ST_MakePoint(38.2786, 37.7648), 4326)::geography),
(3, 3, 'Afyonkarahisar', ST_SetSRID(ST_MakePoint(30.5433, 38.7507), 4326)::geography),
(4, 4, 'Ağrı', ST_SetSRID(ST_MakePoint(43.0519, 39.7217), 4326)::geography),
(5, 5, 'Amasya', ST_SetSRID(ST_MakePoint(35.8353, 40.6534), 4326)::geography),
(6, 6, 'Ankara', ST_SetSRID(ST_MakePoint(32.8597, 39.9334), 4326)::geography),
(7, 7, 'Antalya', ST_SetSRID(ST_MakePoint(30.7133, 36.8969), 4326)::geography),
(8, 8, 'Artvin', ST_SetSRID(ST_MakePoint(41.8183, 41.1828), 4326)::geography),
(9, 9, 'Aydın', ST_SetSRID(ST_MakePoint(27.8456, 37.8560), 4326)::geography),
(10, 10, 'Balıkesir', ST_SetSRID(ST_MakePoint(27.8903, 39.6484), 4326)::geography),
(11, 11, 'Bilecik', ST_SetSRID(ST_MakePoint(29.9793, 40.1451), 4326)::geography),
(12, 12, 'Bingöl', ST_SetSRID(ST_MakePoint(40.4939, 38.8854), 4326)::geography),
(13, 13, 'Bitlis', ST_SetSRID(ST_MakePoint(42.1095, 38.4006), 4326)::geography),
(14, 14, 'Bolu', ST_SetSRID(ST_MakePoint(31.6061, 40.7350), 4326)::geography),
(15, 15, 'Burdur', ST_SetSRID(ST_MakePoint(30.2889, 37.7203), 4326)::geography),
(16, 16, 'Bursa', ST_SetSRID(ST_MakePoint(29.0610, 40.1885), 4326)::geography),
(17, 17, 'Çanakkale', ST_SetSRID(ST_MakePoint(26.4086, 40.1553), 4326)::geography),
(18, 18, 'Çankırı', ST_SetSRID(ST_MakePoint(33.6134, 40.6013), 4326)::geography),
(19, 19, 'Çorum', ST_SetSRID(ST_MakePoint(34.9556, 40.5506), 4326)::geography),
(20, 20, 'Denizli', ST_SetSRID(ST_MakePoint(29.0864, 37.7765), 4326)::geography),
(21, 21, 'Diyarbakır', ST_SetSRID(ST_MakePoint(40.2189, 37.9144), 4326)::geography),
(22, 22, 'Edirne', ST_SetSRID(ST_MakePoint(26.5594, 41.6772), 4326)::geography),
(23, 23, 'Elazığ', ST_SetSRID(ST_MakePoint(39.2264, 38.6810), 4326)::geography),
(24, 24, 'Erzincan', ST_SetSRID(ST_MakePoint(39.4926, 39.7500), 4326)::geography),
(25, 25, 'Erzurum', ST_SetSRID(ST_MakePoint(41.2728, 39.9043), 4326)::geography),
(26, 26, 'Eskişehir', ST_SetSRID(ST_MakePoint(30.5256, 39.7767), 4326)::geography),
(27, 27, 'Gaziantep', ST_SetSRID(ST_MakePoint(37.3825, 37.0662), 4326)::geography),
(28, 28, 'Giresun', ST_SetSRID(ST_MakePoint(38.3895, 40.9128), 4326)::geography),
(29, 29, 'Gümüşhane', ST_SetSRID(ST_MakePoint(39.4814, 40.4600), 4326)::geography),
(30, 30, 'Hakkari', ST_SetSRID(ST_MakePoint(43.7408, 37.5833), 4326)::geography),
(31, 31, 'Hatay', ST_SetSRID(ST_MakePoint(36.1667, 36.2000), 4326)::geography),
(32, 32, 'Isparta', ST_SetSRID(ST_MakePoint(30.5537, 37.7648), 4326)::geography),
(33, 33, 'Mersin', ST_SetSRID(ST_MakePoint(34.6415, 36.8121), 4326)::geography),
(34, 34, 'İstanbul', ST_SetSRID(ST_MakePoint(28.9784, 41.0082), 4326)::geography),
(35, 35, 'İzmir', ST_SetSRID(ST_MakePoint(27.1428, 38.4237), 4326)::geography),
(36, 36, 'Kars', ST_SetSRID(ST_MakePoint(43.0975, 40.6167), 4326)::geography),
(37, 37, 'Kastamonu', ST_SetSRID(ST_MakePoint(33.7765, 41.3887), 4326)::geography),
(38, 38, 'Kayseri', ST_SetSRID(ST_MakePoint(35.4853, 38.7205), 4326)::geography),
(39, 39, 'Kırklareli', ST_SetSRID(ST_MakePoint(27.2244, 41.7333), 4326)::geography),
(40, 40, 'Kırşehir', ST_SetSRID(ST_MakePoint(34.1709, 39.1425), 4326)::geography),
(41, 41, 'Kocaeli', ST_SetSRID(ST_MakePoint(29.9409, 40.8533), 4326)::geography),
(42, 42, 'Konya', ST_SetSRID(ST_MakePoint(32.4846, 37.8667), 4326)::geography),
(43, 43, 'Kütahya', ST_SetSRID(ST_MakePoint(29.9833, 39.4167), 4326)::geography),
(44, 44, 'Malatya', ST_SetSRID(ST_MakePoint(38.3095, 38.3552), 4326)::geography),
(45, 45, 'Manisa', ST_SetSRID(ST_MakePoint(27.4296, 38.6191), 4326)::geography),
(46, 46, 'Kahramanmaraş', ST_SetSRID(ST_MakePoint(36.9371, 37.5858), 4326)::geography),
(47, 47, 'Mardin', ST_SetSRID(ST_MakePoint(40.7339, 37.3212), 4326)::geography),
(48, 48, 'Muğla', ST_SetSRID(ST_MakePoint(28.3636, 37.2153), 4326)::geography),
(49, 49, 'Muş', ST_SetSRID(ST_MakePoint(41.4910, 38.7432), 4326)::geography),
(50, 50, 'Nevşehir', ST_SetSRID(ST_MakePoint(34.7144, 38.6244), 4326)::geography),
(51, 51, 'Niğde', ST_SetSRID(ST_MakePoint(34.6857, 37.9667), 4326)::geography),
(52, 52, 'Ordu', ST_SetSRID(ST_MakePoint(37.8797, 40.9839), 4326)::geography),
(53, 53, 'Rize', ST_SetSRID(ST_MakePoint(40.5217, 41.0201), 4326)::geography),
(54, 54, 'Sakarya', ST_SetSRID(ST_MakePoint(30.4033, 40.7569), 4326)::geography),
(55, 55, 'Samsun', ST_SetSRID(ST_MakePoint(36.3360, 41.2867), 4326)::geography),
(56, 56, 'Siirt', ST_SetSRID(ST_MakePoint(41.9420, 37.9333), 4326)::geography),
(57, 57, 'Sinop', ST_SetSRID(ST_MakePoint(35.1517, 42.0231), 4326)::geography),
(58, 58, 'Sivas', ST_SetSRID(ST_MakePoint(37.0179, 39.7477), 4326)::geography),
(59, 59, 'Tekirdağ', ST_SetSRID(ST_MakePoint(27.5110, 40.9833), 4326)::geography),
(60, 60, 'Tokat', ST_SetSRID(ST_MakePoint(36.5544, 40.3167), 4326)::geography),
(61, 61, 'Trabzon', ST_SetSRID(ST_MakePoint(39.7168, 41.0015), 4326)::geography),
(62, 62, 'Tunceli', ST_SetSRID(ST_MakePoint(39.5401, 39.1079), 4326)::geography),
(63, 63, 'Şanlıurfa', ST_SetSRID(ST_MakePoint(38.7955, 37.1674), 4326)::geography),
(64, 64, 'Uşak', ST_SetSRID(ST_MakePoint(29.4058, 38.6823), 4326)::geography),
(65, 65, 'Van', ST_SetSRID(ST_MakePoint(43.3748, 38.4891), 4326)::geography),
(66, 66, 'Yozgat', ST_SetSRID(ST_MakePoint(34.8044, 39.8181), 4326)::geography),
(67, 67, 'Zonguldak', ST_SetSRID(ST_MakePoint(31.7987, 41.4564), 4326)::geography),
(68, 68, 'Aksaray', ST_SetSRID(ST_MakePoint(34.0254, 38.3687), 4326)::geography),
(69, 69, 'Bayburt', ST_SetSRID(ST_MakePoint(40.2249, 40.2552), 4326)::geography),
(70, 70, 'Karaman', ST_SetSRID(ST_MakePoint(33.2150, 37.1759), 4326)::geography),
(71, 71, 'Kırıkkale', ST_SetSRID(ST_MakePoint(33.5139, 39.8468), 4326)::geography),
(72, 72, 'Batman', ST_SetSRID(ST_MakePoint(41.1322, 37.8812), 4326)::geography),
(73, 73, 'Şırnak', ST_SetSRID(ST_MakePoint(42.4594, 37.5164), 4326)::geography),
(74, 74, 'Bartın', ST_SetSRID(ST_MakePoint(32.3375, 41.6344), 4326)::geography),
(75, 75, 'Ardahan', ST_SetSRID(ST_MakePoint(42.7022, 41.1105), 4326)::geography),
(76, 76, 'Iğdır', ST_SetSRID(ST_MakePoint(44.0450, 39.9167), 4326)::geography),
(77, 77, 'Yalova', ST_SetSRID(ST_MakePoint(29.2769, 40.6550), 4326)::geography),
(78, 78, 'Karabük', ST_SetSRID(ST_MakePoint(32.6277, 41.2061), 4326)::geography),
(79, 79, 'Kilis', ST_SetSRID(ST_MakePoint(37.1150, 36.7184), 4326)::geography),
(80, 80, 'Osmaniye', ST_SetSRID(ST_MakePoint(36.2467, 37.0742), 4326)::geography),
(81, 81, 'Düzce', ST_SetSRID(ST_MakePoint(31.1625, 40.8438), 4326)::geography)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location;

-- İLÇELER (Örnek metropol ve inşaat/sanayi yoğunluklu ilçeler)
INSERT INTO districts (id, city_id, name, location) VALUES
-- İstanbul (34)
(101, 34, 'Kadıköy', ST_SetSRID(ST_MakePoint(29.0275, 40.9911), 4326)::geography),
(102, 34, 'Ümraniye', ST_SetSRID(ST_MakePoint(29.1194, 41.0264), 4326)::geography),
(103, 34, 'Pendik', ST_SetSRID(ST_MakePoint(29.2333, 40.8739), 4326)::geography),
(104, 34, 'Tuzla', ST_SetSRID(ST_MakePoint(29.3014, 40.8167), 4326)::geography),
(105, 34, 'Başakşehir', ST_SetSRID(ST_MakePoint(28.8028, 41.0969), 4326)::geography),
(106, 34, 'Esenyurt', ST_SetSRID(ST_MakePoint(28.6739, 41.0342), 4326)::geography),
(107, 34, 'Sarıyer', ST_SetSRID(ST_MakePoint(29.0531, 41.1686), 4326)::geography),
(108, 34, 'Beylikdüzü', ST_SetSRID(ST_MakePoint(28.6439, 40.9933), 4326)::geography),
(109, 34, 'Şişli', ST_SetSRID(ST_MakePoint(28.9872, 41.0600), 4326)::geography),
(110, 34, 'Arnavutköy', ST_SetSRID(ST_MakePoint(28.7417, 41.1856), 4326)::geography),

-- Ankara (6)
(201, 6, 'Çankaya', ST_SetSRID(ST_MakePoint(32.8540, 39.9000), 4326)::geography),
(202, 6, 'Yenimahalle', ST_SetSRID(ST_MakePoint(32.8050, 39.9678), 4326)::geography),
(203, 6, 'Etimesgut', ST_SetSRID(ST_MakePoint(32.6667, 39.9481), 4326)::geography),
(204, 6, 'Sincan', ST_SetSRID(ST_MakePoint(32.5767, 39.9583), 4326)::geography),
(205, 6, 'Ostim / İvedik (Yenimahalle)', ST_SetSRID(ST_MakePoint(32.7483, 39.9767), 4326)::geography),
(206, 6, 'Gölbaşı', ST_SetSRID(ST_MakePoint(32.8042, 39.7917), 4326)::geography),

-- İzmir (35)
(301, 35, 'Bornova', ST_SetSRID(ST_MakePoint(27.2189, 38.4650), 4326)::geography),
(302, 35, 'Bayraklı', ST_SetSRID(ST_MakePoint(27.1667, 38.4600), 4326)::geography),
(303, 35, 'Çiğli', ST_SetSRID(ST_MakePoint(27.0606, 38.4975), 4326)::geography),
(304, 35, 'Torbalı', ST_SetSRID(ST_MakePoint(27.3622, 38.1517), 4326)::geography),
(305, 35, 'Aliağa', ST_SetSRID(ST_MakePoint(26.9722, 38.7986), 4326)::geography),

-- Kocaeli (41)
(401, 41, 'Gebze', ST_SetSRID(ST_MakePoint(29.4306, 40.8028), 4326)::geography),
(402, 41, 'İzmit', ST_SetSRID(ST_MakePoint(29.9194, 40.7656), 4326)::geography),
(403, 41, 'Çayırova', ST_SetSRID(ST_MakePoint(29.3725, 40.8250), 4326)::geography),
(404, 41, 'Dilovası', ST_SetSRID(ST_MakePoint(29.5444, 40.7853), 4326)::geography),

-- Bursa (16)
(501, 16, 'Nilüfer', ST_SetSRID(ST_MakePoint(28.9833, 40.2167), 4326)::geography),
(502, 16, 'Osmangazi', ST_SetSRID(ST_MakePoint(29.0500, 40.2000), 4326)::geography),
(503, 16, 'Yıldırım', ST_SetSRID(ST_MakePoint(29.1000, 40.1833), 4326)::geography),
(504, 16, 'İnegöl', ST_SetSRID(ST_MakePoint(29.5100, 40.0800), 4326)::geography),

-- Antalya (7)
(601, 7, 'Muratpaşa', ST_SetSRID(ST_MakePoint(30.7167, 36.8833), 4326)::geography),
(602, 7, 'Kepez', ST_SetSRID(ST_MakePoint(30.6833, 36.9333), 4326)::geography),
(603, 7, 'Konyaaltı', ST_SetSRID(ST_MakePoint(30.6167, 36.8667), 4326)::geography),
(604, 7, 'Alanya', ST_SetSRID(ST_MakePoint(32.0000, 36.5439), 4326)::geography),

-- Samsun (55)
(701, 55, 'Tekkeköy', ST_SetSRID(ST_MakePoint(36.4456, 41.2312), 4326)::geography),
(702, 55, 'İlkadım', ST_SetSRID(ST_MakePoint(36.3312, 41.2854), 4326)::geography),
(703, 55, 'Canik', ST_SetSRID(ST_MakePoint(36.3654, 41.2741), 4326)::geography),
(704, 55, 'Atakum', ST_SetSRID(ST_MakePoint(36.3125, 41.3145), 4326)::geography)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, location = EXCLUDED.location;


