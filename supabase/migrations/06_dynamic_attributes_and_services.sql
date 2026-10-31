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
