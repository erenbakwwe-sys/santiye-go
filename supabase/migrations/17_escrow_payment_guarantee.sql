-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 17: ÖDEME GÜVENCESİ (ESCROW), PAZARYERİ VE ALT ÜYE İŞYERİ ALTYAPISI (PROMPT 9E)
-- ==============================================================================

-- 1. PAYMENT STATUS ENUM DEĞERLERİNİ GENİŞLET
DO $$ BEGIN
    ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'paid_escrow';
    ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'releasable';
    ALTER TYPE payment_status ADD VALUE IF NOT EXISTS 'disputed';
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 2. FİRMALAR TABLOSUNA ALT ÜYE İŞYERİ VE OPT-IN ALANLARI
ALTER TABLE IF EXISTS public.companies
    ADD COLUMN IF NOT EXISTS accept_platform_escrow BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS sub_merchant_status VARCHAR(30) DEFAULT 'unregistered', -- 'unregistered', 'pending', 'approved', 'rejected'
    ADD COLUMN IF NOT EXISTS iban_last4 VARCHAR(4),
    ADD COLUMN IF NOT EXISTS sub_merchant_external_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS sub_merchant_registered_at TIMESTAMPTZ;

-- 3. SİSTEM AYARLARI TABLOSUNA ESCROW KONFİGÜRASYONLARI
INSERT INTO public.platform_settings (key, value, description)
VALUES
    ('payment_mode', '{"mode": "external"}'::jsonb, 'Platform genel ödeme modu ("external" varsayılan doğrudan mutabakat, "platform" emanet havuz)'),
    ('escrow_dispute_window_days', '{"days": 3}'::jsonb, 'İş tamamlandıktan sonra alıcının itiraz edebileceği süre (gün). Süre bitince otomatik serbest bırakılır.'),
    ('refund_commission_action', '{"action": "refund_full"}'::jsonb, 'İptal ve iade durumunda platform komisyonu politikası ("refund_full" komisyon da iade edilir, "retain_fee" komisyon kesilir)'),
    ('escrow_auto_release_enabled', '{"enabled": true}'::jsonb, 'İtiraz penceresi dolduğunda itiraz yoksa otomatik serbest bırakma cron bayrağı')
ON CONFLICT (key) DO NOTHING;

-- 4. PAYMENT_TRANSACTIONS TABLOSUNA ESCROW VE İTİRAZ ALANLARI
ALTER TABLE IF EXISTS public.payment_transactions
    ADD COLUMN IF NOT EXISTS payment_mode VARCHAR(20) DEFAULT 'platform',
    ADD COLUMN IF NOT EXISTS buyer_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_status VARCHAR(30) DEFAULT 'none', -- 'none', 'opened', 'under_review', 'resolved_transferred', 'resolved_refunded', 'resolved_split'
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS dispute_resolution_notes TEXT,
    ADD COLUMN IF NOT EXISTS dispute_resolved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_resolved_by UUID REFERENCES public.profiles(id),
    ADD COLUMN IF NOT EXISTS provider_submerchant_price_cents BIGINT,
    ADD COLUMN IF NOT EXISTS provider_transaction_id TEXT,
    ADD COLUMN IF NOT EXISTS split_buyer_amount_cents BIGINT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS split_company_amount_cents BIGINT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payment_auto_release ON public.payment_transactions(auto_release_at) WHERE status IN ('paid', 'paid_escrow');
CREATE INDEX IF NOT EXISTS idx_payment_dispute_status ON public.payment_transactions(dispute_status);

-- 5. DEĞİŞTİRİLEMEZ ÖDEME OLAY DEFTERİ (APPEND-ONLY PAYMENT EVENTS)
CREATE TABLE IF NOT EXISTS public.payment_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    from_status VARCHAR(30) NOT NULL,
    to_status VARCHAR(30) NOT NULL,
    triggered_by VARCHAR(60) NOT NULL, -- 'buyer_confirmation', 'dispute_opened', 'dispute_resolved', 'auto_timeout', 'admin_override', 'webhook_paid', 'refund_requested'
    actor_id UUID REFERENCES public.profiles(id),
    actor_role VARCHAR(30) NOT NULL, -- 'buyer', 'company', 'admin', 'system'
    reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_events_pid ON public.payment_events(payment_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_events_actor ON public.payment_events(actor_id);

-- 6. UYUŞMAZLIK / İTİRAZ KUYRUĞU TABLOSU (PAYMENT DISPUTES)
CREATE TABLE IF NOT EXISTS public.payment_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id),
    company_id UUID NOT NULL REFERENCES public.companies(id),
    reason TEXT NOT NULL,
    buyer_notes TEXT,
    company_notes TEXT,
    company_responded_at TIMESTAMPTZ,
    status VARCHAR(30) NOT NULL DEFAULT 'opened', -- 'opened', 'under_review', 'resolved_transferred', 'resolved_refunded', 'resolved_split'
    resolution_type VARCHAR(30), -- 'transfer_to_company', 'full_refund_to_buyer', 'split'
    buyer_refund_cents BIGINT DEFAULT 0,
    company_transfer_cents BIGINT DEFAULT 0,
    admin_notes TEXT,
    admin_id UUID REFERENCES public.profiles(id),
    requires_2fa BOOLEAN DEFAULT true,
    two_factor_verified_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_payment ON public.payment_disputes(payment_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.payment_disputes(status);
CREATE INDEX IF NOT EXISTS idx_disputes_parties ON public.payment_disputes(buyer_id, company_id);

-- 7. WEBHOOK BİLDİRİM VE İDEMPOTENCY TABLOSU
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(128) UNIQUE NOT NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'iyzico',
    event_type VARCHAR(50) NOT NULL,
    signature TEXT,
    is_valid_signature BOOLEAN NOT NULL DEFAULT true,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_eid ON public.payment_webhook_events(event_id);

-- 8. GÜVENLİK (ROW LEVEL SECURITY) POLİTİKALARI
ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;

-- 8.1 payment_events RLS:
-- İlgili alıcı, ilgili firma yetkilisi veya admin okuyabilir.
DROP POLICY IF EXISTS "payment_events_read_parties_or_admin" ON public.payment_events;
CREATE POLICY "payment_events_read_parties_or_admin" ON public.payment_events
    FOR SELECT TO authenticated
    USING (
        actor_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.payment_transactions pt
            WHERE pt.id = payment_events.payment_id
              AND (
                  pt.buyer_id = auth.uid() OR
                  pt.company_id IN (SELECT c.id FROM public.companies c WHERE c.user_id = auth.uid())
              )
        ) OR
        EXISTS (
            SELECT 1 FROM public.admin_users au
            WHERE au.id = auth.uid() AND au.is_active = true
        )
    );

-- İstemciden doğrudan INSERT / UPDATE / DELETE kesinlikle YASAKTIR! (Append-only via service_role RPCs)
DROP POLICY IF EXISTS "payment_events_no_client_mutation" ON public.payment_events;
CREATE POLICY "payment_events_no_client_mutation" ON public.payment_events
    FOR INSERT TO authenticated WITH CHECK (false);

-- 8.2 payment_disputes RLS:
DROP POLICY IF EXISTS "disputes_read_parties_or_admin" ON public.payment_disputes;
CREATE POLICY "disputes_read_parties_or_admin" ON public.payment_disputes
    FOR SELECT TO authenticated
    USING (
        buyer_id = auth.uid() OR
        company_id IN (SELECT c.id FROM public.companies c WHERE c.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)
    );

DROP POLICY IF EXISTS "disputes_buyer_insert" ON public.payment_disputes;
CREATE POLICY "disputes_buyer_insert" ON public.payment_disputes
    FOR INSERT TO authenticated
    WITH CHECK (buyer_id = auth.uid());

DROP POLICY IF EXISTS "disputes_company_update_response" ON public.payment_disputes;
CREATE POLICY "disputes_company_update_response" ON public.payment_disputes
    FOR UPDATE TO authenticated
    USING (
        company_id IN (SELECT c.id FROM public.companies c WHERE c.user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.admin_users au WHERE au.id = auth.uid() AND au.is_active = true)
    );

-- 8.3 payment_transactions RLS sıkılaştırma:
-- İstemciler payment_transactions üzerinde ASLA doğrudan UPDATE yapamaz!
DROP POLICY IF EXISTS "payments_no_direct_client_update" ON public.payment_transactions;
CREATE POLICY "payments_no_direct_client_update" ON public.payment_transactions
    FOR UPDATE TO authenticated
    USING (false);

-- ==============================================================================
-- 9. SERVICE_ROLE POSTGRESQL RPC DURUM MAKİNESİ (FOR UPDATE SATIR KİLİTLİ)
-- ==============================================================================

-- 9.1 ÖDEMENİN HAVUZA ALINMASI (WEBHOOK / PAYMENT CONFIRMATION)
CREATE OR REPLACE FUNCTION public.confirm_escrow_payment_paid(
    p_payment_id UUID,
    p_provider_payment_id TEXT,
    p_card_last_four VARCHAR(4) DEFAULT '4242',
    p_dispute_window_days INT DEFAULT 3
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx RECORD;
    v_auto_release TIMESTAMPTZ;
BEGIN
    -- Satır kilidi ile seç (Race condition koruması)
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme kaydı bulunamadı.');
    END IF;

    -- Idempotency kontrolü: Zaten havuzda veya sonrasında ise başarılı dön
    IF v_tx.status IN ('paid', 'paid_escrow', 'releasable', 'transferred') THEN
        RETURN jsonb_build_object('success', true, 'status', v_tx.status, 'message', 'Zaten işlenmiş ödeme.');
    END IF;

    v_auto_release := now() + (interval '1 day' * COALESCE(p_dispute_window_days, 3));

    UPDATE public.payment_transactions
    SET status = 'paid_escrow',
        provider_payment_id = COALESCE(p_provider_payment_id, provider_payment_id),
        card_last_four = COALESCE(p_card_last_four, card_last_four),
        auto_release_at = v_auto_release,
        updated_at = now()
    WHERE id = p_payment_id;

    -- Değiştirilemez olay defterine yaz
    INSERT INTO public.payment_events (
        payment_id, from_status, to_status, triggered_by, actor_role, reason, metadata
    ) VALUES (
        p_payment_id, v_tx.status::text, 'paid_escrow', 'webhook_paid', 'system',
        'Ödeme sağlayıcıdan başarılı tahsilat teyidi alındı, havuzda bloke edildi.',
        jsonb_build_object('provider_payment_id', p_provider_payment_id, 'auto_release_at', v_auto_release)
    );

    -- İletişim açılış tetikleyicisi 'odeme' kuralı kontrolü
    INSERT INTO public.contact_reveals (
        buyer_id, company_id, booking_id, quote_id, trigger_type, revealed_phone, revealed_email
    )
    SELECT
        v_tx.buyer_id,
        v_tx.company_id,
        v_tx.booking_id,
        v_tx.quote_id,
        'odeme',
        p.phone,
        p.email
    FROM public.profiles p
    WHERE p.id = v_tx.buyer_id
    ON CONFLICT DO NOTHING;

    RETURN jsonb_build_object(
        'success', true,
        'status', 'paid_escrow',
        'auto_release_at', v_auto_release
    );
END;
$$;

-- 9.2 ALICININ İŞİ ONAYLAMASI VE ÖDEMENİN SERBEST BIRAKILMASI
CREATE OR REPLACE FUNCTION public.buyer_confirm_and_release_escrow(
    p_payment_id UUID,
    p_buyer_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx RECORD;
BEGIN
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme kaydı bulunamadı.');
    END IF;

    -- Yetkilendirme Kuralı: Firma kendi parasını ASLA serbest bırakamaz! Yalnızca ödemeyi yapan alıcı serbest bırakabilir.
    IF v_tx.buyer_id != p_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz işlem: Sadece siparişin alıcısı ödemeyi serbest bırakabilir.');
    END IF;

    -- Durum kontrolleri
    IF v_tx.status = 'transferred' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme zaten firmaya aktarılmış (idempotent red).');
    END IF;

    IF v_tx.status = 'refunded' THEN
        RETURN jsonb_build_object('success', false, 'error', 'İade edilmiş bir ödeme serbest bırakılamaz.');
    END IF;

    IF v_tx.status = 'disputed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'İtiraz sürecindeki ödeme serbest bırakılamaz. Yönetici kararı beklenmelidir.');
    END IF;

    IF v_tx.status NOT IN ('paid', 'paid_escrow', 'releasable') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme havuzda hazır değil. Geçersiz durum geçişi: ' || v_tx.status::text);
    END IF;

    -- Durum geçişi: transferred
    UPDATE public.payment_transactions
    SET status = 'transferred',
        buyer_confirmed_at = now(),
        is_transferred_to_submerchant = true,
        transferred_at = now(),
        updated_at = now()
    WHERE id = p_payment_id;

    -- Olay defterine kaydet
    INSERT INTO public.payment_events (
        payment_id, from_status, to_status, triggered_by, actor_id, actor_role, reason, metadata
    ) VALUES (
        p_payment_id, v_tx.status::text, 'transferred', 'buyer_confirmation', p_buyer_id, 'buyer',
        'Alıcı iş teslimini onayladı ve ödemeyi firmaya aktardı.',
        jsonb_build_object('net_company_amount_cents', v_tx.net_company_amount_cents)
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'transferred',
        'net_company_amount_cents', v_tx.net_company_amount_cents
    );
END;
$$;

-- 9.3 ALICININ İTİRAZ AÇMASI (DONDURMA VE ADMIN KUYRUĞUNA GÖNDERME)
CREATE OR REPLACE FUNCTION public.open_escrow_dispute(
    p_payment_id UUID,
    p_buyer_id UUID,
    p_reason TEXT,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx RECORD;
    v_dispute_id UUID;
BEGIN
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme kaydı bulunamadı.');
    END IF;

    IF v_tx.buyer_id != p_buyer_id THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz işlem: Yalnızca alıcı itiraz açabilir.');
    END IF;

    IF v_tx.status = 'transferred' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme halihazırda firmaya aktarılmış olduğundan havuz itirazı açılamaz.');
    END IF;

    IF v_tx.status = 'refunded' THEN
        RETURN jsonb_build_object('success', false, 'error', 'İade edilmiş ödemeye itiraz açılamaz.');
    END IF;

    IF v_tx.status = 'disputed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Bu işlem için zaten aktif bir itiraz süreci mevcuttur.');
    END IF;

    IF v_tx.status NOT IN ('paid', 'paid_escrow', 'releasable') THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yalnızca havuzdaki ödemelere itiraz edilebilir.');
    END IF;

    -- Dondur: Durumu disputed yap ve auto_release'i dondur
    UPDATE public.payment_transactions
    SET status = 'disputed',
        disputed_at = now(),
        dispute_status = 'opened',
        dispute_reason = p_reason,
        updated_at = now()
    WHERE id = p_payment_id;

    -- İtiraz kaydı oluştur
    INSERT INTO public.payment_disputes (
        payment_id, buyer_id, company_id, reason, buyer_notes, status
    ) VALUES (
        p_payment_id, v_tx.buyer_id, v_tx.company_id, p_reason, p_notes, 'opened'
    ) RETURNING id INTO v_dispute_id;

    -- Olay defterine kaydet
    INSERT INTO public.payment_events (
        payment_id, from_status, to_status, triggered_by, actor_id, actor_role, reason, metadata
    ) VALUES (
        p_payment_id, v_tx.status::text, 'disputed', 'dispute_opened', p_buyer_id, 'buyer',
        p_reason,
        jsonb_build_object('dispute_id', v_dispute_id, 'notes', p_notes)
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', 'disputed',
        'dispute_id', v_dispute_id
    );
END;
$$;

-- 9.4 ADMİN İTİRAZ KARARI (ZORUNLU GEREKÇE, 2FA LOGLU, AKTARIM / TAM İADE / KISMİ PAYLAŞIM)
CREATE OR REPLACE FUNCTION public.admin_resolve_escrow_dispute(
    p_payment_id UUID,
    p_admin_id UUID,
    p_resolution_type VARCHAR(30), -- 'transfer_to_company', 'full_refund_to_buyer', 'split'
    p_admin_notes TEXT,
    p_buyer_refund_cents BIGINT DEFAULT 0,
    p_company_transfer_cents BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx RECORD;
    v_is_admin BOOLEAN;
    v_to_status VARCHAR(30);
BEGIN
    -- Admin kontrolü
    SELECT EXISTS (
        SELECT 1 FROM public.admin_users WHERE id = p_admin_id AND is_active = true
    ) INTO v_is_admin;

    IF NOT v_is_admin THEN
        RETURN jsonb_build_object('success', false, 'error', 'Yetkisiz işlem: Sadece platform yöneticileri itiraz kararı verebilir.');
    END IF;

    IF p_admin_notes IS NULL OR length(trim(p_admin_notes)) < 5 THEN
        RETURN jsonb_build_object('success', false, 'error', 'Gerekçe zorunludur (en az 5 karakter).');
    END IF;

    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme kaydı bulunamadı.');
    END IF;

    IF v_tx.status != 'disputed' THEN
        RETURN jsonb_build_object('success', false, 'error', 'İşlem itiraz durumunda değil.');
    END IF;

    IF p_resolution_type = 'transfer_to_company' THEN
        v_to_status := 'transferred';
        UPDATE public.payment_transactions
        SET status = 'transferred',
            is_transferred_to_submerchant = true,
            transferred_at = now(),
            dispute_status = 'resolved_transferred',
            dispute_resolution_notes = p_admin_notes,
            dispute_resolved_at = now(),
            dispute_resolved_by = p_admin_id,
            updated_at = now()
        WHERE id = p_payment_id;

    ELSIF p_resolution_type = 'full_refund_to_buyer' THEN
        v_to_status := 'refunded';
        UPDATE public.payment_transactions
        SET status = 'refunded',
            refund_amount_cents = v_tx.amount_cents,
            refund_reason = 'İtiraz Hakem Kararı: ' || p_admin_notes,
            refunded_at = now(),
            dispute_status = 'resolved_refunded',
            dispute_resolution_notes = p_admin_notes,
            dispute_resolved_at = now(),
            dispute_resolved_by = p_admin_id,
            updated_at = now()
        WHERE id = p_payment_id;

    ELSIF p_resolution_type = 'split' THEN
        v_to_status := 'transferred';
        IF (p_buyer_refund_cents + p_company_transfer_cents) > v_tx.amount_cents THEN
            RETURN jsonb_build_object('success', false, 'error', 'Paylaşım tutarları toplamı ödeme tutarını aşamaz.');
        END IF;

        UPDATE public.payment_transactions
        SET status = 'transferred',
            split_buyer_amount_cents = p_buyer_refund_cents,
            split_company_amount_cents = p_company_transfer_cents,
            refund_amount_cents = p_buyer_refund_cents,
            net_company_amount_cents = p_company_transfer_cents,
            is_transferred_to_submerchant = true,
            transferred_at = now(),
            dispute_status = 'resolved_split',
            dispute_resolution_notes = p_admin_notes,
            dispute_resolved_at = now(),
            dispute_resolved_by = p_admin_id,
            updated_at = now()
        WHERE id = p_payment_id;
    ELSE
        RETURN jsonb_build_object('success', false, 'error', 'Geçersiz çözüm türü: ' || p_resolution_type);
    END IF;

    -- Dispute tablosunu güncelle
    UPDATE public.payment_disputes
    SET status = 'resolved_' || p_resolution_type,
        resolution_type = p_resolution_type,
        buyer_refund_cents = p_buyer_refund_cents,
        company_transfer_cents = p_company_transfer_cents,
        admin_notes = p_admin_notes,
        admin_id = p_admin_id,
        two_factor_verified_at = now(),
        resolved_at = now(),
        updated_at = now()
    WHERE payment_id = p_payment_id;

    -- Olay defterine kaydet
    INSERT INTO public.payment_events (
        payment_id, from_status, to_status, triggered_by, actor_id, actor_role, reason, metadata
    ) VALUES (
        p_payment_id, 'disputed', v_to_status, 'dispute_resolved', p_admin_id, 'admin',
        p_admin_notes,
        jsonb_build_object(
            'resolution_type', p_resolution_type,
            'buyer_refund_cents', p_buyer_refund_cents,
            'company_transfer_cents', p_company_transfer_cents
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'status', v_to_status,
        'resolution_type', p_resolution_type
    );
END;
$$;

-- 9.5 OTOMATİK ZAMAN AŞIMI SERBEST BIRAKMA CRON RPC'Sİ
CREATE OR REPLACE FUNCTION public.cron_auto_release_expired_escrow()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
    v_count INT := 0;
BEGIN
    FOR v_record IN
        SELECT id, buyer_id, net_company_amount_cents
        FROM public.payment_transactions
        WHERE status IN ('paid', 'paid_escrow')
          AND auto_release_at IS NOT NULL
          AND auto_release_at <= now()
          AND disputed_at IS NULL
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.payment_transactions
        SET status = 'transferred',
            is_transferred_to_submerchant = true,
            transferred_at = now(),
            updated_at = now()
        WHERE id = v_record.id;

        INSERT INTO public.payment_events (
            payment_id, from_status, to_status, triggered_by, actor_role, reason, metadata
        ) VALUES (
            v_record.id, 'paid_escrow', 'transferred', 'auto_timeout', 'system',
            'İtiraz süresi boyunca sorun bildirilmediğinden otomatik serbest bırakıldı.',
            jsonb_build_object('net_company_amount_cents', v_record.net_company_amount_cents)
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'released_count', v_count);
END;
$$;

-- 9.6 İPTAL VE İADE RPC'Sİ (PROMPT 3 VE KULLANICI İADESİ)
CREATE OR REPLACE FUNCTION public.refund_escrow_payment(
    p_payment_id UUID,
    p_actor_id UUID,
    p_reason TEXT,
    p_refund_amount_cents BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_tx RECORD;
    v_refund_cents BIGINT;
BEGIN
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme kaydı bulunamadı.');
    END IF;

    IF v_tx.status = 'transferred' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Serbest bırakılmış/aktarılmış ödeme doğrudan iade edilemez.');
    END IF;

    IF v_tx.status = 'refunded' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme zaten iade edilmiş.');
    END IF;

    v_refund_cents := COALESCE(p_refund_amount_cents, v_tx.amount_cents);

    UPDATE public.payment_transactions
    SET status = 'refunded',
        refund_amount_cents = v_refund_cents,
        refund_reason = p_reason,
        refunded_at = now(),
        updated_at = now()
    WHERE id = p_payment_id;

    INSERT INTO public.payment_events (
        payment_id, from_status, to_status, triggered_by, actor_id, actor_role, reason, metadata
    ) VALUES (
        p_payment_id, v_tx.status::text, 'refunded', 'refund_requested', p_actor_id, 'system',
        p_reason,
        jsonb_build_object('refund_amount_cents', v_refund_cents)
    );

    RETURN jsonb_build_object('success', true, 'status', 'refunded', 'refund_amount_cents', v_refund_cents);
END;
$$;
