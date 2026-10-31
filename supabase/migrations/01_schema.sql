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
