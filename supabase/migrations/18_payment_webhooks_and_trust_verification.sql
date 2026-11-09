-- ==============================================================================
-- ŞANTİYE GO – PROMPT 9E-3: WEBHOOK İDEMPOTENCY, GÜVEN TESTLERİ VE ORAN DONDURMA
-- ==============================================================================

-- 1. İDEMPOTENT WEBHOOK HAREKETLERİ TABLOSU
CREATE TABLE IF NOT EXISTS public.processed_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id VARCHAR(150) NOT NULL UNIQUE,
    payment_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    provider VARCHAR(30) NOT NULL DEFAULT 'iyzico',
    event_type VARCHAR(50) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'processed', -- 'processed', 'conflict', 'failed', 'ignored'
    payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    processed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON public.processed_webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_payment_id ON public.processed_webhook_events(payment_id);

-- 2. VERİTABANI TABANLI HIZ VE ZAMAN SINIRLAMASI (RATE LIMIT) TABLOSU
CREATE TABLE IF NOT EXISTS public.system_rate_limits (
    key VARCHAR(64) PRIMARY KEY,
    last_run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    run_count BIGINT DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- 3. GÜVEN SKORU VE DOĞRULANMIŞ İŞARETLEYİCİLERİ
ALTER TABLE public.reviews
    ADD COLUMN IF NOT EXISTS is_escrow_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS verified_weight NUMERIC(3, 2) DEFAULT 1.0;

-- 4. ATOMİK WEBHOOK İŞLEME VE ÇELİŞKİ (CONFLICT) KONTROL RPC'Sİ
CREATE OR REPLACE FUNCTION public.process_webhook_event_guard(
    p_event_id VARCHAR(150),
    p_payment_id UUID,
    p_provider VARCHAR(30),
    p_provider_status VARCHAR(50),
    p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_existing RECORD;
    v_pay RECORD;
BEGIN
    -- 1. İdempotency Kontrolü: Bu webhook olay kaydı daha önce işlendi mi?
    SELECT * INTO v_existing
    FROM public.processed_webhook_events
    WHERE event_id = p_event_id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', true,
            'is_duplicate', true,
            'message', 'Bu webhook olayı daha önce başarıyla işlenmiş (Idempotent replay).',
            'event_id', p_event_id
        );
    END IF;

    -- 2. Ödeme satırını kilitle
    SELECT * INTO v_pay
    FROM public.payment_transactions
    WHERE id = p_payment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        INSERT INTO public.processed_webhook_events (
            event_id, payment_id, provider, event_type, status, error_message, payload
        ) VALUES (
            p_event_id, p_payment_id, p_provider, p_provider_status, 'failed', 'Ödeme kaydı bulunamadı', p_payload
        );
        RAISE EXCEPTION 'Ödeme işlemi veritabanında bulunamadı (ID: %)', p_payment_id;
    END IF;

    -- 3. Çelişki (Conflict) Denetimi: Sağlayıcı durumu bizim durum makinemizle çelişiyor mu?
    -- Örnek: Sağlayıcı başarısız veya iptal bildirdi ancak ödeme zaten satıcıya aktarıldıysa
    IF p_provider_status = 'failed' AND v_pay.escrow_status IN ('releasable', 'transferred') THEN
        INSERT INTO public.processed_webhook_events (
            event_id, payment_id, provider, event_type, status, error_message, payload
        ) VALUES (
            p_event_id, p_payment_id, p_provider, p_provider_status, 'conflict', 'KRİTİK ÇELİŞKİ: Aktarılmış ödeme için sağlayıcı hata/iptal bildirdi!', p_payload
        );

        INSERT INTO public.admin_audit_logs (
            admin_id, action, target_type, target_id, details
        ) VALUES (
            v_pay.buyer_id, 'payment_conflict_alert', 'payment', p_payment_id::text,
            jsonb_build_object(
                'event_id', p_event_id,
                'our_status', v_pay.escrow_status,
                'provider_status', p_provider_status,
                'alert', 'Ödeme durumu sağlayıcı ile çelişiyor. İşlem durduruldu.'
            )
        );

        RETURN jsonb_build_object(
            'success', false,
            'has_conflict', true,
            'error', 'Ödeme durumu sağlayıcı bildirimiyle çelişiyor. Güvenlik için işlem durduruldu ve admin uyarısı oluşturuldu.'
        );
    END IF;

    -- 4. Olayı başarılı olarak kaydet
    INSERT INTO public.processed_webhook_events (
        event_id, payment_id, provider, event_type, status, payload
    ) VALUES (
        p_event_id, p_payment_id, p_provider, p_provider_status, 'processed', p_payload
    );

    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'event_id', p_event_id,
        'payment_id', p_payment_id
    );
END;
$$;

-- 5. VERİTABANI TABANLI CRON ÇALIŞTIRMA VE HIZ SINIRLAYICI RPC
CREATE OR REPLACE FUNCTION public.execute_rate_limited_escrow_cron(
    p_min_interval_seconds INT DEFAULT 60
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_key VARCHAR(64) := 'escrow_auto_release_cron';
    v_last_run RECORD;
    v_now TIMESTAMPTZ := NOW();
    v_result JSONB;
BEGIN
    SELECT * INTO v_last_run
    FROM public.system_rate_limits
    WHERE key = v_key
    FOR UPDATE;

    IF FOUND THEN
        IF v_now - v_last_run.last_run_at < (p_min_interval_seconds || ' seconds')::INTERVAL THEN
            RETURN jsonb_build_object(
                'success', false,
                'rate_limited', true,
                'message', 'Zamanlanmış görev çok sık çalıştırılamaz. Lütfen bekleyiniz.',
                'retry_after_seconds', p_min_interval_seconds - EXTRACT(EPOCH FROM (v_now - v_last_run.last_run_at))::INT
            );
        END IF;

        UPDATE public.system_rate_limits
        SET last_run_at = v_now, run_count = run_count + 1
        WHERE key = v_key;
    ELSE
        INSERT INTO public.system_rate_limits (key, last_run_at, run_count)
        VALUES (v_key, v_now, 1);
    END IF;

    -- Otomatik serbest bırakma fonksiyonunu çalıştır
    v_result := public.cron_check_auto_release_escrow();

    RETURN jsonb_build_object(
        'success', true,
        'rate_limited', false,
        'executed_at', v_now,
        'cron_result', v_result
    );
END;
$$;

-- 6. GÜVENLİK VE YETKİLENDİRME
ALTER TABLE public.processed_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_rate_limits ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.processed_webhook_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.system_rate_limits FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.processed_webhook_events TO service_role;
GRANT ALL ON public.system_rate_limits TO service_role;

REVOKE EXECUTE ON FUNCTION public.process_webhook_event_guard FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.execute_rate_limited_escrow_cron FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.process_webhook_event_guard TO service_role;
GRANT EXECUTE ON FUNCTION public.execute_rate_limited_escrow_cron TO service_role;
