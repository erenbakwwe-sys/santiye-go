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
