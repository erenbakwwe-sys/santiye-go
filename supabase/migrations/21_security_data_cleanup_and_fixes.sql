-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 21: SECURITY HARDENING, RLS RECURSION FIX & DATA CLEANUP
-- ==============================================================================

-- 1. SECURITY DEFINER IS_ADMIN FONKSİYONU (Sonsuz Döngüyü Önler)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE id = auth.uid() AND is_active = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, anon, service_role;

-- 2. ADMIN_USERS VE COMPANY_SUBSCRIPTIONS RLS POLİTİKALARININ DÜZELTİLMESİ
DROP POLICY IF EXISTS "admin_users_super_admin_all" ON public.admin_users;
CREATE POLICY "admin_users_super_admin_all" ON public.admin_users
    FOR ALL
    USING (
        public.is_admin() OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "company_subscriptions_owner_read" ON public.company_subscriptions;
CREATE POLICY "company_subscriptions_owner_read" ON public.company_subscriptions
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = company_subscriptions.company_id AND c.user_id = auth.uid()
        )
        OR public.is_admin()
        OR auth.role() = 'service_role'
    );

DROP POLICY IF EXISTS "company_subscriptions_admin_write" ON public.company_subscriptions;
CREATE POLICY "company_subscriptions_admin_write" ON public.company_subscriptions
    FOR ALL
    USING (
        public.is_admin() OR auth.role() = 'service_role'
    );

-- 3. COMPANIES TABLOSU SELECT GÜVENLİĞİ & PUBLIC_COMPANIES VIEW
-- Mevcut gevşek politikayı kaldır
DROP POLICY IF EXISTS "Companies are viewable by everyone" ON public.companies;
DROP POLICY IF EXISTS "companies_owner_or_admin_select" ON public.companies;

CREATE POLICY "companies_owner_or_admin_select" ON public.companies
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR public.is_admin()
        OR auth.role() = 'service_role'
    );

-- Halka açık güvenli firma görünümü (Hassas kolonlar: phone, tax_number, evraklar, iban, bakiye vb. ASLA yer almaz)
CREATE OR REPLACE VIEW public.public_companies AS
SELECT 
    id,
    name,
    logo_url,
    city_id,
    district_id,
    is_verified,
    rating,
    review_count,
    created_at
FROM public.companies;

GRANT SELECT ON public.public_companies TO anon, authenticated;

-- 4. IBAN TEMİZLİĞİ VE ACCEPT_ONLINE_PAYMENTS DÜZELTMESİ
ALTER TABLE public.companies DROP COLUMN IF EXISTS iban;

ALTER TABLE public.companies ALTER COLUMN accept_online_payments SET DEFAULT false;
UPDATE public.companies SET accept_online_payments = false WHERE sub_merchant_key IS NULL;

-- 5. VERGİ NUMARASI (VKN) 10 HANE KISITLAMASI VE ONBOARDING_STEP DÜZELTMESİ
-- Mevcut 11 haneli TCKN girilmiş verileri güvenli şekilde temizle (varsa ilk 10 haneye kırp)
UPDATE public.companies 
SET tax_number = SUBSTRING(tax_number FROM 1 FOR 10) 
WHERE tax_number IS NOT NULL AND LENGTH(tax_number) = 11;

ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS chk_companies_vkn_format;
ALTER TABLE public.companies ADD CONSTRAINT chk_companies_vkn_format 
CHECK (tax_number IS NULL OR tax_number ~ '^[0-9]{10}$');

-- Onboarding adımının varsayılanını 'pending_documents' yap
ALTER TABLE public.companies ALTER COLUMN onboarding_step SET DEFAULT 'pending_documents';

-- 6. SEARCH_LISTINGS_ADVANCED RPC FONKSİYONUNUN DÜZELTİLMESİ (neighborhood_id hatası giderildi)
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
            ''::VARCHAR AS company_phone,      -- Telefon doğrudan açılmaz (Prompt 9A İletişim Koruması)
            ''::VARCHAR AS company_whatsapp,   -- WhatsApp doğrudan açılmaz
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
            ''::VARCHAR AS neighborhood_name,
            ''::VARCHAR AS postal_code,
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
        WHERE (p_status IS NULL OR l.status = p_status)
          -- PostGIS mesafe filtresi
          AND (
            p_radius_km IS NULL 
            OR p_radius_km <= 0 
            OR user_geo IS NULL 
            OR ST_DWithin(l.location, user_geo, p_radius_km * 1000.0)
          )
          -- Kategori filtresi
          AND (
            p_category_id IS NULL 
            OR l.category_id = p_category_id 
            OR cat.parent_id = p_category_id
          )
          AND (
            p_subcategory_slug IS NULL 
            OR cat.slug = p_subcategory_slug
          )
          -- İl / İlçe Filtresi
          AND (p_city_id IS NULL OR l.city_id = p_city_id)
          AND (p_district_id IS NULL OR l.district_id = p_district_id)
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

-- 7. OTOMATİK FREE SUBSCRIPTION OLUŞTURMA TETİKLEYİCİSİ
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
    v_new_company_id UUID;
BEGIN
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

    -- VKN sadece 10 hane ise al
    IF v_tax_number IS NOT NULL AND LENGTH(REGEXP_REPLACE(v_tax_number, '\D', '', 'g')) = 10 THEN
        v_tax_number := REGEXP_REPLACE(v_tax_number, '\D', '', 'g');
    ELSE
        v_tax_number := NULL;
    END IF;

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

    -- Profiles tablosunu güncelle veya ekle
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

    -- Eğer firma hesabı ise companies ve company_subscriptions oluştur
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
            is_demo,
            onboarding_step,
            accept_online_payments
        ) VALUES (
            new.id,
            COALESCE(v_company_name, v_full_name, 'Firma Hesabı'),
            v_tax_number,
            v_tax_office,
            COALESCE(v_phone, ''),
            v_city_id,
            v_district_id,
            false,
            false,
            'pending_documents',
            false
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
            name = COALESCE(EXCLUDED.name, public.companies.name),
            tax_number = COALESCE(EXCLUDED.tax_number, public.companies.tax_number),
            tax_office = COALESCE(EXCLUDED.tax_office, public.companies.tax_office)
        RETURNING id INTO v_new_company_id;

        IF v_new_company_id IS NOT NULL THEN
            INSERT INTO public.company_subscriptions (
                company_id,
                plan_id,
                billing_cycle,
                status,
                current_period_start,
                current_period_end
            ) VALUES (
                v_new_company_id,
                'free',
                'monthly',
                'active',
                NOW(),
                NOW() + INTERVAL '1 year'
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
