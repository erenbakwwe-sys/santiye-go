-- ==============================================================================
-- ŞANTİYE GO – PROMPT 9E-2: ÖDEME GÜVENCESİ (ESCROW / PAZARYERİ) ŞEMASI VE RPC'LER
-- İyzico Alt Üye İşyeri (Sub-Merchant), Havuz Blokesi, Teslimat Onayı ve İtiraz Masası
-- ==============================================================================

-- 1. ENUM VE TİP TANIMLARI
DO $$ BEGIN
    CREATE TYPE escrow_status_enum AS ENUM (
        'pending',       -- Bekliyor (Ödeme formu açıldı, henüz çekilmedi)
        'paid_held',     -- Ödendi / İyzico Havuzunda Bloke
        'releasable',    -- Serbest Bırakılabilir (Onaylandı veya itiraz süresi bitti)
        'transferred',   -- Alt Üye İşyerine (Firmaya) Aktarıldı
        'disputed',      -- İtiraz Edildi / Askıya Alındı
        'refunded',      -- Alıcıya İade Edildi
        'cancelled'      -- İptal Edildi
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. MEVCUT ÖDEME TABLOLARINI GENİŞLETME (payment_transactions ve payments)
ALTER TABLE public.payment_transactions
    ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(30) DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
    ADD COLUMN IF NOT EXISTS sub_merchant_key VARCHAR(100),
    ADD COLUMN IF NOT EXISTS iyzico_item_id VARCHAR(100);

-- payments tablosu varsa senkron alanları ekle
DO $$ BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        ALTER TABLE public.payments
            ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(30) DEFAULT 'pending',
            ADD COLUMN IF NOT EXISTS held_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS auto_release_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS released_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS disputed_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS dispute_reason TEXT,
            ADD COLUMN IF NOT EXISTS sub_merchant_key VARCHAR(100),
            ADD COLUMN IF NOT EXISTS iyzico_item_id VARCHAR(100);
    END IF;
END $$;

-- 3. FİRMA İYZİCO ALT ÜYE İŞYERİ PROFİL TABLOSU (company_submerchants)
CREATE TABLE IF NOT EXISTS public.company_submerchants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    sub_merchant_key VARCHAR(100) NOT NULL UNIQUE,
    sub_merchant_type VARCHAR(50) NOT NULL DEFAULT 'LIMITED_OR_JOINT_STOCK_COMPANY',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(30) NOT NULL,
    iban VARCHAR(40) NOT NULL,
    tax_office VARCHAR(100),
    tax_number VARCHAR(20),
    identity_number VARCHAR(11),
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    raw_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_company_submerchant UNIQUE (company_id)
);

CREATE INDEX IF NOT EXISTS idx_submerchants_company ON public.company_submerchants(company_id);
CREATE INDEX IF NOT EXISTS idx_submerchants_key ON public.company_submerchants(sub_merchant_key);

-- 4. UYUŞMAZLIK / İTİRAZ MASASI TABLOSU (escrow_disputes)
CREATE TABLE IF NOT EXISTS public.escrow_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    opened_by UUID NOT NULL REFERENCES public.profiles(id),
    status VARCHAR(30) NOT NULL DEFAULT 'open', -- 'open', 'resolved_seller', 'resolved_buyer', 'dismissed'
    reason TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    resolution_notes TEXT,
    resolved_by UUID REFERENCES public.profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disputes_payment ON public.escrow_disputes(payment_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.escrow_disputes(status);

-- 5. DEĞİŞTİRİLEMEZ ESCROW HAREKET KÜTÜĞÜ (escrow_audit_logs)
CREATE TABLE IF NOT EXISTS public.escrow_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    action VARCHAR(64) NOT NULL, -- 'payment_held', 'marked_delivered', 'buyer_approved', 'dispute_opened', 'auto_released', 'payout_transferred', 'refunded'
    actor_id UUID REFERENCES public.profiles(id),
    actor_role VARCHAR(30),
    previous_status VARCHAR(30),
    new_status VARCHAR(30),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escrow_audit_payment ON public.escrow_audit_logs(payment_id);
CREATE INDEX IF NOT EXISTS idx_escrow_audit_created ON public.escrow_audit_logs(created_at);

-- Kütük satırlarında UPDATE/DELETE yasaklayan tetikleyici
CREATE OR REPLACE FUNCTION public.prevent_escrow_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'escrow_audit_logs kütügünde kayıt silinemez veya değiştirilemez (Immutable Audit Log).';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_escrow_audit_mutation ON public.escrow_audit_logs;
CREATE TRIGGER trg_prevent_escrow_audit_mutation
    BEFORE UPDATE OR DELETE ON public.escrow_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_escrow_audit_mutation();

-- ==============================================================================
-- 6. GÜVENLİ VE ATOMİK POSTGRESQL RPC FONKSİYONLARI (ESCROW ENGINE)
-- ==============================================================================

-- 6.1. ÖDEME BAŞARILI VE HAVUZDA BLOKELENDİ (SADECE service_role ÇAĞIRABİLİR)
CREATE OR REPLACE FUNCTION public.mark_payment_held(
    p_payment_id UUID,
    p_iyzico_item_id TEXT,
    p_sub_merchant_key TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
BEGIN
    -- 1. Satır düzeyinde FOR UPDATE kilidi
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme kaydı bulunamadı (ID: %)', p_payment_id;
    END IF;

    -- 2. İdempotency kontrolü: Zaten havuzdaysa veya aktarıldıysa tekrar etme
    IF v_pay.escrow_status = 'paid_held' THEN
        RETURN jsonb_build_object('success', true, 'message', 'Ödeme zaten havuzda bekliyor.', 'payment_id', p_payment_id);
    END IF;

    -- 3. Durum güncellemesi
    UPDATE public.payment_transactions
    SET
        status = 'paid',
        escrow_status = 'paid_held',
        held_at = COALESCE(held_at, NOW()),
        iyzico_item_id = COALESCE(p_iyzico_item_id, iyzico_item_id),
        sub_merchant_key = COALESCE(p_sub_merchant_key, sub_merchant_key),
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu da eşitle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            status = 'paid',
            escrow_status = 'paid_held',
            held_at = COALESCE(held_at, NOW()),
            iyzico_item_id = COALESCE(p_iyzico_item_id, iyzico_item_id),
            sub_merchant_key = COALESCE(p_sub_merchant_key, sub_merchant_key)
        WHERE id = p_payment_id;
    END IF;

    -- İlgili rezervasyonu onayla
    IF v_pay.booking_id IS NOT NULL THEN
        UPDATE public.bookings
        SET
            payment_status = 'paid',
            status = 'approved',
            updated_at = NOW()
        WHERE id = v_pay.booking_id;
    END IF;

    -- 4. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'payment_held',
        'system',
        v_pay.escrow_status,
        'paid_held',
        p_details
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'escrow_status', 'paid_held',
        'held_at', NOW()
    );
END;
$$;

-- 6.2. FİRMA İŞİ TESLİM ETTİ BİLDİRİMİ (Firma Yetkilisi Tarafından Çağrılır)
CREATE OR REPLACE FUNCTION public.seller_mark_delivered(
    p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_user_id UUID := auth.uid();
    v_is_company_owner BOOLEAN;
    v_auto_release_time TIMESTAMPTZ;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı. Lütfen giriş yapınız.';
    END IF;

    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    -- 2. Yetki kontrolü: Kullanıcı bu ödemenin yapıldığı firmanın sahibi mi?
    SELECT EXISTS (
        SELECT 1 FROM public.companies
        WHERE id = v_pay.company_id AND user_id = v_user_id
    ) INTO v_is_company_owner;

    IF NOT v_is_company_owner THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi alacak firma teslimat bildirebilir.';
    END IF;

    IF v_pay.escrow_status != 'paid_held' THEN
        RAISE EXCEPTION 'Sadece havuzda bekleyen (paid_held) ödemeler için teslimat bildirilebilir. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 3. Teslim zamanı ve 3 günlük (72 saat) itiraz penceresini kur
    v_auto_release_time := NOW() + INTERVAL '3 days';

    UPDATE public.payment_transactions
    SET
        delivered_at = NOW(),
        auto_release_at = v_auto_release_time,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            delivered_at = NOW(),
            auto_release_at = v_auto_release_time
        WHERE id = p_payment_id;
    END IF;

    -- Rezervasyon durumunu delivered yap
    IF v_pay.booking_id IS NOT NULL THEN
        UPDATE public.bookings
        SET status = 'completed', updated_at = NOW()
        WHERE id = v_pay.booking_id;
    END IF;

    -- 4. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_id,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'marked_delivered',
        v_user_id,
        'company',
        v_pay.escrow_status,
        'paid_held',
        jsonb_build_object('auto_release_at', v_auto_release_time)
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'delivered_at', NOW(),
        'auto_release_at', v_auto_release_time
    );
END;
$$;

-- 6.3. ALICI İŞİ ONAYLADI (Erken Serbest Bırakma - Alıcı Tarafından Çağrılır)
CREATE OR REPLACE FUNCTION public.buyer_approve_escrow(
    p_payment_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_user_id UUID := auth.uid();
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı. Lütfen giriş yapınız.';
    END IF;

    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    -- 2. Yetki kontrolü: Kullanıcı bu ödemeyi yapan alıcı mı?
    IF v_pay.buyer_id != v_user_id THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi yapan alıcı teslimatı onaylayabilir.';
    END IF;

    IF v_pay.escrow_status NOT IN ('paid_held', 'disputed') THEN
        RAISE EXCEPTION 'Bu durumdaki bir ödeme onaylanamaz. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 3. Durumu serbest bırakılabilir yap
    UPDATE public.payment_transactions
    SET
        escrow_status = 'releasable',
        released_at = NOW(),
        auto_release_at = NULL,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            escrow_status = 'releasable',
            released_at = NOW(),
            auto_release_at = NULL
        WHERE id = p_payment_id;
    END IF;

    -- Varsa açık itirazı çözümlendi olarak kapat
    UPDATE public.escrow_disputes
    SET
        status = 'resolved_seller',
        resolution_notes = 'Alıcı doğrudan işi teslim aldığını ve onayladığını beyan etti.',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE payment_id = p_payment_id AND status = 'open';

    -- 4. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_id,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'buyer_approved',
        v_user_id,
        'buyer',
        v_pay.escrow_status,
        'releasable',
        jsonb_build_object('released_at', NOW())
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'escrow_status', 'releasable',
        'released_at', NOW()
    );
END;
$$;

-- 6.4. ALICI İTİRAZ ETTİ / SORUN BİLDİRDİ (Alıcı Tarafından Çağrılır)
CREATE OR REPLACE FUNCTION public.buyer_dispute_escrow(
    p_payment_id UUID,
    p_reason TEXT,
    p_evidence_urls TEXT[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
    v_user_id UUID := auth.uid();
    v_dispute_id UUID;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Kimlik doğrulanmadı. Lütfen giriş yapınız.';
    END IF;

    IF p_reason IS NULL OR trim(p_reason) = '' THEN
        RAISE EXCEPTION 'İtiraz açıklaması boş bırakılamaz.';
    END IF;

    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    -- 2. Yetki kontrolü: Sadece alıcı itiraz edebilir
    IF v_pay.buyer_id != v_user_id THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi yapan alıcı itiraz edebilir.';
    END IF;

    IF v_pay.escrow_status != 'paid_held' THEN
        RAISE EXCEPTION 'Yalnızca havuzda bloke olan ödemelere itiraz edilebilir. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 3. Durumu askıya al (disputed) ve otomatik serbest bırakma sayacını durdur
    UPDATE public.payment_transactions
    SET
        escrow_status = 'disputed',
        disputed_at = NOW(),
        dispute_reason = p_reason,
        auto_release_at = NULL,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            escrow_status = 'disputed',
            disputed_at = NOW(),
            dispute_reason = p_reason,
            auto_release_at = NULL
        WHERE id = p_payment_id;
    END IF;

    -- 4. İtiraz masasına kayıt aç
    INSERT INTO public.escrow_disputes (
        payment_id,
        booking_id,
        opened_by,
        status,
        reason,
        evidence_urls
    ) VALUES (
        p_payment_id,
        v_pay.booking_id,
        v_user_id,
        'open',
        p_reason,
        p_evidence_urls
    ) RETURNING id INTO v_dispute_id;

    -- 5. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_id,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'dispute_opened',
        v_user_id,
        'buyer',
        v_pay.escrow_status,
        'disputed',
        jsonb_build_object('dispute_id', v_dispute_id, 'reason', p_reason)
    );

    RETURN jsonb_build_object(
        'success', true,
        'dispute_id', v_dispute_id,
        'payment_id', p_payment_id,
        'escrow_status', 'disputed'
    );
END;
$$;

-- 6.5. İYZİCO ON ONAYI SONRASI FİRMAYA AKTARILDI İŞARETLE (SADECE service_role)
CREATE OR REPLACE FUNCTION public.execute_escrow_payout(
    p_payment_id UUID,
    p_iyzico_transfer_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_pay RECORD;
BEGIN
    -- 1. Satırı kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    IF v_pay.escrow_status != 'releasable' THEN
        RAISE EXCEPTION 'Ödeme serbest bırakılabilir (releasable) durumda değil. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- 2. Aktarıldı olarak kaydet
    UPDATE public.payment_transactions
    SET
        status = 'transferred',
        escrow_status = 'transferred',
        is_transferred_to_submerchant = true,
        transferred_at = NOW(),
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa payments tablosunu güncelle
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'payments') THEN
        UPDATE public.payments
        SET
            status = 'transferred',
            escrow_status = 'transferred',
            is_transferred_to_submerchant = true,
            transferred_at = NOW()
        WHERE id = p_payment_id;
    END IF;

    -- 3. Audit Log Ekle
    INSERT INTO public.escrow_audit_logs (
        payment_id,
        action,
        actor_role,
        previous_status,
        new_status,
        details
    ) VALUES (
        p_payment_id,
        'payout_transferred',
        'service_role',
        v_pay.escrow_status,
        'transferred',
        jsonb_build_object('iyzico_transfer_id', p_iyzico_transfer_id, 'transferred_at', NOW())
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'escrow_status', 'transferred',
        'transferred_at', NOW()
    );
END;
$$;

-- 6.6. ADMİN İTİRAZ MASASI ÇÖZÜMÜ (SADECE service_role / Admin)
CREATE OR REPLACE FUNCTION public.admin_resolve_escrow_dispute(
    p_dispute_id UUID,
    p_action TEXT, -- 'payout_to_seller' | 'refund_to_buyer'
    p_notes TEXT,
    p_admin_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_disp RECORD;
    v_pay RECORD;
BEGIN
    SELECT * INTO v_disp
    FROM public.escrow_disputes
    WHERE id = p_dispute_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'İtiraz kaydı bulunamadı.';
    END IF;

    IF v_disp.status != 'open' THEN
        RAISE EXCEPTION 'Bu itiraz zaten karara bağlanmış. Mevcut durum: %', v_disp.status;
    END IF;

    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = v_disp.payment_id
    FOR UPDATE;

    IF p_action = 'payout_to_seller' THEN
        -- Firmaya hak ver: releasable yap
        UPDATE public.payment_transactions
        SET escrow_status = 'releasable', released_at = NOW(), updated_at = NOW()
        WHERE id = v_disp.payment_id;

        UPDATE public.escrow_disputes
        SET
            status = 'resolved_seller',
            resolution_notes = p_notes,
            resolved_by = p_admin_id,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = p_dispute_id;

        INSERT INTO public.escrow_audit_logs (
            payment_id, action, actor_id, actor_role, previous_status, new_status, details
        ) VALUES (
            v_disp.payment_id, 'dispute_resolved', p_admin_id, 'admin', v_pay.escrow_status, 'releasable',
            jsonb_build_object('action', p_action, 'notes', p_notes)
        );

    ELSIF p_action = 'refund_to_buyer' THEN
        -- Alıcıya hak ver: refunded yap
        UPDATE public.payment_transactions
        SET
            status = 'refunded',
            escrow_status = 'refunded',
            refund_amount_cents = v_pay.amount_cents,
            refund_reason = p_notes,
            refunded_at = NOW(),
            updated_at = NOW()
        WHERE id = v_disp.payment_id;

        UPDATE public.escrow_disputes
        SET
            status = 'resolved_buyer',
            resolution_notes = p_notes,
            resolved_by = p_admin_id,
            resolved_at = NOW(),
            updated_at = NOW()
        WHERE id = p_dispute_id;

        INSERT INTO public.escrow_audit_logs (
            payment_id, action, actor_id, actor_role, previous_status, new_status, details
        ) VALUES (
            v_disp.payment_id, 'dispute_resolved', p_admin_id, 'admin', v_pay.escrow_status, 'refunded',
            jsonb_build_object('action', p_action, 'notes', p_notes)
        );
    ELSE
        RAISE EXCEPTION 'Geçersiz aksiyon: %. Sadece payout_to_seller veya refund_to_buyer geçerlidir.', p_action;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'dispute_id', p_dispute_id,
        'action_taken', p_action
    );
END;
$$;

-- 6.7. ZAMAN AŞIMI KONTROLÜ (CRON İÇİN OTOMATİK SERBEST BIRAKMA)
CREATE OR REPLACE FUNCTION public.cron_check_auto_release_escrow()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_rec RECORD;
    v_count INT := 0;
BEGIN
    FOR v_rec IN
        SELECT id, escrow_status
        FROM public.payment_transactions
        WHERE escrow_status = 'paid_held'
          AND auto_release_at IS NOT NULL
          AND auto_release_at <= NOW()
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.payment_transactions
        SET
            escrow_status = 'releasable',
            released_at = NOW(),
            updated_at = NOW()
        WHERE id = v_rec.id;

        INSERT INTO public.escrow_audit_logs (
            payment_id,
            action,
            actor_role,
            previous_status,
            new_status,
            details
        ) VALUES (
            v_rec.id,
            'auto_released',
            'cron',
            'paid_held',
            'releasable',
            jsonb_build_object('reason', '3 günlük itiraz penceresi doldu, otomatik onaylandı.')
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'released_count', v_count);
END;
$$;

-- ==============================================================================
-- 7. GÜVENLİK, YETKİLENDİRME (GRANT / REVOKE) VE RLS POLİTİKALARI
-- ==============================================================================

-- 7.1. RLS Aktifleştirme
ALTER TABLE public.company_submerchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escrow_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- 7.2. Doğrudan yazma yetkilerini kaldır (Sadece RPC ve service_role yazabilsin)
REVOKE INSERT, UPDATE, DELETE ON public.company_submerchants FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.escrow_disputes FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.escrow_audit_logs FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.company_submerchants TO authenticated;
GRANT SELECT ON public.escrow_disputes TO authenticated;
GRANT SELECT ON public.escrow_audit_logs TO authenticated;

-- service_role'e tam yetki ver
GRANT ALL ON public.company_submerchants TO service_role;
GRANT ALL ON public.escrow_disputes TO service_role;
GRANT ALL ON public.escrow_audit_logs TO service_role;
GRANT ALL ON public.payment_transactions TO service_role;

-- 7.3. RPC Çalıştırma Yetkileri (Kural: Hassas işlemler SADECE service_role'de kalmalı)
REVOKE EXECUTE ON FUNCTION public.mark_payment_held FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_escrow_payout FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_resolve_escrow_dispute FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cron_check_auto_release_escrow FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.mark_payment_held TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_escrow_payout TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_resolve_escrow_dispute TO service_role;
GRANT EXECUTE ON FUNCTION public.cron_check_auto_release_escrow TO service_role;

-- Alıcı ve Satıcıya izin verilen kontrollü RPC'ler
GRANT EXECUTE ON FUNCTION public.seller_mark_delivered TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_approve_escrow TO authenticated;
GRANT EXECUTE ON FUNCTION public.buyer_dispute_escrow TO authenticated;

-- 7.4. RLS Okuma Politikaları
DROP POLICY IF EXISTS "submerchants_company_select" ON public.company_submerchants;
CREATE POLICY "submerchants_company_select" ON public.company_submerchants
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = company_submerchants.company_id
              AND c.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "disputes_party_select" ON public.escrow_disputes;
CREATE POLICY "disputes_party_select" ON public.escrow_disputes
    FOR SELECT TO authenticated
    USING (
        opened_by = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.payment_transactions pt
            JOIN public.companies c ON c.id = pt.company_id
            WHERE pt.id = escrow_disputes.payment_id
              AND (pt.buyer_id = auth.uid() OR c.user_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "audit_party_select" ON public.escrow_audit_logs;
CREATE POLICY "audit_party_select" ON public.escrow_audit_logs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.payment_transactions pt
            JOIN public.companies c ON c.id = pt.company_id
            WHERE pt.id = escrow_audit_logs.payment_id
              AND (pt.buyer_id = auth.uid() OR c.user_id = auth.uid())
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );
