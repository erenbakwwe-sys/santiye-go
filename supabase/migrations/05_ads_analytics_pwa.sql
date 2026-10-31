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
