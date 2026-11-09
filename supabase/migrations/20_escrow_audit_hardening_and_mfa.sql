-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 20: ESCROW DENETİM, 2FA VE BİLDİRİM GÜVENLİK SIKILAŞTIRMASI
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROCESSED_WEBHOOK_EVENTS KALDIRILMASI (TEK STANDART: payment_webhook_events)
-- ------------------------------------------------------------------------------
-- View'lar PostgreSQL'de varsayılan olarak owner (SECURITY DEFINER benzeri) yetkisiyle
-- çalışabilir ve RLS/REVOKE kurallarını delebilir. Mükerrerliği ve yetki açığını
-- tamamen ortadan kaldırmak için VIEW kaldırılır; kod yalnızca payment_webhook_events kullanır.
DROP VIEW IF EXISTS public.processed_webhook_events CASCADE;
DROP TABLE IF EXISTS public.processed_webhook_events CASCADE;

-- payment_webhook_events üzerinde RLS ve yetkileri pekiştir
ALTER TABLE public.payment_webhook_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.payment_webhook_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.payment_webhook_events TO service_role;

-- ------------------------------------------------------------------------------
-- 2. ESKİ PAYMENTS TABLOSUNUN GÜVENLİ KULLANIMDAN KALDIRILMASI (DEPRECATION)
-- ------------------------------------------------------------------------------
-- payments tablosunu silmeden, üzerine yazma yapılmasını engelleyen güvenlik kilidi
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
REVOKE INSERT, UPDATE, DELETE ON public.payments FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.prevent_legacy_payments_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'public.payments tablosu kullanımdan kaldırılmıştır (DEPRECATED). Finansal kayıtlar için public.payment_transactions kullanılmalıdır.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_legacy_payments_mutation ON public.payments;
CREATE TRIGGER trg_prevent_legacy_payments_mutation
BEFORE INSERT OR UPDATE OR DELETE ON public.payments
FOR EACH ROW EXECUTE FUNCTION public.prevent_legacy_payments_mutation();

-- ------------------------------------------------------------------------------
-- 3. PAYMENT_TRANSACTIONS RLS VE YETKİLERİNİN NETLEŞTİRİLMESİ
-- ------------------------------------------------------------------------------
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Eski çelişkili politikaları temizle
DROP POLICY IF EXISTS "payments_party_or_admin_read" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_select_party_or_admin" ON public.payment_transactions;
DROP POLICY IF EXISTS "payments_direct_mutation_block" ON public.payment_transactions;
DROP POLICY IF EXISTS "payment_transactions_deny_mutation" ON public.payment_transactions;

-- Tek ve açık SELECT politikası
CREATE POLICY "payment_transactions_select_party_or_admin"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
    OR
    company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid())
    OR
    EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'super_admin')
    )
);

-- İstemciden INSERT/UPDATE/DELETE denemelerini engelleyen politika ve REVOKE
CREATE POLICY "payment_transactions_deny_mutation"
ON public.payment_transactions
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);

REVOKE INSERT, UPDATE, DELETE ON public.payment_transactions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.payment_transactions TO authenticated;
GRANT ALL ON public.payment_transactions TO service_role;

-- ------------------------------------------------------------------------------
-- 4. TESLİMAT BİLDİRİM TAKİBİ VE BAŞARISIZLIKTA OTOMATİK AKTARIM ERTELEME
-- ------------------------------------------------------------------------------
ALTER TABLE public.payment_transactions
ADD COLUMN IF NOT EXISTS delivery_notified_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS delivery_notification_failed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS delivery_notification_error TEXT,
ADD COLUMN IF NOT EXISTS delivery_notification_attempts INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS auto_release_postponed_at TIMESTAMPTZ;

-- Teslim bildirim durumunu işleyen RPC
CREATE OR REPLACE FUNCTION public.record_delivery_notification_result(
    p_payment_id UUID,
    p_success BOOLEAN,
    p_error TEXT DEFAULT NULL,
    p_postpone_hours INT DEFAULT 72
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_pay RECORD;
BEGIN
    SELECT * INTO v_pay FROM public.payment_transactions WHERE id = p_payment_id FOR UPDATE;
    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Ödeme kaydı bulunamadı.');
    END IF;

    IF p_success THEN
        -- Bildirim alıcıya ulaştı, itiraz sayacı resmen başlatılır
        UPDATE public.payment_transactions
        SET delivery_notified_at = NOW(),
            delivery_notification_failed = false,
            delivery_notification_error = NULL,
            delivery_notification_attempts = delivery_notification_attempts + 1,
            auto_release_at = COALESCE(auto_release_at, NOW() + (p_postpone_hours || ' hours')::interval),
            updated_at = NOW()
        WHERE id = p_payment_id;

        RETURN jsonb_build_object('success', true, 'status', 'notified');
    ELSE
        -- Bildirim başarısız oldu: Alıcı haberdar edilmeden para aktarılamaz!
        -- auto_release_at ertelenir ve admin uyarısı oluşturulur.
        UPDATE public.payment_transactions
        SET delivery_notification_failed = true,
            delivery_notification_error = p_error,
            delivery_notification_attempts = delivery_notification_attempts + 1,
            auto_release_postponed_at = NOW(),
            auto_release_at = NULL, -- Bildirim iletilene kadar otomatik aktarımı durdur
            updated_at = NOW()
        WHERE id = p_payment_id;

        -- Admin audit alarmı oluştur
        INSERT INTO public.admin_audit_logs (
            action,
            target_type,
            target_id,
            details
        ) VALUES (
            'delivery_notification_failure_alert',
            'payment_transaction',
            p_payment_id::text,
            jsonb_build_object(
                'error', p_error,
                'payment_id', p_payment_id,
                'attempts', v_pay.delivery_notification_attempts + 1,
                'postponed_at', NOW(),
                'action_taken', 'auto_release_at durduruldu'
            )
        );

        RETURN jsonb_build_object('success', true, 'status', 'postponed_alert_created');
    END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_delivery_notification_result FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_delivery_notification_result TO service_role;

-- ------------------------------------------------------------------------------
-- 5. CRON AUTO-RELEASE RPC'SİNİN GÜNCELLENMESİ
-- ------------------------------------------------------------------------------
-- Otomatik serbest bırakma, yalnızca bildirim başarıyla gitmişse ve hata yoksa çalışır!
CREATE OR REPLACE FUNCTION public.cron_check_auto_release_escrow()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_released_count INT := 0;
    v_pay RECORD;
BEGIN
    FOR v_pay IN
        SELECT id, auto_release_at
        FROM public.payment_transactions
        WHERE escrow_status = 'paid_held'
          AND auto_release_at IS NOT NULL
          AND auto_release_at <= NOW()
          AND delivery_notified_at IS NOT NULL
          AND (delivery_notification_failed IS NOT TRUE)
        FOR UPDATE SKIP LOCKED
    LOOP
        UPDATE public.payment_transactions
        SET escrow_status = 'releasable',
            buyer_approved = false, -- Süre aşımı otomatik aktarım, açık alıcı onayı DEĞİLDİR
            updated_at = NOW()
        WHERE id = v_pay.id;

        INSERT INTO public.escrow_audit_logs (
            payment_id,
            action,
            actor_role,
            previous_status,
            new_status,
            details
        ) VALUES (
            v_pay.id,
            'auto_released_after_dispute_window',
            'system_cron',
            'paid_held',
            'releasable',
            jsonb_build_object('auto_release_at', v_pay.auto_release_at, 'cron_at', NOW(), 'buyer_approved', false)
        );

        v_released_count := v_released_count + 1;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'released_count', v_released_count,
        'executed_at', NOW()
    );
END;
$$;

REVOKE ALL ON FUNCTION public.cron_check_auto_release_escrow FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_check_auto_release_escrow TO service_role;

-- ------------------------------------------------------------------------------
-- 6. YÖNETİCİ BAŞINA 2FA / TOTP VE BRUTE-FORCE / REPLAY KORUMA TABLOSU
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_2fa_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code_hash VARCHAR(64) NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    ip_address VARCHAR(45),
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_2fa_attempts_rate
ON public.admin_2fa_attempts(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_2fa_attempts_replay
ON public.admin_2fa_attempts(admin_id, code_hash, created_at DESC);

ALTER TABLE public.admin_2fa_attempts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_2fa_attempts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.admin_2fa_attempts TO service_role;

-- 2FA Denetim ve Hız Sınırı (Rate Limit & Replay Check) RPC
CREATE OR REPLACE FUNCTION public.check_and_record_admin_2fa(
    p_admin_id UUID,
    p_code_hash VARCHAR(64),
    p_success BOOLEAN,
    p_ip_address VARCHAR(45) DEFAULT NULL,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_recent_failures INT;
    v_replay_exists BOOLEAN;
BEGIN
    -- 1. Kaba Kuvvet (Brute-Force) Kontrolü: Son 15 dakikada 5 veya daha fazla başarısız deneme var mı?
    SELECT COUNT(*) INTO v_recent_failures
    FROM public.admin_2fa_attempts
    WHERE admin_id = p_admin_id
      AND success = false
      AND created_at >= NOW() - INTERVAL '15 minutes';

    IF v_recent_failures >= 5 THEN
        -- Başarısız denemeyi yine de logla
        INSERT INTO public.admin_2fa_attempts (admin_id, code_hash, success, ip_address, details)
        VALUES (p_admin_id, p_code_hash, false, p_ip_address, jsonb_build_object('blocked_reason', 'rate_limit_exceeded'));

        RETURN jsonb_build_object(
            'allowed', false,
            'error_code', 'ADMIN_2FA_LOCKED_OUT',
            'error', 'Güvenlik Uyarısı: Çok fazla hatalı 2FA kodu girildi. Hesabınız 15 dakika boyunca kilitlenmiştir.'
        );
    END IF;

    -- 2. Tekrar Kullanım (Replay Attack) Kontrolü: Aynı kod son 10 dakika içinde başarılı kullanılmış mı?
    IF p_success THEN
        SELECT EXISTS (
            SELECT 1 FROM public.admin_2fa_attempts
            WHERE admin_id = p_admin_id
              AND code_hash = p_code_hash
              AND success = true
              AND created_at >= NOW() - INTERVAL '10 minutes'
        ) INTO v_replay_exists;

        IF v_replay_exists THEN
            INSERT INTO public.admin_2fa_attempts (admin_id, code_hash, success, ip_address, details)
            VALUES (p_admin_id, p_code_hash, false, p_ip_address, jsonb_build_object('blocked_reason', 'replay_attack_detected'));

            RETURN jsonb_build_object(
                'allowed', false,
                'error_code', 'ADMIN_2FA_CODE_REUSED',
                'error', 'Bu 2FA onay kodu yakın zamanda zaten kullanılmış. Lütfen yeni bir kod üretilmesini bekleyiniz.'
            );
        END IF;
    END IF;

    -- 3. Denemeyi kaydet
    INSERT INTO public.admin_2fa_attempts (admin_id, code_hash, success, ip_address, details)
    VALUES (p_admin_id, p_code_hash, p_success, p_ip_address, p_details);

    RETURN jsonb_build_object(
        'allowed', p_success,
        'remaining_attempts', GREATEST(0, 5 - v_recent_failures)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.check_and_record_admin_2fa FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_and_record_admin_2fa TO service_role;
