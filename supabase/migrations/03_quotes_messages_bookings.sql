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
CREATE POLICY "Buyers view own quote requests" ON quote_requests FOR SELECT USING (auth.uid() = buyer_id);
CREATE POLICY "Companies view assigned quote requests" ON quote_requests FOR SELECT USING (
    id IN (SELECT request_id FROM quote_request_recipients WHERE company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()))
);
CREATE POLICY "Buyers can insert quote requests" ON quote_requests FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Buyers can update own quote requests" ON quote_requests FOR UPDATE USING (auth.uid() = buyer_id);

-- Quotes
CREATE POLICY "Buyers and companies view relevant quotes" ON quotes FOR SELECT USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid()) OR
    request_id IN (SELECT id FROM quote_requests WHERE buyer_id = auth.uid())
);
CREATE POLICY "Companies can insert quotes" ON quotes FOR INSERT WITH CHECK (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);
CREATE POLICY "Companies can update own quotes" ON quotes FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

-- Conversations & Messages
CREATE POLICY "Users view own conversations" ON conversations FOR SELECT USING (
    auth.uid() = buyer_id OR
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);
CREATE POLICY "Users insert conversations" ON conversations FOR INSERT WITH CHECK (
    auth.uid() = buyer_id OR
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);
CREATE POLICY "Users view conversation messages" ON messages FOR SELECT USING (
    conversation_id IN (
        SELECT id FROM conversations WHERE buyer_id = auth.uid() OR company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    )
);
CREATE POLICY "Users insert messages" ON messages FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    conversation_id IN (
        SELECT id FROM conversations WHERE buyer_id = auth.uid() OR company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
    )
);

-- Bookings
CREATE POLICY "Users view own bookings" ON bookings FOR SELECT USING (
    auth.uid() = buyer_id OR
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);
CREATE POLICY "Buyers can insert bookings" ON bookings FOR INSERT WITH CHECK (auth.uid() = buyer_id);
CREATE POLICY "Parties can update relevant bookings" ON bookings FOR UPDATE USING (
    auth.uid() = buyer_id OR
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

-- Reviews
CREATE POLICY "Reviews viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Buyers can insert review for completed booking" ON reviews FOR INSERT WITH CHECK (
    auth.uid() = buyer_id AND
    booking_id IN (SELECT id FROM bookings WHERE buyer_id = auth.uid() AND status = 'completed')
);
CREATE POLICY "Buyers update own reviews" ON reviews FOR UPDATE USING (auth.uid() = buyer_id);
CREATE POLICY "Companies reply to own reviews" ON reviews FOR UPDATE USING (
    company_id IN (SELECT id FROM companies WHERE user_id = auth.uid())
);

-- Notifications
CREATE POLICY "Users view own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON notifications FOR UPDATE USING (auth.uid() = user_id);
