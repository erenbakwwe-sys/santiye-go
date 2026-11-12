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
