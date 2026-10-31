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
            SELECT 1 FROM companies c WHERE c.id = analytics_daily_summary.target_id AND c.user_id = auth.uid()
        ))
        OR (target_type = 'listing' AND EXISTS (
            SELECT 1 FROM listings l
            JOIN companies c ON c.id = l.company_id
            WHERE l.id = analytics_daily_summary.target_id AND c.user_id = auth.uid()
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
