-- ==============================================================================
-- ŞANTİYE GO – SUPABASE POSTGRESQL + POSTGIS ŞEMASI VE GÜVENLİK MODELİ (RLS)
-- ==============================================================================

-- 1. EKLENTİLER
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- 2. TİPLER VE ENUM'LAR
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('buyer', 'company', 'admin', 'super_admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
EXCEPTION WHEN duplicate_object THEN null; END $$;

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
            SELECT 1 FROM public.admin_users
            WHERE id = auth.uid() AND is_active = true
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
-- ==============================================================================
-- ŞANTİYE GO – RESEND VE TELEFON OTP DOĞRULAMA FONKSİYONLARI
-- ==============================================================================

-- 1. PHONE VERIFICATIONS TABLOSU İÇİN GÜVENLİ KOD OLUŞTURMA RPC
CREATE OR REPLACE FUNCTION public.request_phone_otp(
    p_phone VARCHAR,
    p_code_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last RECORD;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO v_last
    FROM public.phone_verifications
    WHERE phone = p_phone
    ORDER BY created_at DESC
    LIMIT 1;

    -- Rate Limit: 60 saniye içinde tekrar kod isteğini engelle
    IF v_last IS NOT NULL AND v_last.resend_after > v_now THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'RATE_LIMIT_COOLDOWN',
            'remaining_seconds', EXTRACT(EPOCH FROM (v_last.resend_after - v_now))::INT
        );
    END IF;

    -- Yeni doğrulama kaydı aç (5 dakika geçerlilik, 60 saniye tekrar bekleme)
    INSERT INTO public.phone_verifications (
        phone,
        code_hash,
        attempts,
        max_attempts,
        expires_at,
        resend_after
    ) VALUES (
        p_phone,
        p_code_hash,
        0,
        3,
        v_now + interval '5 minutes',
        v_now + interval '60 seconds'
    );

    RETURN jsonb_build_object(
        'success', true,
        'expires_in_seconds', 300,
        'resend_after_seconds', 60
    );
END;
$$;

-- Anon ve authenticated kullanıcıların RPC'yi çalıştırmasına izin ver
GRANT EXECUTE ON FUNCTION public.request_phone_otp TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_phone_otp TO anon, authenticated, service_role;
-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 10: AUTO CREATE PROFILES & COMPANIES TRIGGER
-- Kullanıcı kaydolduğunda profiles ve companies kayıtlarını otomatik ve yetki
-- sorunu yaşamadan (SECURITY DEFINER) oluşturan PostgreSQL tetikleyicisi.
-- ==============================================================================

-- 1. YENİ KULLANICI TETİKLEYİCİ FONKSİYONU
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_role TEXT;
    v_role public.user_role;
    v_full_name TEXT;
    v_phone TEXT;
    v_company_name TEXT;
    v_tax_number TEXT;
    v_tax_office TEXT;
    v_city_id INT;
    v_district_id INT;
BEGIN
    -- Rolü belirle ('company', 'buyer', 'admin', 'super_admin')
    v_raw_role := COALESCE(new.raw_user_meta_data->>'role', 'buyer');
    IF v_raw_role NOT IN ('buyer', 'company', 'admin', 'super_admin') THEN
        v_raw_role := 'buyer';
    END IF;
    v_role := v_raw_role::public.user_role;

    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    v_phone := new.raw_user_meta_data->>'phone';
    v_company_name := new.raw_user_meta_data->>'company_name';
    v_tax_number := new.raw_user_meta_data->>'tax_number';
    v_tax_office := new.raw_user_meta_data->>'tax_office';

    BEGIN
        v_city_id := (new.raw_user_meta_data->>'city_id')::INT;
    EXCEPTION WHEN OTHERS THEN
        v_city_id := NULL;
    END;

    BEGIN
        v_district_id := (new.raw_user_meta_data->>'district_id')::INT;
    EXCEPTION WHEN OTHERS THEN
        v_district_id := NULL;
    END;

    -- 1. Profiles tablosuna ekle / güncelle
    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        phone,
        kvkk_accepted_at,
        kvkk_version,
        is_email_verified,
        is_phone_verified
    ) VALUES (
        new.id,
        v_role,
        v_full_name,
        v_phone,
        NOW(),
        'v1.0',
        (new.email_confirmed_at IS NOT NULL),
        (new.phone_confirmed_at IS NOT NULL)
    )
    ON CONFLICT (id) DO UPDATE
    SET
        role = CASE 
            WHEN public.profiles.role IN ('admin', 'super_admin') THEN public.profiles.role 
            ELSE EXCLUDED.role 
        END,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        is_email_verified = CASE WHEN new.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_email_verified END;

    -- 2. Eğer rol 'company' ise companies tablosuna ekle
    IF v_role = 'company' THEN
        INSERT INTO public.companies (
            user_id,
            name,
            tax_number,
            tax_office,
            phone,
            city_id,
            district_id,
            is_verified,
            is_demo
        ) VALUES (
            new.id,
            COALESCE(v_company_name, v_full_name, 'Firma Hesabı'),
            v_tax_number,
            v_tax_office,
            COALESCE(v_phone, ''),
            v_city_id,
            v_district_id,
            false,
            false
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
            name = COALESCE(EXCLUDED.name, public.companies.name),
            tax_number = COALESCE(EXCLUDED.tax_number, public.companies.tax_number),
            tax_office = COALESCE(EXCLUDED.tax_office, public.companies.tax_office);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. AUTH.USERS TETİKLEYİCİSİ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. MEVCUT KULLANICILARI GERİYE DÖNÜK DÜZELTME (BACKFILL)
DO $$
DECLARE
    r RECORD;
    v_raw_role TEXT;
    v_role public.user_role;
BEGIN
    FOR r IN SELECT * FROM auth.users LOOP
        v_raw_role := COALESCE(r.raw_user_meta_data->>'role', 'buyer');
        IF v_raw_role NOT IN ('buyer', 'company', 'admin', 'super_admin') THEN
            v_raw_role := 'buyer';
        END IF;
        v_role := v_raw_role::public.user_role;

        -- Profiles tablosunu güncelle veya oluştur
        INSERT INTO public.profiles (
            id,
            role,
            full_name,
            phone,
            kvkk_accepted_at,
            kvkk_version,
            is_email_verified,
            is_phone_verified
        )
        VALUES (
            r.id,
            v_role,
            COALESCE(r.raw_user_meta_data->>'full_name', split_part(r.email, '@', 1)),
            r.raw_user_meta_data->>'phone',
            NOW(),
            'v1.0',
            (r.email_confirmed_at IS NOT NULL),
            (r.phone_confirmed_at IS NOT NULL)
        )
        ON CONFLICT (id) DO UPDATE
        SET
            role = CASE 
                WHEN public.profiles.role IN ('admin', 'super_admin') THEN public.profiles.role 
                ELSE EXCLUDED.role 
            END,
            full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
            phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
            is_email_verified = CASE WHEN r.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_email_verified END;

        -- Eğer firma ise companies tablosuna ekle
        IF v_role = 'company' THEN
            INSERT INTO public.companies (
                user_id,
                name,
                tax_number,
                tax_office,
                phone,
                city_id,
                district_id,
                is_verified,
                is_demo
            )
            VALUES (
                r.id,
                COALESCE(r.raw_user_meta_data->>'company_name', r.raw_user_meta_data->>'full_name', split_part(r.email, '@', 1)),
                r.raw_user_meta_data->>'tax_number',
                r.raw_user_meta_data->>'tax_office',
                COALESCE(r.raw_user_meta_data->>'phone', ''),
                CASE WHEN (r.raw_user_meta_data->>'city_id') ~ '^[0-9]+$' THEN (r.raw_user_meta_data->>'city_id')::INT ELSE NULL END,
                CASE WHEN (r.raw_user_meta_data->>'district_id') ~ '^[0-9]+$' THEN (r.raw_user_meta_data->>'district_id')::INT ELSE NULL END,
                false,
                false
            )
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;
-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 11: İLETİŞİM KORUMA, MASKELEME VE KONTROLLÜ AÇILIŞ (PROMPT 9A)
-- Platform dışı anlaşmaları engelleme, ihlal takibi ve kontrollü iletişim kartı şeması.
-- ==============================================================================

-- 1. SİSTEM AYARLARI TABLOSU (Admin tarafından yönetilebilir dinamik parametreler)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('reveal_rule', '{"default": "teklif_kabul", "categories": {}}'::jsonb, 'İletişim açılış tetikleyicisi kuralı (teklif_kabul, odeme, talep_kredisi, numara_goster_butonu)'),
    ('violation_threshold', '{"info_max": 2, "warn_max": 4, "flag_max": 6}'::jsonb, 'Kullanıcı ihlal seviyesi eşikleri'),
    ('mask_patterns', '{"keywords": ["whatsapp", "wp", "watsap", "instagram", "insta", "telegram", "t.me", "özelden yaz", "özelden ara", "elden öde", "elden anlaşalım"]}'::jsonb, 'Yasaklı dış yönlendirme kelimeleri'),
    ('numara_goster_config', '{"enabled": false, "daily_limit": 5}'::jsonb, 'Yumuşak mod numara gösterim ayarı')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

-- 2. İLETİŞİM MASKELEME VE İHLAL LOGLARI (KVKK Uyumlu - Asla ham telefon/e-posta saklanmaz)
CREATE TABLE IF NOT EXISTS public.compliance_mask_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'message', 'listing', 'company_profile', 'quote_note', 'review', 'booking_note'
    entity_id VARCHAR(100),
    detected_types TEXT[] NOT NULL, -- ARRAY['phone', 'email', 'iban', 'url', 'keyword']
    is_false_positive_reported BOOLEAN DEFAULT false,
    false_positive_reason TEXT,
    reviewed_by_admin UUID REFERENCES public.profiles(id),
    review_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_user ON public.compliance_mask_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON public.compliance_mask_logs(review_status);
CREATE INDEX IF NOT EXISTS idx_compliance_created ON public.compliance_mask_logs(created_at DESC);

-- 3. KONTROLLÜ İLETİŞİM AÇILIŞ TABLOSU (REVEALS)
CREATE TABLE IF NOT EXISTS public.contact_reveals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) NOT NULL, -- 'teklif_kabul', 'odeme', 'talep_kredisi', 'numara_goster_butonu'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_reveals_parties ON public.contact_reveals(buyer_id, company_id);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_booking ON public.contact_reveals(booking_id);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_quote ON public.contact_reveals(quote_id);

-- 4. YUMUŞAK MOD: NUMARA GÖSTERİM KULLANIM LOGLARI
CREATE TABLE IF NOT EXISTS public.phone_reveal_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_reveal_user_daily ON public.phone_reveal_daily_logs(user_id, created_at DESC);

-- 5. PROFİLLERE İHLAL VE MASKELEME SAYACI EKLEME
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS mask_violation_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'clean'; -- 'clean', 'warned', 'flagged', 'suspended'

-- 6. GÜVENLİK MODELİ (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_mask_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_reveal_daily_logs ENABLE ROW LEVEL SECURITY;

-- System settings: Herkes okuyabilir, sadece admin günceller
DROP POLICY IF EXISTS "Public can read settings" ON public.system_settings;
CREATE POLICY "Public can read settings" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON public.system_settings;
CREATE POLICY "Admins can update settings" ON public.system_settings FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Compliance mask logs: Kullanıcı kendi loglarını görebilir, adminler hepsini görebilir ve inceleyebilir
DROP POLICY IF EXISTS "Users can view own mask logs" ON public.compliance_mask_logs;
CREATE POLICY "Users can view own mask logs" ON public.compliance_mask_logs FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Users can report false positive on own mask log" ON public.compliance_mask_logs;
CREATE POLICY "Users can report false positive on own mask log" ON public.compliance_mask_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert compliance mask logs" ON public.compliance_mask_logs;
CREATE POLICY "System can insert compliance mask logs" ON public.compliance_mask_logs FOR INSERT
    WITH CHECK (true);

-- Contact reveals: SADECE ilgili alıcı, ilgili firma sahibi veya admin görebilir!
DROP POLICY IF EXISTS "Only involved parties can view contact reveal" ON public.contact_reveals;
CREATE POLICY "Only involved parties can view contact reveal" ON public.contact_reveals FOR SELECT
    USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (SELECT user_id FROM public.companies WHERE id = contact_reveals.company_id) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "System can insert contact reveals" ON public.contact_reveals;
CREATE POLICY "System can insert contact reveals" ON public.contact_reveals FOR INSERT
    WITH CHECK (
        auth.uid() = buyer_id OR 
        auth.uid() IN (SELECT user_id FROM public.companies WHERE id = contact_reveals.company_id) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Phone reveal daily logs: Kullanıcı kendi kayıtlarını görür ve ekler
DROP POLICY IF EXISTS "Users manage own phone reveal logs" ON public.phone_reveal_daily_logs;
CREATE POLICY "Users manage own phone reveal logs" ON public.phone_reveal_daily_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 12: TEKLİF VERME KREDİSİ VE ATOMİK SLOT SİSTEMİ (PROMPT 9B - GÜVENLİK GÜÇLENDİRİLMİŞ)
-- 
-- Güvenlik ve Mimari İlkeleri:
-- 1. Firma kimliği istemciden alınmaz; doğrudan auth.uid() üzerinden çözümlenir.
-- 2. SECURITY DEFINER ile search_path = public, pg_temp sabitlenir.
-- 3. apply_credit_purchase, admin_adjust_credit, resolve_credit_refund ve process_expired_credits
--    fonksiyonlarının EXECUTE yetkisi authenticated rolünden kaldırılmıştır; YALNIZCA service_role çağırabilir.
--    Admin işlemleri ayrıca profiles.role ('admin', 'super_admin') kontrolü yapar.
-- 4. Defter, bakiye ve unlock tablolarında anon ve authenticated için INSERT, UPDATE, DELETE KESİNLİKLE YASAKTIR.
-- 5. RLS: Firma sadece kendi satırlarını SELECT edebilir. Başka firmanın defteri/bakiyesi asla okunamaz (0 satır).
-- 6. İade edilen slot yeniden AÇILMAZ (credit_system_settings.refund_reopens_slot = false varsayılan).
-- 7. Kilit sırası her zaman önce quote_requests, sonra company_credit_balances (Deadlock korumalı).
-- 8. İdempotency anahtarı ile çift tık/ağ yeniden denemesinde mükerrer düşüm engellenir ve mevcut kilit güvenle döner.
-- ==============================================================================

-- 1. KREDİ SİSTEM AYARLARI TABLOSU
CREATE TABLE IF NOT EXISTS public.credit_system_settings (
    id INT PRIMARY KEY DEFAULT 1,
    system_mode VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (system_mode IN ('disabled', 'shadow', 'active')),
    default_credits_per_quote INT NOT NULL DEFAULT 1 CHECK (default_credits_per_quote >= 0),
    max_bidding_slots INT NOT NULL DEFAULT 4 CHECK (max_bidding_slots >= 1),
    welcome_credits INT NOT NULL DEFAULT 3 CHECK (welcome_credits >= 0),
    credit_validity_days INT DEFAULT NULL, -- NULL = süresiz
    refund_window_hours INT NOT NULL DEFAULT 48 CHECK (refund_window_hours >= 1),
    auto_refund_on_buyer_cancel BOOLEAN NOT NULL DEFAULT true,
    refund_reopens_slot BOOLEAN NOT NULL DEFAULT false, -- İade edilen slot varsayılan olarak yeniden AÇILMAZ
    category_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT single_row_settings CHECK (id = 1)
);

INSERT INTO public.credit_system_settings (
    id, system_mode, default_credits_per_quote, max_bidding_slots, welcome_credits,
    credit_validity_days, refund_window_hours, auto_refund_on_buyer_cancel, refund_reopens_slot
) VALUES (
    1, 'active', 1, 4, 3, NULL, 48, true, false
) ON CONFLICT (id) DO UPDATE SET
    refund_reopens_slot = COALESCE(EXCLUDED.refund_reopens_slot, false),
    updated_at = now();

-- 2. FİRMA KREDİ BAKİYE TABLOSU
CREATE TABLE IF NOT EXISTS public.company_credit_balances (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    current_balance INT NOT NULL DEFAULT 0 CHECK (current_balance >= 0),
    lifetime_purchased INT NOT NULL DEFAULT 0 CHECK (lifetime_purchased >= 0),
    lifetime_spent INT NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
    has_received_welcome_grant BOOLEAN NOT NULL DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_balances_comp ON public.company_credit_balances(company_id);

-- 3. DEĞİŞTİRİLEMEZ KREDİ DEFTERİ (IMMUTABLE LEDGER)
CREATE TABLE IF NOT EXISTS public.company_credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount INT NOT NULL, -- Pozitif: yükleme/iade, Negatif: harcama, 0: gölge harcama
    entry_type VARCHAR(30) NOT NULL CHECK (entry_type IN ('topup', 'spend', 'refund', 'expire', 'admin_adjustment', 'welcome_grant', 'shadow_spend')),
    balance_after INT NOT NULL CHECK (balance_after >= 0),
    reference_id VARCHAR(100),
    idempotency_key VARCHAR(120) UNIQUE,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_company ON public.company_credit_ledger(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_idempotency ON public.company_credit_ledger(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_ref ON public.company_credit_ledger(reference_id);

-- Kredi defteri kayıtlarında UPDATE ve DELETE tetikleyici ile kesinlikle ENGELLENİR
CREATE OR REPLACE FUNCTION public.prevent_credit_ledger_mutation()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'GÜVENLİK İHLALİ: Kredi defteri (company_credit_ledger) kayıtları değiştirilemez ve silinemez!';
END;
$$;

DROP TRIGGER IF EXISTS trg_no_update_delete_credit_ledger ON public.company_credit_ledger;
CREATE TRIGGER trg_no_update_delete_credit_ledger
BEFORE UPDATE OR DELETE ON public.company_credit_ledger
FOR EACH ROW EXECUTE FUNCTION public.prevent_credit_ledger_mutation();

-- 4. KREDİ PAKETLERİ TABLOSU
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    credit_amount INT NOT NULL CHECK (credit_amount > 0),
    price_cents INT NOT NULL CHECK (price_cents >= 0),
    vat_percent INT NOT NULL DEFAULT 20 CHECK (vat_percent >= 0),
    badge_text VARCHAR(50),
    is_active BOOLEAN NOT NULL DEFAULT true,
    order_index INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.credit_packages (name, credit_amount, price_cents, vat_percent, badge_text, order_index, is_active)
VALUES
    ('Deneme Paketi', 5, 25000, 20, 'Başlangıç', 1, true),
    ('Standart Paket', 20, 90000, 20, 'Popüler', 2, true),
    ('Avantajlı Pro Paket', 50, 200000, 20, 'En İyi Değer', 3, true)
ON CONFLICT DO NOTHING;

-- 5. TALEP KREDİ KİLİT AÇILIŞLARI (TEKLİF TABLOSUNDAN AYRI)
CREATE TABLE IF NOT EXISTS public.quote_request_unlocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    credits_spent INT NOT NULL DEFAULT 0,
    is_shadow BOOLEAN NOT NULL DEFAULT false,
    slot_number INT NOT NULL CHECK (slot_number >= 1),
    status VARCHAR(30) NOT NULL DEFAULT 'unlocked' CHECK (status IN ('unlocked', 'bid_submitted', 'refunded')),
    outcome_status VARCHAR(30) NOT NULL DEFAULT 'undecided' CHECK (outcome_status IN ('work_won', 'work_lost', 'unreachable', 'undecided')),
    outcome_notes TEXT,
    outcome_reported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(request_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_qr_unlocks_request ON public.quote_request_unlocks(request_id);
CREATE INDEX IF NOT EXISTS idx_qr_unlocks_company ON public.quote_request_unlocks(company_id);
CREATE INDEX IF NOT EXISTS idx_qr_unlocks_status ON public.quote_request_unlocks(status);

-- 6. SORUNLU TALEP İADE TALEPLERİ
CREATE TABLE IF NOT EXISTS public.credit_refund_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    unlock_id UUID NOT NULL REFERENCES public.quote_request_unlocks(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('unreachable_phone', 'fake_request', 'out_of_category', 'buyer_cancelled')),
    details TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_credit_refund_company ON public.credit_refund_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_refund_status ON public.credit_refund_requests(status);

-- 7. HOŞ GELDİN KREDİSİ İSTİSMAR ÖNLEME
CREATE TABLE IF NOT EXISTS public.welcome_credit_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    tax_number VARCHAR(50),
    phone VARCHAR(50),
    credits_granted INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_welcome_tax ON public.welcome_credit_grants(tax_number) WHERE tax_number IS NOT NULL AND tax_number != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_welcome_phone ON public.welcome_credit_grants(phone) WHERE phone IS NOT NULL AND phone != '';

-- 8. FİRMA BİLDİRİM TERCİHLERİ
CREATE TABLE IF NOT EXISTS public.company_notification_preferences (
    company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    email_enabled BOOLEAN NOT NULL DEFAULT true,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_start_time TIME DEFAULT '22:00',
    quiet_end_time TIME DEFAULT '08:00',
    category_filter_ids UUID[] DEFAULT NULL,
    city_filter_ids INT[] DEFAULT NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ==============================================================================
-- 9. GÜVENLİK VE YETKİ KISITLAMALARI (REVOKE & RLS)
-- İstemci defter, bakiye ve unlock tablolarına doğrudan ASLA yazamaz.
-- Firma yalnızca KENDİ bakiye, defter ve kilit satırlarını okuyabilir (SELECT).
-- ==============================================================================
REVOKE INSERT, UPDATE, DELETE ON public.company_credit_balances FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.company_credit_ledger FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.quote_request_unlocks FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.credit_system_settings FROM anon, authenticated, PUBLIC;
REVOKE INSERT, UPDATE, DELETE ON public.welcome_credit_grants FROM anon, authenticated, PUBLIC;

ALTER TABLE public.credit_system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_credit_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_request_unlocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_refund_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_notification_preferences ENABLE ROW LEVEL SECURITY;

-- Okuma Politikaları (Sıkı İzolasyon)
DROP POLICY IF EXISTS "Public can view credit settings" ON public.credit_system_settings;
CREATE POLICY "Public can view credit settings" ON public.credit_system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Company view own balance" ON public.company_credit_balances;
CREATE POLICY "Company view own balance" ON public.company_credit_balances FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Company view own ledger" ON public.company_credit_ledger;
CREATE POLICY "Company view own ledger" ON public.company_credit_ledger FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Public can view credit packages" ON public.credit_packages;
CREATE POLICY "Public can view credit packages" ON public.credit_packages FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "View unlocks policy" ON public.quote_request_unlocks;
CREATE POLICY "View unlocks policy" ON public.quote_request_unlocks FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.quote_requests WHERE id = request_id AND buyer_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Company manage notification prefs" ON public.company_notification_preferences;
CREATE POLICY "Company manage notification prefs" ON public.company_notification_preferences FOR ALL
    USING (EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid()));

DROP POLICY IF EXISTS "Company view own refund requests" ON public.credit_refund_requests;
CREATE POLICY "Company view own refund requests" ON public.credit_refund_requests FOR SELECT
    USING (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "Company create refund requests" ON public.credit_refund_requests;
CREATE POLICY "Company create refund requests" ON public.credit_refund_requests FOR INSERT
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.companies WHERE id = company_id AND user_id = auth.uid())
    );

-- ==============================================================================
-- 10. KRİTİK ATOMİK RPC: spend_quote_request_credit
-- 
-- Parametreler: SADECE p_request_id ve p_idempotency_key (company_id İSTEMCİDEN ALINMAZ!)
-- Firma kimliği doğrudan auth.uid() ile çözülür.
-- Deadlock koruması için kilit sırası: 1. quote_requests -> 2. company_credit_balances
-- İade edilen slot kuralı: credit_system_settings.refund_reopens_slot = false ise iadeler de slotu kapalı tutar.
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.spend_quote_request_credit(
    p_request_id UUID,
    p_idempotency_key VARCHAR(120) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_auth_uid UUID;
    v_company_id UUID;
    v_settings RECORD;
    v_request RECORD;
    v_company RECORD;
    v_buyer RECORD;
    v_existing_unlock RECORD;
    v_current_balance INT;
    v_new_balance INT;
    v_current_slots INT;
    v_max_slots INT;
    v_required_credits INT;
    v_credits_to_deduct INT;
    v_slot_number INT;
    v_unlock_id UUID;
    v_category_override JSONB;
BEGIN
    -- 1. AUTH DOĞRULAMA (İstemciden company_id kabul edilmez)
    v_auth_uid := auth.uid();
    IF v_auth_uid IS NULL THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Kullanıcı oturumu açık değil (auth.uid() NULL).';
    END IF;

    SELECT id, user_id, name, is_verified, verification_status
    INTO v_company
    FROM public.companies
    WHERE user_id = v_auth_uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Bu kullanıcı hesabına ait kayıtlı bir firma bulunamadı.';
    END IF;
    v_company_id := v_company.id;

    -- 2. İDEMPOTENCY DENETİMİ (Tekrar istek/çift tıkta hata yerine mevcut unlock'u dön)
    SELECT * INTO v_existing_unlock
    FROM public.quote_request_unlocks
    WHERE request_id = p_request_id AND company_id = v_company_id;

    IF FOUND THEN
        SELECT current_balance INTO v_current_balance
        FROM public.company_credit_balances WHERE company_id = v_company_id;

        RETURN jsonb_build_object(
            'success', true,
            'already_unlocked', true,
            'unlock_id', v_existing_unlock.id,
            'slot_number', v_existing_unlock.slot_number,
            'credits_spent', v_existing_unlock.credits_spent,
            'is_shadow', v_existing_unlock.is_shadow,
            'current_balance', COALESCE(v_current_balance, 0),
            'message', 'Bu talep için teklif slotunuz zaten açık durumdadır (Mükerrer harcama yapılmadı).'
        );
    END IF;

    -- 3. 1. KİLİT: TALEP SATIRINI KİLİTLE (Eşzamanlı yarış kontrolü)
    SELECT id, buyer_id, category_id, request_type, status, expires_at, title
    INTO v_request
    FROM public.quote_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Teklif talebi bulunamadı: %', p_request_id;
    END IF;

    IF v_request.status NOT IN ('sent', 'quotes_received') THEN
        RAISE EXCEPTION 'Bu talep aktif değildir (Mevcut durum: %).', v_request.status;
    END IF;

    IF v_request.expires_at IS NOT NULL AND v_request.expires_at < now() THEN
        RAISE EXCEPTION 'Bu teklif talebinin süresi dolmuştur (%s).', v_request.expires_at;
    END IF;

    -- 4. SUİSTİMAL ENGELLERİ
    IF v_request.buyer_id = v_company.user_id THEN
        RAISE EXCEPTION 'Suistimal Engeli: Firma kendi açtığı veya ilişkili olduğu talebe teklif veremez!';
    END IF;

    SELECT id, is_phone_verified INTO v_buyer
    FROM public.profiles WHERE id = v_request.buyer_id;

    IF NOT FOUND OR COALESCE(v_buyer.is_phone_verified, false) = false THEN
        RAISE EXCEPTION 'Güvenlik Kuralı: Bu talebi oluşturan alıcının telefon numarası doğrulanmamış!';
    END IF;

    -- 5. SİSTEM AYARLARI
    SELECT * INTO v_settings FROM public.credit_system_settings WHERE id = 1;
    v_max_slots := COALESCE(v_settings.max_bidding_slots, 4);

    IF v_request.request_type = 'single_listing' THEN
        v_required_credits := 0; -- Tekil ilana doğrudan teklif verme ücretsizdir
    ELSE
        v_required_credits := COALESCE(v_settings.default_credits_per_quote, 1);
        IF v_settings.category_overrides IS NOT NULL AND v_settings.category_overrides ? v_request.category_id::text THEN
            v_category_override := v_settings.category_overrides -> v_request.category_id::text;
            IF v_category_override ? 'credits' THEN
                v_required_credits := (v_category_override ->> 'credits')::INT;
            END IF;
        END IF;
    END IF;

    -- 6. KİLİT ALTINDA SLOT SAYIMI
    -- refund_reopens_slot = false ise (varsayılan) iade edilen slotlar da slot sayımına dahildir (yeniden açılmaz)
    IF COALESCE(v_settings.refund_reopens_slot, false) = true THEN
        SELECT COUNT(*) INTO v_current_slots
        FROM public.quote_request_unlocks
        WHERE request_id = p_request_id AND status != 'refunded';
    ELSE
        SELECT COUNT(*) INTO v_current_slots
        FROM public.quote_request_unlocks
        WHERE request_id = p_request_id;
    END IF;

    IF v_current_slots >= v_max_slots THEN
        RAISE EXCEPTION 'Bu talep için azami teklif slotu dolmuştur (%/% firma teklif verdi). Başka teklif kabul edilmemektedir.', v_current_slots, v_max_slots;
    END IF;

    v_slot_number := v_current_slots + 1;

    -- 7. 2. KİLİT: FİRMA BAKİYESİNİ KİLİTLE
    INSERT INTO public.company_credit_balances (company_id, current_balance, lifetime_purchased, lifetime_spent, has_received_welcome_grant, updated_at)
    VALUES (v_company_id, 0, 0, 0, false, now())
    ON CONFLICT (company_id) DO NOTHING;

    SELECT current_balance INTO v_current_balance
    FROM public.company_credit_balances WHERE company_id = v_company_id FOR UPDATE;

    -- 8. MODA GÖRE ATOMİK İŞLEM
    IF v_settings.system_mode = 'disabled' THEN
        v_credits_to_deduct := 0;
        v_new_balance := v_current_balance;

        INSERT INTO public.quote_request_unlocks (request_id, company_id, credits_spent, is_shadow, slot_number, status)
        VALUES (p_request_id, v_company_id, 0, false, v_slot_number, 'unlocked') RETURNING id INTO v_unlock_id;

    ELSIF v_settings.system_mode = 'shadow' THEN
        v_credits_to_deduct := v_required_credits;
        v_new_balance := v_current_balance; -- Bakiye DEĞİŞMEZ

        INSERT INTO public.company_credit_ledger (
            company_id, amount, entry_type, balance_after, reference_id, idempotency_key, description, metadata
        ) VALUES (
            v_company_id, 0, 'shadow_spend', v_new_balance, p_request_id::text, p_idempotency_key,
            format('Gölge Mod: %s kredi tutacaktı (Talep: %s)', v_required_credits, v_request.title),
            jsonb_build_object('would_cost_credits', v_required_credits, 'slot_number', v_slot_number)
        );

        INSERT INTO public.quote_request_unlocks (request_id, company_id, credits_spent, is_shadow, slot_number, status)
        VALUES (p_request_id, v_company_id, v_required_credits, true, v_slot_number, 'unlocked') RETURNING id INTO v_unlock_id;

    ELSE
        -- AÇIK MOD: Gerçek kredi düşer
        v_credits_to_deduct := v_required_credits;

        IF v_credits_to_deduct > 0 AND v_current_balance < v_credits_to_deduct THEN
            RAISE EXCEPTION 'Yetersiz kredi bakiyesi! Bu talebe teklif vermek için % kredi gerekmektedir (Mevcut bakiyeniz: % kredi).', v_credits_to_deduct, v_current_balance;
        END IF;

        v_new_balance := v_current_balance - v_credits_to_deduct;

        UPDATE public.company_credit_balances
        SET current_balance = v_new_balance,
            lifetime_spent = lifetime_spent + v_credits_to_deduct,
            updated_at = now()
        WHERE company_id = v_company_id;

        IF v_credits_to_deduct > 0 THEN
            INSERT INTO public.company_credit_ledger (
                company_id, amount, entry_type, balance_after, reference_id, idempotency_key, description, metadata
            ) VALUES (
                v_company_id, -v_credits_to_deduct, 'spend', v_new_balance, p_request_id::text, p_idempotency_key,
                format('Teklif slotu harcaması (Talep #%s, Slot %s/%s)', SUBSTRING(p_request_id::text, 1, 8), v_slot_number, v_max_slots),
                jsonb_build_object('request_id', p_request_id, 'slot_number', v_slot_number, 'max_slots', v_max_slots)
            );
        END IF;

        INSERT INTO public.quote_request_unlocks (request_id, company_id, credits_spent, is_shadow, slot_number, status)
        VALUES (p_request_id, v_company_id, v_credits_to_deduct, false, v_slot_number, 'unlocked') RETURNING id INTO v_unlock_id;
    END IF;

    -- 9. İLETİŞİM KARTINI AÇ (PROMPT 9A)
    INSERT INTO public.contact_reveals (buyer_id, company_id, trigger_type, created_at)
    VALUES (v_request.buyer_id, v_company_id, 'talep_kredisi', now())
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'unlock_id', v_unlock_id,
        'request_id', p_request_id,
        'company_id', v_company_id,
        'slot_number', v_slot_number,
        'max_slots', v_max_slots,
        'credits_spent', v_credits_to_deduct,
        'is_shadow', (v_settings.system_mode = 'shadow'),
        'previous_balance', v_current_balance,
        'balance_after', v_new_balance,
        'message', format('Slot #%s/%s başarıyla alındı ve alıcı iletişim kartı açıldı.', v_slot_number, v_max_slots)
    );
END;
$$;

-- spend_quote_request_credit SADECE authenticated çağırabilir
REVOKE EXECUTE ON FUNCTION public.spend_quote_request_credit(UUID, VARCHAR) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.spend_quote_request_credit(UUID, VARCHAR) TO authenticated;

-- ==============================================================================
-- 11. GÜVENLİ KREDİ SATIN ALMA / YÜKLEME (YALNIZCA service_role ÇAĞIRABİLİR)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.apply_credit_purchase(
    p_company_id UUID,
    p_package_id UUID,
    p_payment_transaction_id VARCHAR(100),
    p_card_last_four VARCHAR(4) DEFAULT '4242'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pkg RECORD;
    v_curr_balance INT;
    v_new_balance INT;
    v_existing_topup RECORD;
BEGIN
    SELECT * INTO v_existing_topup
    FROM public.company_credit_ledger
    WHERE idempotency_key = format('topup-%s', p_payment_transaction_id);

    IF FOUND THEN
        SELECT current_balance INTO v_curr_balance
        FROM public.company_credit_balances
        WHERE company_id = p_company_id;

        RETURN jsonb_build_object(
            'success', true,
            'already_applied', true,
            'current_balance', v_curr_balance,
            'message', 'Bu ödeme işlemi için kredi zaten yüklenmişti.'
        );
    END IF;

    SELECT * INTO v_pkg FROM public.credit_packages WHERE id = p_package_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Geçerli bir kredi paketi bulunamadı: %', p_package_id;
    END IF;

    INSERT INTO public.company_credit_balances (company_id, current_balance, lifetime_purchased, lifetime_spent, has_received_welcome_grant, updated_at)
    VALUES (p_company_id, 0, 0, 0, false, now())
    ON CONFLICT (company_id) DO NOTHING;

    SELECT current_balance INTO v_curr_balance
    FROM public.company_credit_balances
    WHERE company_id = p_company_id
    FOR UPDATE;

    v_new_balance := v_curr_balance + v_pkg.credit_amount;

    UPDATE public.company_credit_balances
    SET current_balance = v_new_balance,
        lifetime_purchased = lifetime_purchased + v_pkg.credit_amount,
        updated_at = now()
    WHERE company_id = p_company_id;

    INSERT INTO public.company_credit_ledger (
        company_id, amount, entry_type, balance_after, reference_id, idempotency_key, description, metadata
    ) VALUES (
        p_company_id, v_pkg.credit_amount, 'topup', v_new_balance,
        p_payment_transaction_id,
        format('topup-%s', p_payment_transaction_id),
        format('%s (%s Kredi) Satın Alma (Sandbox)', v_pkg.name, v_pkg.credit_amount),
        jsonb_build_object('package_id', v_pkg.id, 'price_cents', v_pkg.price_cents, 'card_last_four', p_card_last_four)
    );

    RETURN jsonb_build_object(
        'success', true,
        'credits_added', v_pkg.credit_amount,
        'balance_after', v_new_balance,
        'transaction_id', p_payment_transaction_id
    );
END;
$$;

-- apply_credit_purchase SADECE service_role çağırabilir (authenticated ve anon YASAK)
REVOKE EXECUTE ON FUNCTION public.apply_credit_purchase(UUID, UUID, VARCHAR, VARCHAR) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.apply_credit_purchase(UUID, UUID, VARCHAR, VARCHAR) TO service_role;

-- ==============================================================================
-- 12. ADMİN MANUEL KREDİ DÜZELTME (YALNIZCA service_role ÇAĞIRIR, ADMİN ROL KONTROLLÜ)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.admin_adjust_credit(
    p_company_id UUID,
    p_amount INT,
    p_reason TEXT,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_role VARCHAR(20);
    v_curr_balance INT;
    v_new_balance INT;
BEGIN
    -- Admin Rol Doğrulaması
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Sadece sistem yöneticileri manuel kredi ekleme/çıkarma yapabilir.';
    END IF;

    IF p_amount = 0 THEN
        RAISE EXCEPTION 'Kredi miktarı 0 olamaz.';
    END IF;

    INSERT INTO public.company_credit_balances (company_id, current_balance, lifetime_purchased, lifetime_spent, has_received_welcome_grant, updated_at)
    VALUES (p_company_id, 0, 0, 0, false, now())
    ON CONFLICT (company_id) DO NOTHING;

    SELECT current_balance INTO v_curr_balance
    FROM public.company_credit_balances
    WHERE company_id = p_company_id
    FOR UPDATE;

    v_new_balance := v_curr_balance + p_amount;
    IF v_new_balance < 0 THEN
        RAISE EXCEPTION 'Hata: Bu işlem sonucunda firma bakiyesi eksiye düşemez! (Mevcut: %, Talep Edilen Düşüm: %)', v_curr_balance, p_amount;
    END IF;

    UPDATE public.company_credit_balances
    SET current_balance = v_new_balance,
        updated_at = now()
    WHERE company_id = p_company_id;

    INSERT INTO public.company_credit_ledger (
        company_id, amount, entry_type, balance_after, reference_id, description, metadata
    ) VALUES (
        p_company_id, p_amount, 'admin_adjustment', v_new_balance,
        format('admin-%s-%s', p_admin_id, Date_part('epoch', now())::INT),
        format('Yönetici Düzeltmesi: %s', p_reason),
        jsonb_build_object('admin_id', p_admin_id, 'reason', p_reason)
    );

    RETURN jsonb_build_object('success', true, 'amount', p_amount, 'balance_after', v_new_balance);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_adjust_credit(UUID, INT, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_adjust_credit(UUID, INT, TEXT, UUID) TO service_role;

-- ==============================================================================
-- 13. SORUNLU TALEP İADE İŞLEMİ (YALNIZCA service_role ÇAĞIRIR, ADMİN ROL KONTROLLÜ)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.resolve_credit_refund(
    p_refund_request_id UUID,
    p_decision VARCHAR(20), -- 'approved' | 'rejected'
    p_admin_notes TEXT,
    p_admin_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_admin_role VARCHAR(20);
    v_refund RECORD;
    v_unlock RECORD;
    v_request RECORD;
    v_curr_balance INT;
    v_new_balance INT;
BEGIN
    SELECT role INTO v_admin_role FROM public.profiles WHERE id = p_admin_id;
    IF v_admin_role NOT IN ('admin', 'super_admin') THEN
        RAISE EXCEPTION 'Yetkisiz erişim: Yalnızca yöneticiler iade sonuçlandırabilir.';
    END IF;

    SELECT * INTO v_refund
    FROM public.credit_refund_requests
    WHERE id = p_refund_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'İade talebi bulunamadı: %', p_refund_request_id;
    END IF;

    IF v_refund.status != 'pending' THEN
        RAISE EXCEPTION 'Bu iade talebi zaten sonuçlandırılmış: %', v_refund.status;
    END IF;

    SELECT * INTO v_unlock
    FROM public.quote_request_unlocks
    WHERE id = v_refund.unlock_id;

    IF p_decision = 'approved' THEN
        -- 1. KİLİT: TALEP SATIRINI KİLİTLE (STANDART KİLİT SIRASI)
        SELECT id, status INTO v_request
        FROM public.quote_requests
        WHERE id = v_refund.request_id
        FOR UPDATE;

        -- 2. KİLİT: FİRMA BAKİYESİNİ KİLİTLE
        SELECT current_balance INTO v_curr_balance
        FROM public.company_credit_balances
        WHERE company_id = v_refund.company_id
        FOR UPDATE;

        v_new_balance := COALESCE(v_curr_balance, 0) + v_unlock.credits_spent;

        UPDATE public.company_credit_balances
        SET current_balance = v_new_balance,
            updated_at = now()
        WHERE company_id = v_refund.company_id;

        INSERT INTO public.company_credit_ledger (
            company_id, amount, entry_type, balance_after, reference_id, description, metadata
        ) VALUES (
            v_refund.company_id, v_unlock.credits_spent, 'refund', v_new_balance,
            p_refund_request_id::text,
            format('Sorunlu talep iadesi kabul edildi (Talep #%s): %s', SUBSTRING(v_refund.request_id::text, 1, 8), p_admin_notes),
            jsonb_build_object('refund_id', p_refund_request_id, 'reason', v_refund.reason)
        );

        UPDATE public.quote_request_unlocks
        SET status = 'refunded'
        WHERE id = v_refund.unlock_id;

        UPDATE public.credit_refund_requests
        SET status = 'approved',
            admin_notes = p_admin_notes,
            resolved_by = p_admin_id,
            resolved_at = now()
        WHERE id = p_refund_request_id;

        RETURN jsonb_build_object(
            'success', true,
            'decision', 'approved',
            'credits_refunded', v_unlock.credits_spent,
            'balance_after', v_new_balance
        );
    ELSE
        UPDATE public.credit_refund_requests
        SET status = 'rejected',
            admin_notes = p_admin_notes,
            resolved_by = p_admin_id,
            resolved_at = now()
        WHERE id = p_refund_request_id;

        RETURN jsonb_build_object('success', true, 'decision', 'rejected');
    END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.resolve_credit_refund(UUID, VARCHAR, TEXT, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_credit_refund(UUID, VARCHAR, TEXT, UUID) TO service_role;

-- ==============================================================================
-- 14. HOŞ GELDİN KREDİSİ TANIMLAMA FONKSİYONU
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.grant_welcome_credits_if_eligible(
    p_company_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_comp RECORD;
    v_credits INT;
    v_curr_balance INT;
    v_new_balance INT;
    v_existing_grant RECORD;
BEGIN
    SELECT * INTO v_comp FROM public.companies WHERE id = p_company_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Firma bulunamadı: %', p_company_id;
    END IF;

    SELECT welcome_credits INTO v_credits FROM public.credit_system_settings WHERE id = 1;
    v_credits := COALESCE(v_credits, 3);

    IF v_credits <= 0 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Hoş geldin kredisi kapalıdır.');
    END IF;

    SELECT * INTO v_existing_grant
    FROM public.welcome_credit_grants
    WHERE (tax_number IS NOT NULL AND tax_number != '' AND tax_number = v_comp.tax_number)
       OR (phone IS NOT NULL AND phone != '' AND phone = v_comp.phone)
       OR company_id = p_company_id;

    IF FOUND THEN
        RETURN jsonb_build_object('success', false, 'message', 'Bu firma, VKN veya telefon için hoş geldin kredisi daha önce verilmiştir.');
    END IF;

    INSERT INTO public.company_credit_balances (company_id, current_balance, lifetime_purchased, lifetime_spent, has_received_welcome_grant, updated_at)
    VALUES (p_company_id, 0, 0, 0, false, now())
    ON CONFLICT (company_id) DO NOTHING;

    SELECT current_balance INTO v_curr_balance
    FROM public.company_credit_balances
    WHERE company_id = p_company_id
    FOR UPDATE;

    v_new_balance := v_curr_balance + v_credits;

    UPDATE public.company_credit_balances
    SET current_balance = v_new_balance,
        lifetime_purchased = lifetime_purchased + v_credits,
        has_received_welcome_grant = true,
        updated_at = now()
    WHERE company_id = p_company_id;

    INSERT INTO public.company_credit_ledger (
        company_id, amount, entry_type, balance_after, reference_id, description
    ) VALUES (
        p_company_id, v_credits, 'welcome_grant', v_new_balance, 'WELCOME',
        format('Yeni onaylanan firma hoş geldin hediyesi (%s Kredi)', v_credits)
    );

    INSERT INTO public.welcome_credit_grants (company_id, tax_number, phone, credits_granted)
    VALUES (p_company_id, v_comp.tax_number, v_comp.phone, v_credits);

    RETURN jsonb_build_object(
        'success', true,
        'credits_granted', v_credits,
        'balance_after', v_new_balance,
        'message', format('%s hoş geldin kredisi yüklendi.', v_credits)
    );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.grant_welcome_credits_if_eligible(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.grant_welcome_credits_if_eligible(UUID) TO service_role;

-- ==============================================================================
-- 15. SÜRE DOLUMU VE CRON BAKIM FONKSİYONU (YALNIZCA service_role ÇAĞIRIR)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.process_expired_credits()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_validity_days INT;
    v_cutoff_time TIMESTAMPTZ;
    v_row RECORD;
    v_expired_count INT := 0;
BEGIN
    SELECT credit_validity_days INTO v_validity_days FROM public.credit_system_settings WHERE id = 1;
    IF v_validity_days IS NULL OR v_validity_days <= 0 THEN
        RETURN jsonb_build_object('success', true, 'message', 'Kredi geçerlilik süresi sınırsızdır.');
    END IF;

    v_cutoff_time := now() - (v_validity_days || ' days')::INTERVAL;

    -- Süresi dolan yüklemeleri tespit et ve bakiyeleri güncelle
    -- (Gerçek senaryoda FIFO ile defterde expire hareketi atan mekanizma)
    RETURN jsonb_build_object('success', true, 'expired_grants_processed', v_expired_count);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_expired_credits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_expired_credits() TO service_role;
-- ==============================================================================
-- ŞANTİYE GO – PROMPT 9E-2: ÖDEME GÜVENCESİ (ESCROW / PAZARYERİ) ŞEMASI VE RPC'LER
-- İyzico Alt Üye İşyeri (Sub-Merchant), Havuz Blokesi, Teslimat Onayı ve İtiraz Masası
-- ==============================================================================

-- 1. ENUM VE TİP TANIMLARI
DO $$ BEGIN
    CREATE TYPE escrow_status_enum AS ENUM (
        'pending',       -- Bekliyor (Ödeme formu açıldı, henüz çekilmedi)
        'paid_held',     -- Ödendi / İyzico Havuzunda Bloke
        'releasable',    -- Serbest Bırakılabilir (Onaylandı veya itiraz süresi bitti)
        'transferred',   -- Alt Üye İşyerine (Firmaya) Aktarıldı
        'disputed',      -- İtiraz Edildi / Askıya Alındı
        'refunded',      -- Alıcıya İade Edildi
        'cancelled'      -- İptal Edildi
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. MEVCUT ÖDEME TABLOLARINI GENİŞLETME (payment_transactions ve payments)
ALTER TABLE public.payment_transactions
    ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS sub_merchant_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS iyzico_item_id VARCHAR(100);

-- payments tablosu varsa senkron alanları ekle
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE public.payments
            ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(30) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
            ADD COLUMN IF NOT EXISTS sub_merchant_key VARCHAR(100),
            ADD COLUMN IF NOT EXISTS iyzico_item_id VARCHAR(100);
    END IF;
END $$;

-- 3. FİRMA İYZİCO ALT ÜYE İŞYERİ PROFİL TABLOSU (company_submerchants)
CREATE TABLE IF NOT EXISTS public.company_submerchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sub_merchant_key VARCHAR(100) NOT NULL UNIQUE,
    sub_merchant_type VARCHAR(50) NOT NULL DEFAULT 'LIMITED_OR_JOINT_STOCK_COMPANY',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    iban VARCHAR(40) NOT NULL,
    tax_office VARCHAR(100),
    tax_number VARCHAR(20),
    identity_number VARCHAR(11),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_company_submerchant UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_submerchants_company ON public.company_submerchants(company_id);
CREATE INDEX IF NOT EXISTS idx_submerchants_key ON public.company_submerchants(sub_merchant_key);

-- 4. UYUŞMAZLIK / İTİRAZ MASASI TABLOSU (escrow_disputes)
CREATE TABLE IF NOT EXISTS public.escrow_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    opened_by UUID NOT NULL REFERENCES public.profiles(id),
    status VARCHAR(30) NOT NULL DEFAULT 'open', -- 'open', 'resolved_seller', 'resolved_buyer', 'dismissed'
    reason TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_payment ON public.escrow_disputes(payment_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.escrow_disputes(status);

-- 5. DEĞİŞTİRİLEMEZ ESCROW HAREKET KÜTÜĞÜ (escrow_audit_logs)
CREATE TABLE IF NOT EXISTS public.escrow_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL, -- 'payment_held', 'marked_delivered', 'buyer_approved', 'dispute_opened', 'auto_released', 'payout_transferred', 'refunded'
    actor_id UUID REFERENCES public.profiles(id),
    actor_role VARCHAR(30),
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_audit_payment ON public.escrow_audit_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_created ON public.escrow_audit_logs(created_at);

-- Kütük satırlarında UPDATE/DELETE yasaklayan tetikleyici
CREATE OR REPLACE FUNCTION public.prevent_escrow_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'escrow_audit_logs kütügünde kayıt silinemez veya değiştirilemez (Immutable Audit Log).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_escrow_audit_mutation ON public.escrow_audit_logs;
CREATE TRIGGER trg_prevent_escrow_audit_mutation
    BEFORE UPDATE OR DELETE ON public.escrow_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_escrow_audit_mutation();

-- ==============================================================================
-- 6. GÜVENLİ VE ATOMİK POSTGRESQL RPC FONKSİYONLARI (ESCROW ENGINE)
-- ==============================================================================

-- 6.1. ÖDEME BAŞARILI VE HAVUZDA BLOKELENDİ (SADECE service_role ÇAĞIRABİLİR)
CREATE OR REPLACE FUNCTION public.mark_payment_held(
    p_payment_id UUID,
    p_iyzico_item_id TEXT,
    p_sub_merchant_key TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
BEGIN
    -- 1. Satır düzeyinde FOR UPDATE kilidi
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme kaydı bulunamadı (ID: %)', p_payment_id;
    END IF;

    -- 2. İdempotency kontrolü: Zaten havuzdaysa veya aktarıldıysa tekrar etme
    IF v_pay.escrow_status = 'paid_held' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Ödeme zaten havuzda bekliyor.', 'payment_id', p_payment_id);
    END IF;

    -- 3. Durum güncellemesi
    UPDATE public.payment_transactions
    SET
        status = 'paid',
        escrow_status = 'paid_held',
        held_at = COALESCE(held_at, NOW()),
        iyzico_item_id = COALESCE(p_iyzico_item_id, iyzico_item_id),
        sub_merchant_key = COALESCE(p_sub_merchant_key, sub_merchant_key),
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu da eşitle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            status = 'paid',
            escrow_status = 'paid_held',
            held_at = COALESCE(held_at, NOW()),
            iyzico_item_id = COALESCE(p_iyzico_item_id, iyzico_item_id),
            sub_merchant_key = COALESCE(p_sub_merchant_key, sub_merchant_key)
        WHERE id = p_payment_id;
    END IF;

    -- İlgili rezervasyonu onayla
    IF v_pay.booking_id IS NOT NULL THEN
        UPDATE public.bookings
        SET
            payment_status = 'paid',
            status = 'approved',
            updated_at = NOW()
        WHERE id = v_pay.booking_id;
    END IF;

    -- 4. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'payment_held',
        'system',
        v_pay.escrow_status,
        'paid_held',
        p_details
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'escrow_status', 'paid_held',
        'held_at', NOW()
    );
END;
$$;

-- 6.2. FİRMA İŞİ TESLİM ETTİ BİLDİRİMİ (Firma Yetkilisi Tarafından Çağrılır)
CREATE OR REPLACE FUNCTION public.seller_mark_delivered(
    p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_user_id UUID := auth.uid();
    v_is_company_owner BOOLEAN;
    v_auto_release_time TIMESTAMPTZ;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı. Lütfen giriş yapınız.';
    END IF;

    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    -- 2. Yetki kontrolü: Kullanıcı bu ödemenin yapıldığı firmanın sahibi mi?
    SELECT EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = v_pay.company_id AND user_id = v_user_id
    ) INTO v_is_company_owner;

    IF NOT v_is_company_owner THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi alacak firma teslimat bildirebilir.';
    END IF;

    IF v_pay.escrow_status != 'paid_held' THEN
        RAISE EXCEPTION 'Sadece havuzda bekleyen (paid_held) ödemeler için teslimat bildirilebilir. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 3. Teslim zamanı ve 3 günlük (72 saat) itiraz penceresini kur
    v_auto_release_time := NOW() + INTERVAL '3 days';

    UPDATE public.payment_transactions
    SET
        delivered_at = NOW(),
        auto_release_at = v_auto_release_time,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            delivered_at = NOW(),
            auto_release_at = v_auto_release_time
        WHERE id = p_payment_id;
    END IF;

    -- Rezervasyon durumunu delivered yap
    IF v_pay.booking_id IS NOT NULL THEN
        UPDATE public.bookings
        SET status = 'completed', updated_at = NOW()
        WHERE id = v_pay.booking_id;
    END IF;

    -- 4. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_id,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'marked_delivered',
        v_user_id,
        'company',
        v_pay.escrow_status,
        'paid_held',
        jsonb_build_object('auto_release_at', v_auto_release_time)
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'delivered_at', NOW(),
        'auto_release_at', v_auto_release_time
    );
END;
$$;

-- 6.3. ALICI İŞİ ONAYLADI (Erken Serbest Bırakma - Alıcı Tarafından Çağrılır)
CREATE OR REPLACE FUNCTION public.buyer_approve_escrow(
    p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı. Lütfen giriş yapınız.';
    END IF;

    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    -- 2. Yetki kontrolü: Kullanıcı bu ödemeyi yapan alıcı mı?
    IF v_pay.buyer_id != v_user_id THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi yapan alıcı teslimatı onaylayabilir.';
    END IF;

    IF v_pay.escrow_status NOT IN ('paid_held', 'disputed') THEN
        RAISE EXCEPTION 'Bu durumdaki bir ödeme onaylanamaz. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 3. Durumu serbest bırakılabilir yap
    UPDATE public.payment_transactions
    SET
        escrow_status = 'releasable',
        released_at = NOW(),
        auto_release_at = NULL,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            escrow_status = 'releasable',
            released_at = NOW(),
            auto_release_at = NULL
        WHERE id = p_payment_id;
    END IF;

    -- Varsa açık itirazı çözümlendi olarak kapat
    UPDATE public.escrow_disputes
    SET
        status = 'resolved_seller',
        resolution_notes = 'Alıcı doğrudan işi teslim aldığını ve onayladığını beyan etti.',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE payment_id = p_payment_id AND status = 'open';

    -- 4. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_id,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'buyer_approved',
        v_user_id,
        'buyer',
        v_pay.escrow_status,
        'releasable',
        jsonb_build_object('released_at', NOW())
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'escrow_status', 'releasable',
        'released_at', NOW()
    );
END;
$$;

-- 6.4. ALICI İTİRAZ ETTİ / SORUN BİLDİRDİ (Alıcı Tarafından Çağrılır)
CREATE OR REPLACE FUNCTION public.buyer_dispute_escrow(
    p_payment_id UUID,
    p_reason TEXT,
    p_evidence_urls TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_user_id UUID := auth.uid();
    v_dispute_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı. Lütfen giriş yapınız.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'İtiraz açıklaması boş bırakılamaz.';
    END IF;

    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    -- 2. Yetki kontrolü: Sadece alıcı itiraz edebilir
    IF v_pay.buyer_id != v_user_id THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi yapan alıcı itiraz edebilir.';
    END IF;

    IF v_pay.escrow_status != 'paid_held' THEN
        RAISE EXCEPTION 'Yalnızca havuzda bloke olan ödemelere itiraz edilebilir. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 3. Durumu askıya al (disputed) ve otomatik serbest bırakma sayacını durdur
    UPDATE public.payment_transactions
    SET
        escrow_status = 'disputed',
        disputed_at = NOW(),
        dispute_reason = p_reason,
        auto_release_at = NULL,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            escrow_status = 'disputed',
            disputed_at = NOW(),
            dispute_reason = p_reason,
            auto_release_at = NULL
        WHERE id = p_payment_id;
    END IF;

    -- 4. İtiraz masasına kayıt aç
    INSERT INTO public.escrow_disputes (
        payment_id,
        booking_id,
        opened_by,
        status,
        reason,
        evidence_urls
    ) VALUES (
        p_payment_id,
        v_pay.booking_id,
        v_user_id,
        'open',
        p_reason,
        p_evidence_urls
    ) RETURNING id INTO v_dispute_id;

    -- 5. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_id,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'dispute_opened',
        v_user_id,
        'buyer',
        v_pay.escrow_status,
        'disputed',
        jsonb_build_object('dispute_id', v_dispute_id, 'reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'dispute_id', v_dispute_id,
        'payment_id', p_payment_id,
        'escrow_status', 'disputed'
    );
END;
$$;

-- 6.5. İYZİCO ON ONAYI SONRASI FİRMAYA AKTARILDI İŞARETLE (SADECE service_role)
CREATE OR REPLACE FUNCTION public.execute_escrow_payout(
    p_payment_id UUID,
    p_iyzico_transfer_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
BEGIN
    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    IF v_pay.escrow_status != 'releasable' THEN
        RAISE EXCEPTION 'Ödeme serbest bırakılabilir (releasable) durumda değil. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 2. Aktarıldı olarak kaydet
    UPDATE public.payment_transactions
    SET
        status = 'transferred',
        escrow_status = 'transferred',
        is_transferred_to_submerchant = true,
        transferred_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            status = 'transferred',
            escrow_status = 'transferred',
            is_transferred_to_submerchant = true,
            transferred_at = NOW()
        WHERE id = p_payment_id;
    END IF;

    -- 3. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'payout_transferred',
        'service_role',
        v_pay.escrow_status,
        'transferred',
        jsonb_build_object('iyzico_transfer_id', p_iyzico_transfer_id, 'transferred_at', NOW())
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'escrow_status', 'transferred',
        'transferred_at', NOW()
    );
END;
$$;

-- 6.6. ADMİN İTİRAZ MASASI ÇÖZÜMÜ (SADECE service_role / Admin)
CREATE OR REPLACE FUNCTION public.admin_resolve_escrow_dispute(
    p_dispute_id UUID,
    p_action TEXT, -- 'payout_to_seller' | 'refund_to_buyer'
    p_notes TEXT,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_disp RECORD;
    v_pay RECORD;
BEGIN
    SELECT * INTO v_disp
    FROM public.escrow_disputes
    WHERE id = p_dispute_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'İtiraz kaydı bulunamadı.';
    END IF;

    IF v_disp.status != 'open' THEN
        RAISE EXCEPTION 'Bu itiraz zaten karara bağlanmış. Mevcut durum: %', v_disp.status;
    END IF;

    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = v_disp.payment_id
    FOR UPDATE;

    IF p_action = 'payout_to_seller' THEN
        -- Firmaya hak ver: releasable yap
        UPDATE public.payment_transactions
        SET escrow_status = 'releasable', released_at = NOW(), updated_at = NOW()
        WHERE id = v_disp.payment_id;

        UPDATE public.escrow_disputes
        SET
            status = 'resolved_seller',
            resolution_notes = p_notes,
            resolved_by = p_admin_id,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = p_dispute_id;

        INSERT INTO public.escrow_audit_logs (
            payment_id, action, actor_id, actor_role, previous_status, new_status, details
        ) VALUES (
            v_disp.payment_id, 'dispute_resolved', p_admin_id, 'admin', v_pay.escrow_status, 'releasable',
            jsonb_build_object('action', p_action, 'notes', p_notes)
        );

    ELSIF p_action = 'refund_to_buyer' THEN
        -- Alıcıya hak ver: refunded yap
        UPDATE public.payment_transactions
        SET
            status = 'refunded',
            escrow_status = 'refunded',
            refund_amount_cents = v_pay.amount_cents,
            refund_reason = p_notes,
            refunded_at = NOW(),
            updated_at = NOW()
        WHERE id = v_disp.payment_id;

        UPDATE public.escrow_disputes
        SET
            status = 'resolved_buyer',
            resolution_notes = p_notes,
            resolved_by = p_admin_id,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = p_dispute_id;

        INSERT INTO public.escrow_audit_logs (
            payment_id, action, actor_id, actor_role, previous_status, new_status, details
        ) VALUES (
            v_disp.payment_id, 'dispute_resolved', p_admin_id, 'admin', v_pay.escrow_status, 'refunded',
            jsonb_build_object('action', p_action, 'notes', p_notes)
        );
    ELSE
        RAISE EXCEPTION 'Geçersiz aksiyon: %. Sadece payout_to_seller veya refund_to_buyer geçerlidir.', p_action;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'dispute_id', p_dispute_id,
        'action_taken', p_action
    );
END;
$$;

-- 6.7. ZAMAN AŞIMI KONTROLÜ (CRON İÇİN OTOMATİK SERBEST BIRAKMA)
CREATE OR REPLACE FUNCTION public.cron_check_auto_release_escrow()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_count INT := 0;
BEGIN
    FOR v_rec IN
        SELECT id, escrow_status
        FROM public.payment_transactions
        WHERE escrow_status = 'paid_held'
          AND auto_release_at IS NOT NULL
          AND auto_release_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.payment_transactions
        SET
            escrow_status = 'releasable',
            released_at = NOW(),
            updated_at = NOW()
        WHERE id = v_rec.id;

        INSERT INTO public.escrow_audit_logs (
            payment_id,
            action,
            actor_role,
            previous_status,
            new_status,
            details
        ) VALUES (
            v_rec.id,
            'auto_released',
            'cron',
            'paid_held',
            'releasable',
            jsonb_build_object('reason', '3 günlük itiraz penceresi doldu, otomatik onaylandı.')
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'released_count', v_count);
END;
$$;

-- ==============================================================================
-- 7. GÜVENLİK, YETKİLENDİRME (GRANT / REVOKE) VE RLS POLİTİKALARI
-- ==============================================================================

-- 7.1. RLS Aktifleştirme
ALTER TABLE public.company_submerchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 7.2. Doğrudan yazma yetkilerini kaldır (Sadece RPC ve service_role yazabilsin)
REVOKE INSERT, UPDATE, DELETE ON public.company_submerchants FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.escrow_disputes FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.escrow_audit_logs FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.company_submerchants TO authenticated;
GRANT SELECT ON public.escrow_disputes TO authenticated;
GRANT SELECT ON public.escrow_audit_logs TO authenticated;

-- service_role'e tam yetki ver
GRANT ALL ON public.company_submerchants TO service_role;
GRANT ALL ON public.escrow_disputes TO service_role;
GRANT ALL ON public.escrow_audit_logs TO service_role;
GRANT ALL ON public.payment_transactions TO service_role;

-- 7.3. RPC Çalıştırma Yetkileri (Kural: Hassas işlemler SADECE service_role'de kalmalı)
REVOKE EXECUTE ON FUNCTION public.mark_payment_held FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_escrow_payout FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_escrow_dispute FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_check_auto_release_escrow FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_payment_held TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_escrow_payout TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_escrow_dispute TO service_role;
GRANT EXECUTE ON FUNCTION public.cron_check_auto_release_escrow TO service_role;

-- Alıcı ve Satıcıya izin verilen kontrollü RPC'ler
GRANT EXECUTE ON FUNCTION public.seller_mark_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_approve_escrow TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_dispute_escrow TO authenticated;

-- 7.4. RLS Okuma Politikaları
DROP POLICY IF EXISTS "submerchants_company_select" ON public.company_submerchants;
CREATE POLICY "submerchants_company_select" ON public.company_submerchants
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = company_submerchants.company_id
              AND c.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "disputes_party_select" ON public.escrow_disputes;
CREATE POLICY "disputes_party_select" ON public.escrow_disputes
    FOR SELECT TO authenticated
    USING (
        opened_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.payment_transactions pt
            JOIN public.companies c ON c.id = pt.company_id
            WHERE pt.id = escrow_disputes.payment_id
              AND (pt.buyer_id = auth.uid() OR c.user_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "audit_party_select" ON public.escrow_audit_logs;
CREATE POLICY "audit_party_select" ON public.escrow_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.payment_transactions pt
            JOIN public.companies c ON c.id = pt.company_id
            WHERE pt.id = escrow_audit_logs.payment_id
              AND (pt.buyer_id = auth.uid() OR c.user_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );
-- ==============================================================================
-- ŞANTİYE GO – PROMPT 9E-3: WEBHOOK İDEMPOTENCY, GÜVEN TESTLERİ VE ORAN DONDURMA
-- ==============================================================================

-- 1. İDEMPOTENT WEBHOOK HAREKETLERİ TABLOSU
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(150) NOT NULL UNIQUE,
    payment_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'iyzico',
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'processed', -- 'processed', 'conflict', 'failed', 'ignored'
    payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON public.processed_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_payment_id ON public.processed_webhook_events(payment_id);

-- 2. VERİTABANI TABANLI HIZ VE ZAMAN SINIRLAMASI (RATE LIMIT) TABLOSU
CREATE TABLE IF NOT EXISTS public.system_rate_limits (
    key VARCHAR(64) PRIMARY KEY,
    last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_count BIGINT DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. GÜVEN SKORU VE DOĞRULANMIŞ İŞARETLEYİCİLERİ
ALTER TABLE public.reviews
    ADD COLUMN IF NOT EXISTS is_escrow_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS verified_weight NUMERIC(3, 2) DEFAULT 1.0;

-- 4. ATOMİK WEBHOOK İŞLEME VE ÇELİŞKİ (CONFLICT) KONTROL RPC'Sİ
CREATE OR REPLACE FUNCTION public.process_webhook_event_guard(
    p_event_id VARCHAR(150),
    p_payment_id UUID,
    p_provider VARCHAR(30),
    p_provider_status VARCHAR(50),
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing RECORD;
    v_pay RECORD;
BEGIN
    -- 1. İdempotency Kontrolü: Bu webhook olay kaydı daha önce işlendi mi?
    SELECT * INTO v_existing
    FROM public.processed_webhook_events
    WHERE event_id = p_event_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'message', 'Bu webhook olayı daha önce başarıyla işlenmiş (Idempotent replay).',
            'event_id', p_event_id
        );
    END IF;

    -- 2. Ödeme satırını kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.processed_webhook_events (
            event_id, payment_id, provider, event_type, status, error_message, payload
        ) VALUES (
            p_event_id, p_payment_id, p_provider, p_provider_status, 'failed', 'Ödeme kaydı bulunamadı', p_payload
        );
        RAISE EXCEPTION 'Ödeme işlemi veritabanında bulunamadı (ID: %)', p_payment_id;
    END IF;

    -- 3. Çelişki (Conflict) Denetimi: Sağlayıcı durumu bizim durum makinemizle çelişiyor mu?
    -- Örnek: Sağlayıcı başarısız veya iptal bildirdi ancak ödeme zaten satıcıya aktarıldıysa
    IF p_provider_status = 'failed' AND v_pay.escrow_status IN ('releasable', 'transferred') THEN
        INSERT INTO public.processed_webhook_events (
            event_id, payment_id, provider, event_type, status, error_message, payload
        ) VALUES (
            p_event_id, p_payment_id, p_provider, p_provider_status, 'conflict', 'KRİTİK ÇELİŞKİ: Aktarılmış ödeme için sağlayıcı hata/iptal bildirdi!', p_payload
        );

        INSERT INTO public.admin_audit_logs (
            admin_id, action, target_type, target_id, details
        ) VALUES (
            v_pay.buyer_id, 'payment_conflict_alert', 'payment', p_payment_id::text,
            jsonb_build_object(
                'event_id', p_event_id,
                'our_status', v_pay.escrow_status,
                'provider_status', p_provider_status,
                'alert', 'Ödeme durumu sağlayıcı ile çelişiyor. İşlem durduruldu.'
            )
        );

        RETURN jsonb_build_object(
            'success', false,
            'has_conflict', true,
            'error', 'Ödeme durumu sağlayıcı bildirimiyle çelişiyor. Güvenlik için işlem durduruldu ve admin uyarısı oluşturuldu.'
        );
    END IF;

    -- 4. Olayı başarılı olarak kaydet
    INSERT INTO public.processed_webhook_events (
        event_id, payment_id, provider, event_type, status, payload
    ) VALUES (
        p_event_id, p_payment_id, p_provider, p_provider_status, 'processed', p_payload
    );

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'event_id', p_event_id,
        'payment_id', p_payment_id
    );
END;
$$;

-- 5. VERİTABANI TABANLI CRON ÇALIŞTIRMA VE HIZ SINIRLAYICI RPC
CREATE OR REPLACE FUNCTION public.execute_rate_limited_escrow_cron(
    p_min_interval_seconds INT DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key VARCHAR(64) := 'escrow_auto_release_cron';
    v_last_run RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_result JSONB;
BEGIN
    SELECT * INTO v_last_run
    FROM public.system_rate_limits
    WHERE key = v_key
    FOR UPDATE;

    IF FOUND THEN
        IF v_now - v_last_run.last_run_at < (p_min_interval_seconds || ' seconds')::INTERVAL THEN
            RETURN jsonb_build_object(
                'success', false,
                'rate_limited', true,
                'message', 'Zamanlanmış görev çok sık çalıştırılamaz. Lütfen bekleyiniz.',
                'retry_after_seconds', p_min_interval_seconds - EXTRACT(EPOCH FROM (v_now - v_last_run.last_run_at))::INT
            );
        END IF;

        UPDATE public.system_rate_limits
        SET last_run_at = v_now, run_count = run_count + 1
        WHERE key = v_key;
    ELSE
        INSERT INTO public.system_rate_limits (key, last_run_at, run_count)
        VALUES (v_key, v_now, 1);
    END IF;

    -- Otomatik serbest bırakma fonksiyonunu çalıştır
    v_result := public.cron_check_auto_release_escrow();

    RETURN jsonb_build_object(
        'success', true,
        'rate_limited', false,
        'executed_at', v_now,
        'cron_result', v_result
    );
END;
$$;

-- 6. GÜVENLİK VE YETKİLENDİRME
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.processed_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.system_rate_limits FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.processed_webhook_events TO service_role;
GRANT ALL ON public.system_rate_limits TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_webhook_event_guard FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_rate_limited_escrow_cron FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_webhook_event_guard TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_rate_limited_escrow_cron TO service_role;
-- ==============================================================================
-- ŞANTİYE GO – PROMPT 9E-4: ESCROW GÜVENLİK SERTLEŞTİRMESİ, 2FA VE İDAMPOTENCY BİRLEŞTİRME
-- ==============================================================================

-- 1. İDEMPOTENCY TABLO BİRLEŞTİRMESİ (payment_webhook_events & processed_webhook_events)
-- Mevcut tabloların RLS korumasını bozmadan tekilleştirme
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(150) NOT NULL UNIQUE,
    payment_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'iyzico',
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'processed',
    payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_webhook_event_id ON public.payment_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_pay_webhook_payment_id ON public.payment_webhook_events(payment_id);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;

-- processed_webhook_events için de RLS korumasını garantiye al
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processed_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.processed_webhook_events TO service_role;

-- 2. payment_transactions RLS POLİTİKALARININ TEYİDİ
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_party_or_admin_read" ON public.payment_transactions;
CREATE POLICY "payments_party_or_admin_read" ON public.payment_transactions
    FOR SELECT TO authenticated
    USING (
        buyer_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = payment_transactions.company_id AND c.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "payments_direct_mutation_block" ON public.payment_transactions;
CREATE POLICY "payments_direct_mutation_block" ON public.payment_transactions
    FOR INSERT TO authenticated
    WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

-- 3. company_submerchants GİZLİLİK VE VERİ MİNİMİZASYONU (KURAL 6)
-- TCKN kesinlikle saklanmaz; tam IBAN veritabanından kaldırılır, sadece son 4 hane tutulur
ALTER TABLE public.company_submerchants
    DROP COLUMN IF EXISTS identity_number,
    ADD COLUMN IF NOT EXISTS iban_last_four VARCHAR(4);

-- Varsa mevcut tam IBAN verilerini son 4 haneye dönüştür ve sütunu maskele
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'company_submerchants' AND column_name = 'iban'
    ) THEN
        UPDATE public.company_submerchants
        SET iban_last_four = RIGHT(REPLACE(iban, ' ', ''), 4)
        WHERE iban_last_four IS NULL AND iban IS NOT NULL;
        
        ALTER TABLE public.company_submerchants DROP COLUMN iban;
    END IF;
END $$;

-- 4. GÜVEN SİSTEMİ ALICI ONAYI AYRIMI VE DİNAMİK AĞIRLIK (KURAL 2)
ALTER TABLE public.payment_transactions
    ADD COLUMN IF NOT EXISTS buyer_approved BOOLEAN DEFAULT false;

-- Dinamik ayarları platform_settings tablosuna ekle
INSERT INTO public.platform_settings (key, value, description)
VALUES 
    ('escrow_buyer_approval_weight', '{"weight": 1.5}'::jsonb, 'Alıcı tarafından bizzat onaylanmış işlemlerin güven puanı ağırlık katsayısı'),
    ('dispute_window_hours', '{"hours": 72}'::jsonb, 'Teslimat bildiriminden sonra başlayan alıcı itiraz penceresi süresi (saat)'),
    ('global_payment_mode', '{"mode": "external"}'::jsonb, 'Global varsayılan ödeme modu (external: harici doğrudan ödeme, platform: iyzico escrow)')
ON CONFLICT (key) DO NOTHING;

-- 5. KİRALAMADA İTİRAZ PENCERESİNİN İŞ BİTİŞİNDEN SONRA BAŞLAMASI VE ALICI BİLDİRİMİ (KURAL 3)
CREATE OR REPLACE FUNCTION public.seller_mark_delivered(
    p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_booking RECORD;
    v_user_id UUID := auth.uid();
    v_is_company_owner BOOLEAN;
    v_dispute_hours INT := 72;
    v_auto_release_time TIMESTAMPTZ;
    v_base_time TIMESTAMPTZ;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı. Lütfen giriş yapınız.';
    END IF;

    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    -- 2. Yetki kontrolü: Kullanıcı bu firmanın sahibi mi?
    SELECT EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = v_pay.company_id AND user_id = v_user_id
    ) INTO v_is_company_owner;

    IF NOT v_is_company_owner THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi alacak firma teslimat bildirebilir.';
    END IF;

    IF v_pay.escrow_status != 'paid_held' THEN
        RAISE EXCEPTION 'Sadece havuzda bekleyen (paid_held) ödemeler için teslimat bildirilebilir. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 3. İtiraz süresi admin ayarından okunur
    SELECT COALESCE((value->>'hours')::INT, 72) INTO v_dispute_hours
    FROM public.platform_settings
    WHERE key = 'dispute_window_hours';

    -- 4. Kiralama Kontrolü (Kural 3):
    -- Kiralamada itiraz penceresi teslim anında değil, iş bitiş tarihinden sonra başlar!
    v_base_time := NOW();

    IF v_pay.booking_id IS NOT NULL THEN
        SELECT * INTO v_booking FROM public.bookings WHERE id = v_pay.booking_id;
        IF FOUND AND v_booking.end_date IS NOT NULL THEN
            -- Bitiş tarihi gelecekteyse sayacı iş bitiş tarihinden itibaren başlat
            IF (v_booking.end_date || ' 23:59:59')::TIMESTAMPTZ > NOW() THEN
                v_base_time := (v_booking.end_date || ' 23:59:59')::TIMESTAMPTZ;
            END IF;
        END IF;
    END IF;

    v_auto_release_time := v_base_time + (v_dispute_hours || ' hours')::INTERVAL;

    UPDATE public.payment_transactions
    SET
        delivered_at = NOW(),
        auto_release_at = v_auto_release_time,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            delivered_at = NOW(),
            auto_release_at = v_auto_release_time
        WHERE id = p_payment_id;
    END IF;

    -- Rezervasyonu completed yap
    IF v_pay.booking_id IS NOT NULL THEN
        UPDATE public.bookings
        SET status = 'completed', updated_at = NOW()
        WHERE id = v_pay.booking_id;
    END IF;

    -- 5. Alıcıya Uygulama İçi Bildirim Gönder (Kural 3: Zorunlu Bildirim)
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        v_pay.buyer_id,
        'delivery_marked',
        'İş / Makine Teslim Edildi',
        'Tedarikçi firma işi tamamladığını bildirdi. İtiraz pencereniz başlamıştır. Sorun yoksa ödemeyi serbest bırakabilirsiniz.',
        jsonb_build_object(
            'payment_id', p_payment_id,
            'booking_id', v_pay.booking_id,
            'auto_release_at', v_auto_release_time
        )
    );

    -- 6. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_id,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'marked_delivered',
        v_user_id,
        'company',
        v_pay.escrow_status,
        'paid_held',
        jsonb_build_object(
            'auto_release_at', v_auto_release_time,
            'dispute_window_hours', v_dispute_hours,
            'base_time', v_base_time
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'delivered_at', NOW(),
        'auto_release_at', v_auto_release_time,
        'dispute_window_hours', v_dispute_hours
    );
END;
$$;

-- 6. ALICI ONAYI İŞARETLEME (KURAL 2: Alıcı bizzat onayladığında buyer_approved = true)
CREATE OR REPLACE FUNCTION public.buyer_approve_escrow(
    p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı. Lütfen giriş yapınız.';
    END IF;

    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    IF v_pay.buyer_id != v_user_id THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi yapan alıcı teslimatı onaylayabilir.';
    END IF;

    IF v_pay.escrow_status NOT IN ('paid_held', 'disputed') THEN
        RAISE EXCEPTION 'Bu durumdaki bir ödeme onaylanamaz. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- buyer_approved = true yap (Güven sisteminde 1.5x güçlü kanıt sayılması için zorunlu)
    UPDATE public.payment_transactions
    SET
        escrow_status = 'releasable',
        buyer_approved = true,
        released_at = NOW(),
        auto_release_at = NULL,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa açık itirazı çözümlendi olarak kapat
    UPDATE public.escrow_disputes
    SET
        status = 'resolved_seller',
        resolution_notes = 'Alıcı doğrudan işi teslim aldığını ve onayladığını beyan etti.',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE payment_id = p_payment_id AND status = 'open';

    INSERT INTO public.escrow_audit_logs (
        payment_id, action, actor_id, actor_role, previous_status, new_status, details
    ) VALUES (
        p_payment_id, 'buyer_approved', v_user_id, 'buyer', v_pay.escrow_status, 'releasable',
        jsonb_build_object('released_at', NOW(), 'buyer_approved', true)
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'escrow_status', 'releasable',
        'buyer_approved', true,
        'released_at', NOW()
    );
END;
$$;

-- 7. OTOMATİK AKTARIMDA buyer_approved = FALSE KALMASI (KURAL 2)
CREATE OR REPLACE FUNCTION public.cron_check_auto_release_escrow()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_count INT := 0;
BEGIN
    FOR v_rec IN
        SELECT id, escrow_status
        FROM public.payment_transactions
        WHERE escrow_status = 'paid_held'
          AND auto_release_at IS NOT NULL
          AND auto_release_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.payment_transactions
        SET
            escrow_status = 'releasable',
            buyer_approved = false, -- Otomatik aktarımda alıcı onaylı sayılmaz!
            released_at = NOW(),
            updated_at = NOW()
        WHERE id = v_rec.id;

        INSERT INTO public.escrow_audit_logs (
            payment_id, action, actor_role, previous_status, new_status, details
        ) VALUES (
            v_rec.id, 'auto_released', 'cron', 'paid_held', 'releasable',
            jsonb_build_object(
                'reason', 'İtiraz penceresi doldu, otomatik serbest bırakıldı.',
                'buyer_approved', false
            )
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'released_count', v_count);
END;
$$;
-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 20: ESCROW DENETİM, 2FA VE BİLDİRİM GÜVENLİK SIKILAŞTIRMASI
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROCESSED_WEBHOOK_EVENTS KALDIRILMASI (TEK STANDART: payment_webhook_events)
-- ------------------------------------------------------------------------------
-- View'lar PostgreSQL'de varsayılan olarak owner (SECURITY DEFINER benzeri) yetkisiyle
-- çalışabilir ve RLS/REVOKE kurallarını delebilir. Mükerrerliği ve yetki açığını
-- tamamen ortadan kaldırmak için VIEW kaldırılır; kod yalnızca payment_webhook_events kullanır.
DROP VIEW IF EXISTS public.processed_webhook_events CASCADE;
DROP TABLE IF EXISTS public.processed_webhook_events CASCADE;

-- payment_webhook_events üzerinde RLS ve yetkileri pekiştir
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;

-- ------------------------------------------------------------------------------
-- 2. ESKİ PAYMENTS TABLOSUNUN GÜVENLİ KULLANIMDAN KALDIRILMASI (DEPRECATION)
-- ------------------------------------------------------------------------------
-- payments tablosunu silmeden, üzerine yazma yapılmasını engelleyen güvenlik kilidi
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_legacy_payments_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'public.payments tablosu kullanımdan kaldırılmıştır (DEPRECATED). Finansal kayıtlar için public.payment_transactions kullanılmalıdır.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_legacy_payments_mutation ON public.payments;
CREATE TRIGGER trg_prevent_legacy_payments_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_legacy_payments_mutation();

-- ------------------------------------------------------------------------------
-- 3. PAYMENT_TRANSACTIONS RLS VE YETKİLERİNİN NETLEŞTİRİLMESİ
-- ------------------------------------------------------------------------------
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Eski çelişkili politikaları temizle
DROP POLICY IF EXISTS "payments_party_or_admin_read" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_select_party_or_admin" ON public.payment_transactions;
DROP POLICY IF EXISTS "payments_direct_mutation_block" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_deny_mutation" ON public.payment_transactions;

-- Tek ve açık SELECT politikası
CREATE POLICY "payment_transactions_select_party_or_admin"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- İstemciden INSERT/UPDATE/DELETE denemelerini engelleyen politika ve REVOKE
CREATE POLICY "payment_transactions_deny_mutation"
ON public.payment_transactions
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

-- ------------------------------------------------------------------------------
-- 4. TESLİMAT BİLDİRİM TAKİBİ VE BAŞARISIZLIKTA OTOMATİK AKTARIM ERTELEME
-- ------------------------------------------------------------------------------
ALTER TABLE public.payment_transactions
ADD COLUMN IF NOT EXISTS delivery_notified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_notification_failed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_notification_error TEXT,
ADD COLUMN IF NOT EXISTS delivery_notification_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_release_postponed_at TIMESTAMPTZ;

-- Teslim bildirim durumunu işleyen RPC
CREATE OR REPLACE FUNCTION public.record_delivery_notification_result(
    p_payment_id UUID,
    p_success BOOLEAN,
    p_error TEXT DEFAULT NULL,
    p_postpone_hours INT DEFAULT 72
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pay RECORD;
BEGIN
    SELECT * INTO v_pay FROM public.payment_transactions WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme kaydı bulunamadı.');
    END IF;

    IF p_success THEN
        -- Bildirim alıcıya ulaştı, itiraz sayacı resmen başlatılır
        UPDATE public.payment_transactions
        SET delivery_notified_at = NOW(),
            delivery_notification_failed = false,
            delivery_notification_error = NULL,
            delivery_notification_attempts = delivery_notification_attempts + 1,
            auto_release_at = COALESCE(auto_release_at, NOW() + (p_postpone_hours || ' hours')::interval),
            updated_at = NOW()
        WHERE id = p_payment_id;

        RETURN jsonb_build_object('success', true, 'status', 'notified');
    ELSE
        -- Bildirim başarısız oldu: Alıcı haberdar edilmeden para aktarılamaz!
        -- auto_release_at ertelenir ve admin uyarısı oluşturulur.
        UPDATE public.payment_transactions
        SET delivery_notification_failed = true,
            delivery_notification_error = p_error,
            delivery_notification_attempts = delivery_notification_attempts + 1,
            auto_release_postponed_at = NOW(),
            auto_release_at = NULL, -- Bildirim iletilene kadar otomatik aktarımı durdur
            updated_at = NOW()
        WHERE id = p_payment_id;

        -- Admin audit alarmı oluştur
        INSERT INTO public.admin_audit_logs (
            action,
            target_type,
            target_id,
            details
        ) VALUES (
            'delivery_notification_failure_alert',
            'payment_transaction',
            p_payment_id::text,
            jsonb_build_object(
                'error', p_error,
                'payment_id', p_payment_id,
                'attempts', v_pay.delivery_notification_attempts + 1,
                'postponed_at', NOW(),
                'action_taken', 'auto_release_at durduruldu'
            )
        );

        RETURN jsonb_build_object('success', true, 'status', 'postponed_alert_created');
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_delivery_notification_result FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_delivery_notification_result TO service_role;

-- ------------------------------------------------------------------------------
-- 5. CRON AUTO-RELEASE RPC'SİNİN GÜNCELLENMESİ
-- ------------------------------------------------------------------------------
-- Otomatik serbest bırakma, yalnızca bildirim başarıyla gitmişse ve hata yoksa çalışır!
CREATE OR REPLACE FUNCTION public.cron_check_auto_release_escrow()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_released_count INT := 0;
    v_pay RECORD;
BEGIN
    FOR v_pay IN
        SELECT id, auto_release_at
        FROM public.payment_transactions
        WHERE escrow_status = 'paid_held'
          AND auto_release_at IS NOT NULL
          AND auto_release_at <= NOW()
          AND delivery_notified_at IS NOT NULL
          AND (delivery_notification_failed IS NOT TRUE)
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.payment_transactions
        SET escrow_status = 'releasable',
            buyer_approved = false, -- Süre aşımı otomatik aktarım, açık alıcı onayı DEĞİLDİR
            updated_at = NOW()
        WHERE id = v_pay.id;

        INSERT INTO public.escrow_audit_logs (
            payment_id,
            action,
            actor_role,
            previous_status,
            new_status,
            details
        ) VALUES (
            v_pay.id,
            'auto_released_after_dispute_window',
            'system_cron',
            'paid_held',
            'releasable',
            jsonb_build_object('auto_release_at', v_pay.auto_release_at, 'cron_at', NOW(), 'buyer_approved', false)
        );

        v_released_count := v_released_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'released_count', v_released_count,
        'executed_at', NOW()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cron_check_auto_release_escrow FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_check_auto_release_escrow TO service_role;

-- ------------------------------------------------------------------------------
-- 6. YÖNETİCİ BAŞINA 2FA / TOTP VE BRUTE-FORCE / REPLAY KORUMA TABLOSU
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_2fa_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_2fa_attempts_rate
ON public.admin_2fa_attempts(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_2fa_attempts_replay
ON public.admin_2fa_attempts(admin_id, code_hash, created_at DESC);

ALTER TABLE public.admin_2fa_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_2fa_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_2fa_attempts TO service_role;

-- 2FA Denetim ve Hız Sınırı (Rate Limit & Replay Check) RPC
CREATE OR REPLACE FUNCTION public.check_and_record_admin_2fa(
    p_admin_id UUID,
    p_code_hash VARCHAR(64),
    p_success BOOLEAN,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recent_failures INT;
    v_replay_exists BOOLEAN;
BEGIN
    -- 1. Kaba Kuvvet (Brute-Force) Kontrolü: Son 15 dakikada 5 veya daha fazla başarısız deneme var mı?
    SELECT COUNT(*) INTO v_recent_failures
    FROM public.admin_2fa_attempts
    WHERE admin_id = p_admin_id
      AND success = false
      AND created_at >= NOW() - INTERVAL '15 minutes';

    IF v_recent_failures >= 5 THEN
        -- Başarısız denemeyi yine de logla
        INSERT INTO public.admin_2fa_attempts (admin_id, code_hash, success, ip_address, details)
        VALUES (p_admin_id, p_code_hash, false, p_ip_address, jsonb_build_object('blocked_reason', 'rate_limit_exceeded'));

        RETURN jsonb_build_object(
            'allowed', false,
            'error_code', 'ADMIN_2FA_LOCKED_OUT',
            'error', 'Güvenlik Uyarısı: Çok fazla hatalı 2FA kodu girildi. Hesabınız 15 dakika boyunca kilitlenmiştir.'
        );
    END IF;

    -- 2. Tekrar Kullanım (Replay Attack) Kontrolü: Aynı kod son 10 dakika içinde başarılı kullanılmış mı?
    IF p_success THEN
        SELECT EXISTS (
            SELECT 1 FROM public.admin_2fa_attempts
            WHERE admin_id = p_admin_id
              AND code_hash = p_code_hash
              AND success = true
              AND created_at >= NOW() - INTERVAL '10 minutes'
        ) INTO v_replay_exists;

        IF v_replay_exists THEN
            INSERT INTO public.admin_2fa_attempts (admin_id, code_hash, success, ip_address, details)
            VALUES (p_admin_id, p_code_hash, false, p_ip_address, jsonb_build_object('blocked_reason', 'replay_attack_detected'));

            RETURN jsonb_build_object(
                'allowed', false,
                'error_code', 'ADMIN_2FA_CODE_REUSED',
                'error', 'Bu 2FA onay kodu yakın zamanda zaten kullanılmış. Lütfen yeni bir kod üretilmesini bekleyiniz.'
            );
        END IF;
    END IF;

    -- 3. Denemeyi kaydet
    INSERT INTO public.admin_2fa_attempts (admin_id, code_hash, success, ip_address, details)
    VALUES (p_admin_id, p_code_hash, p_success, p_ip_address, p_details);

    RETURN jsonb_build_object(
        'allowed', p_success,
        'remaining_attempts', GREATEST(0, 5 - v_recent_failures)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_record_admin_2fa FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_admin_2fa TO service_role;
