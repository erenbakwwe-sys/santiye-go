-- ==============================================================================
-- ŞANTİYE GO – PROMPT 9E-4: ESCROW GÜVENLİK SERTLEŞTİRMESİ, 2FA VE İDAMPOTENCY BİRLEŞTİRME
-- ==============================================================================

-- 1. İDEMPOTENCY TABLO BİRLEŞTİRMESİ (payment_webhook_events & processed_webhook_events)
-- Mevcut tabloların RLS korumasını bozmadan tekilleştirme
CREATE TABLE IF NOT EXISTS public.payment_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(150) NOT NULL UNIQUE,
    payment_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'iyzico',
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'processed',
    payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pay_webhook_event_id ON public.payment_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_pay_webhook_payment_id ON public.payment_webhook_events(payment_id);

ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;

-- processed_webhook_events için de RLS korumasını garantiye al
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.processed_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.processed_webhook_events TO service_role;

-- 2. payment_transactions RLS POLİTİKALARININ TEYİDİ
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "payments_party_or_admin_read" ON public.payment_transactions;
CREATE POLICY "payments_party_or_admin_read" ON public.payment_transactions
    FOR SELECT TO authenticated
    USING (
        buyer_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.companies c
            WHERE c.id = payment_transactions.company_id AND c.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.profiles p
            WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "payments_direct_mutation_block" ON public.payment_transactions;
CREATE POLICY "payments_direct_mutation_block" ON public.payment_transactions
    FOR INSERT TO authenticated
    WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

-- 3. company_submerchants GİZLİLİK VE VERİ MİNİMİZASYONU (KURAL 6)
-- TCKN kesinlikle saklanmaz; tam IBAN veritabanından kaldırılır, sadece son 4 hane tutulur
ALTER TABLE public.company_submerchants
    DROP COLUMN IF EXISTS identity_number,
    ADD COLUMN IF NOT EXISTS iban_last_four VARCHAR(4);

-- Varsa mevcut tam IBAN verilerini son 4 haneye dönüştür ve sütunu maskele
DO $$ BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'company_submerchants' AND column_name = 'iban'
    ) THEN
        UPDATE public.company_submerchants
        SET iban_last_four = RIGHT(REPLACE(iban, ' ', ''), 4)
        WHERE iban_last_four IS NULL AND iban IS NOT NULL;
        
        ALTER TABLE public.company_submerchants DROP COLUMN iban;
    END IF;
END $$;

-- 4. GÜVEN SİSTEMİ ALICI ONAYI AYRIMI VE DİNAMİK AĞIRLIK (KURAL 2)
ALTER TABLE public.payment_transactions
    ADD COLUMN IF NOT EXISTS buyer_approved BOOLEAN DEFAULT false;

-- Dinamik ayarları platform_settings tablosuna ekle
INSERT INTO public.platform_settings (key, value, description)
VALUES 
    ('escrow_buyer_approval_weight', '{"weight": 1.5}'::jsonb, 'Alıcı tarafından bizzat onaylanmış işlemlerin güven puanı ağırlık katsayısı'),
    ('dispute_window_hours', '{"hours": 72}'::jsonb, 'Teslimat bildiriminden sonra başlayan alıcı itiraz penceresi süresi (saat)'),
    ('global_payment_mode', '{"mode": "external"}'::jsonb, 'Global varsayılan ödeme modu (external: harici doğrudan ödeme, platform: iyzico escrow)')
ON CONFLICT (key) DO NOTHING;

-- 5. KİRALAMADA İTİRAZ PENCERESİNİN İŞ BİTİŞİNDEN SONRA BAŞLAMASI VE ALICI BİLDİRİMİ (KURAL 3)
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
    v_booking RECORD;
    v_user_id UUID := auth.uid();
    v_is_company_owner BOOLEAN;
    v_dispute_hours INT := 72;
    v_auto_release_time TIMESTAMPTZ;
    v_base_time TIMESTAMPTZ;
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

    -- 2. Yetki kontrolü: Kullanıcı bu firmanın sahibi mi?
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

    -- 3. İtiraz süresi admin ayarından okunur
    SELECT COALESCE((value->>'hours')::INT, 72) INTO v_dispute_hours
    FROM public.platform_settings
    WHERE key = 'dispute_window_hours';

    -- 4. Kiralama Kontrolü (Kural 3):
    -- Kiralamada itiraz penceresi teslim anında değil, iş bitiş tarihinden sonra başlar!
    v_base_time := NOW();

    IF v_pay.booking_id IS NOT NULL THEN
        SELECT * INTO v_booking FROM public.bookings WHERE id = v_pay.booking_id;
        IF FOUND AND v_booking.end_date IS NOT NULL THEN
            -- Bitiş tarihi gelecekteyse sayacı iş bitiş tarihinden itibaren başlat
            IF (v_booking.end_date || ' 23:59:59')::TIMESTAMPTZ > NOW() THEN
                v_base_time := (v_booking.end_date || ' 23:59:59')::TIMESTAMPTZ;
            END IF;
        END IF;
    END IF;

    v_auto_release_time := v_base_time + (v_dispute_hours || ' hours')::INTERVAL;

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

    -- Rezervasyonu completed yap
    IF v_pay.booking_id IS NOT NULL THEN
        UPDATE public.bookings
        SET status = 'completed', updated_at = NOW()
        WHERE id = v_pay.booking_id;
    END IF;

    -- 5. Alıcıya Uygulama İçi Bildirim Gönder (Kural 3: Zorunlu Bildirim)
    INSERT INTO public.notifications (
        user_id,
        type,
        title,
        message,
        data
    ) VALUES (
        v_pay.buyer_id,
        'delivery_marked',
        'İş / Makine Teslim Edildi',
        'Tedarikçi firma işi tamamladığını bildirdi. İtiraz pencereniz başlamıştır. Sorun yoksa ödemeyi serbest bırakabilirsiniz.',
        jsonb_build_object(
            'payment_id', p_payment_id,
            'booking_id', v_pay.booking_id,
            'auto_release_at', v_auto_release_time
        )
    );

    -- 6. Audit Log Ekle
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
        jsonb_build_object(
            'auto_release_at', v_auto_release_time,
            'dispute_window_hours', v_dispute_hours,
            'base_time', v_base_time
        )
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'delivered_at', NOW(),
        'auto_release_at', v_auto_release_time,
        'dispute_window_hours', v_dispute_hours
    );
END;
$$;

-- 6. ALICI ONAYI İŞARETLEME (KURAL 2: Alıcı bizzat onayladığında buyer_approved = true)
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

    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ödeme işlemi bulunamadı.';
    END IF;

    IF v_pay.buyer_id != v_user_id THEN
        RAISE EXCEPTION 'Bu işlem için yetkiniz yok. Sadece ödemeyi yapan alıcı teslimatı onaylayabilir.';
    END IF;

    IF v_pay.escrow_status NOT IN ('paid_held', 'disputed') THEN
        RAISE EXCEPTION 'Bu durumdaki bir ödeme onaylanamaz. Mevcut durum: %', v_pay.escrow_status;
    END IF;

    -- buyer_approved = true yap (Güven sisteminde 1.5x güçlü kanıt sayılması için zorunlu)
    UPDATE public.payment_transactions
    SET
        escrow_status = 'releasable',
        buyer_approved = true,
        released_at = NOW(),
        auto_release_at = NULL,
        updated_at = NOW()
    WHERE id = p_payment_id;

    -- Varsa açık itirazı çözümlendi olarak kapat
    UPDATE public.escrow_disputes
    SET
        status = 'resolved_seller',
        resolution_notes = 'Alıcı doğrudan işi teslim aldığını ve onayladığını beyan etti.',
        resolved_at = NOW(),
        updated_at = NOW()
    WHERE payment_id = p_payment_id AND status = 'open';

    INSERT INTO public.escrow_audit_logs (
        payment_id, action, actor_id, actor_role, previous_status, new_status, details
    ) VALUES (
        p_payment_id, 'buyer_approved', v_user_id, 'buyer', v_pay.escrow_status, 'releasable',
        jsonb_build_object('released_at', NOW(), 'buyer_approved', true)
    );

    RETURN jsonb_build_object(
        'success', true,
        'payment_id', p_payment_id,
        'escrow_status', 'releasable',
        'buyer_approved', true,
        'released_at', NOW()
    );
END;
$$;

-- 7. OTOMATİK AKTARIMDA buyer_approved = FALSE KALMASI (KURAL 2)
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
            buyer_approved = false, -- Otomatik aktarımda alıcı onaylı sayılmaz!
            released_at = NOW(),
            updated_at = NOW()
        WHERE id = v_rec.id;

        INSERT INTO public.escrow_audit_logs (
            payment_id, action, actor_role, previous_status, new_status, details
        ) VALUES (
            v_rec.id, 'auto_released', 'cron', 'paid_held', 'releasable',
            jsonb_build_object(
                'reason', 'İtiraz penceresi doldu, otomatik serbest bırakıldı.',
                'buyer_approved', false
            )
        );

        v_count := v_count + 1;
    END LOOP;

    RETURN jsonb_build_object('success', true, 'released_count', v_count);
END;
$$;
