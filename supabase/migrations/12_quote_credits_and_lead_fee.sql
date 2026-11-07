-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 12: TEKLİF VERME KREDİSİ VE TALEP BAŞINA ÜCRET (PROMPT 9B)
-- Değiştirilemez kredi defteri (ledger), dinamik paketler, atomik harcama RPC,
-- slot kontenjanı, gölge mod ve sorunlu talep iade altyapısı.
-- ==============================================================================

-- 1. FİRMA TABLOSUNA KREDİ BAKİYESİ VE BİLDİRİM TERCİHLERİ KOLONLARI
ALTER TABLE IF EXISTS public.companies
ADD COLUMN IF NOT EXISTS credit_balance INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "push": true, "quiet_hours": {"enabled": false, "start": "22:00", "end": "08:00"}}'::jsonb;

-- 2. TEKLİF TALEPLERİNE SLOT, ALICI RIZASI VE MALİYET ALANLARI
ALTER TABLE IF EXISTS public.quote_requests
ADD COLUMN IF NOT EXISTS buyer_contact_consent BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS max_quote_slots INT DEFAULT 4,
ADD COLUMN IF NOT EXISTS used_quote_slots INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS credit_cost INT DEFAULT 1;

-- 3. TEKLİFLERE SONUÇ BİLDİRİMİ ALANI (İş aldım / almadım / ulaşılamadı)
ALTER TABLE IF EXISTS public.quotes
ADD COLUMN IF NOT EXISTS outcome_feedback VARCHAR(30) DEFAULT 'unknown'; -- 'job_won', 'job_lost', 'could_not_reach', 'unknown'

-- 4. KREDİ PAKETLERİ TABLOSU (Admin tarafından yönetilebilir, sabit kod yok)
CREATE TABLE IF NOT EXISTS public.credit_packages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    credits INT NOT NULL CHECK (credits > 0),
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    discount_percentage INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Başlangıç için örnek paketler (Admin panelinden tamamen düzenlenebilir/silinebilir)
INSERT INTO public.credit_packages (name, credits, price, discount_percentage, sort_order)
VALUES
    ('Başlangıç Paketi', 10, 499.00, 0, 1),
    ('Standart Paket (En Çok Tercih Edilen)', 30, 1299.00, 13, 2),
    ('Profesyonel Paket', 75, 2799.00, 25, 3),
    ('Kurumsal Mega Paket', 200, 6499.00, 35, 4)
ON CONFLICT DO NOTHING;

-- 5. DEĞİŞTİRİLEMEZ KREDİ DEFTERİ (IMMUTABLE LEDGER)
-- Bakiye her zaman bu tablodaki işlemlerin toplamı üzerinden doğrulanabilir.
CREATE TABLE IF NOT EXISTS public.company_credit_ledgers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    amount INT NOT NULL, -- Pozitif (yükleme, iade) veya Negatif (harcama)
    balance_after INT NOT NULL,
    transaction_type VARCHAR(40) NOT NULL, -- 'purchase', 'spend', 'refund', 'admin_adjustment', 'welcome_bonus', 'shadow_spend'
    reference_id VARCHAR(100), -- request_id, package_id, dispute_id vb.
    idempotency_key VARCHAR(150) UNIQUE, -- Tekrarlayan istek engeli
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_ledger_company ON public.company_credit_ledgers(company_id);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_type ON public.company_credit_ledgers(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_ledger_created ON public.company_credit_ledgers(created_at DESC);

-- 6. SORUNLU TALEP / İADE İTİRAZLARI TABLOSU (DISPUTES)
CREATE TABLE IF NOT EXISTS public.quote_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID NOT NULL REFERENCES public.quote_requests(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL, -- 'unreachable_phone', 'fake_request', 'wrong_category', 'buyer_cancelled'
    description TEXT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id),
    refunded_ledger_id UUID REFERENCES public.company_credit_ledgers(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_quote_disputes_status ON public.quote_disputes(status);
CREATE INDEX IF NOT EXISTS idx_quote_disputes_company ON public.quote_disputes(company_id);

-- 7. SİSTEM AYARLARINA KREDİ VE GÖLGE MOD PARAMETRELERİ
INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('quote_credit_config', '{
        "mode": "SHADOW",
        "default_max_slots": 4,
        "default_credit_cost": 1,
        "category_costs": {},
        "welcome_bonus_credits": 5,
        "dispute_window_hours": 48,
        "auto_refund_on_buyer_cancel": true,
        "exempt_single_listing": true
    }'::jsonb, 'Teklif verme kredisi, slot sayısı, gölge mod ve maliyet konfigürasyonu')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

-- 8. ATOMİK KREDİ HARCAMA VE SLOT AYIRMA FONKSİYONU (RACE CONDITION GÜVENCESİ)
CREATE OR REPLACE FUNCTION spend_quote_credit(
    p_company_id UUID,
    p_request_id UUID,
    p_idempotency_key VARCHAR
) RETURNS JSONB AS $$
DECLARE
    v_req RECORD;
    v_comp RECORD;
    v_config JSONB;
    v_mode TEXT;
    v_cost INT;
    v_new_balance INT;
    v_ledger_id UUID;
BEGIN
    -- 1. Idempotency denetimi: Daha önce bu anahtarla işlem başarıyla yapıldı mı?
    IF EXISTS (SELECT 1 FROM public.company_credit_ledgers WHERE idempotency_key = p_idempotency_key) THEN
        RETURN jsonb_build_object(
            'success', true, 
            'message', 'İşlem zaten daha önce tamamlanmış (idempotent).',
            'is_duplicate', true
        );
    END IF;

    -- 2. Talep kaydını satır bazlı kitle (FOR UPDATE)
    SELECT * INTO v_req FROM public.quote_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Teklif talebi bulunamadı.');
    END IF;

    -- Talep durumu teklif alımına uygun mu?
    IF v_req.status != 'sent' AND v_req.status != 'quotes_received' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu talep teklif alımına kapanmıştır.');
    END IF;

    -- 3. Slot kontenjan denetimi
    IF COALESCE(v_req.used_quote_slots, 0) >= COALESCE(v_req.max_quote_slots, 4) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu talep için maksimum teklif kontenjanı (slot) dolmuştur.');
    END IF;

    -- 4. Kendi talebine teklif veremez
    IF v_req.buyer_id = (SELECT user_id FROM public.companies WHERE id = p_company_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Firma kendi açtığı talebe teklif veremez.');
    END IF;

    -- 5. Aynı firma bu talebe mükerrer kredi harcayamaz
    IF EXISTS (
        SELECT 1 FROM public.company_credit_ledgers 
        WHERE company_id = p_company_id 
          AND reference_id = p_request_id::text 
          AND transaction_type IN ('spend', 'shadow_spend')
    ) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu talep için firmanız zaten daha önce teklif kredisi kullanmıştır.');
    END IF;

    -- 6. Sistem modunu oku (OFF / SHADOW / ACTIVE)
    SELECT value INTO v_config FROM public.system_settings WHERE key = 'quote_credit_config';
    v_mode := COALESCE(v_config->>'mode', 'SHADOW');
    v_cost := COALESCE(v_req.credit_cost, 1);

    -- 7. Firma kaydını satır bazlı kitle (FOR UPDATE)
    SELECT * INTO v_comp FROM public.companies WHERE id = p_company_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Firma profili bulunamadı.');
    END IF;

    -- 8. Moda göre işlem
    IF v_mode = 'ACTIVE' THEN
        IF COALESCE(v_comp.credit_balance, 0) < v_cost THEN
            RETURN jsonb_build_object(
                'success', false, 
                'error', 'Yetersiz kredi bakiyesi. Talebe teklif vermek için ' || v_cost || ' kredi gereklidir. Mevcut: ' || COALESCE(v_comp.credit_balance, 0),
                'insufficient_credits', true
            );
        END IF;

        v_new_balance := v_comp.credit_balance - v_cost;

        -- Değiştirilemez deftere yaz
        INSERT INTO public.company_credit_ledgers (
            company_id, amount, balance_after, transaction_type, reference_id, idempotency_key, notes
        ) VALUES (
            p_company_id, -v_cost, v_new_balance, 'spend', p_request_id::text, p_idempotency_key, 'Teklif verme kredisi harcaması'
        ) RETURNING id INTO v_ledger_id;

        -- Firma bakiyesini güncelle
        UPDATE public.companies SET credit_balance = v_new_balance WHERE id = p_company_id;

    ELSIF v_mode = 'SHADOW' THEN
        -- Gölge Mod: Bakiye düşmez! Ancak simülasyon kaydı deftere işlenir
        v_new_balance := COALESCE(v_comp.credit_balance, 0);

        INSERT INTO public.company_credit_ledgers (
            company_id, amount, balance_after, transaction_type, reference_id, idempotency_key, notes
        ) VALUES (
            p_company_id, 0, v_new_balance, 'shadow_spend', p_request_id::text, p_idempotency_key, 'Gölge Mod: Simüle edilen harcama (' || v_cost || ' kredi)'
        ) RETURNING id INTO v_ledger_id;
    ELSE
        -- OFF Modu: Kredi düşmez
        v_new_balance := COALESCE(v_comp.credit_balance, 0);
    END IF;

    -- 9. Slot sayısını 1 artır
    UPDATE public.quote_requests 
    SET used_quote_slots = COALESCE(used_quote_slots, 0) + 1 
    WHERE id = p_request_id;

    -- 10. İletişim Kartı Açılışını Tetikle (Prompt 9A ile kontrollü açılış)
    INSERT INTO public.contact_reveals (buyer_id, company_id, trigger_type)
    VALUES (v_req.buyer_id, p_company_id, 'talep_kredisi')
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'success', true, 
        'mode', v_mode, 
        'cost', v_cost, 
        'remaining_balance', v_new_balance,
        'used_slots', COALESCE(v_req.used_quote_slots, 0) + 1,
        'max_slots', COALESCE(v_req.max_quote_slots, 4)
    );
END;
$$ LANGUAGE plpgsql;

-- 9. ROW LEVEL SECURITY (RLS) POLİTİKALARI
ALTER TABLE public.company_credit_ledgers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_disputes ENABLE ROW LEVEL SECURITY;

-- Kredi Paketleri: Herkes okuyabilir (aktif olanları)
CREATE POLICY "credit_packages_read_all" ON public.credit_packages
    FOR SELECT USING (is_active = true);

-- Kredi Defteri: Firma yalnızca kendi defterini okuyabilir (Bakiye manipülasyonu sunucu dışından imkansızdır)
CREATE POLICY "credit_ledger_read_own" ON public.company_credit_ledgers
    FOR SELECT USING (
        company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    );

-- Sorunlu Talep İtirazları: Firma kendi itirazını okuyabilir ve oluşturabilir
CREATE POLICY "quote_disputes_read_own" ON public.quote_disputes
    FOR SELECT USING (
        company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    );

CREATE POLICY "quote_disputes_insert_own" ON public.quote_disputes
    FOR INSERT WITH CHECK (
        company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    );
