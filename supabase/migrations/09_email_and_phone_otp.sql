-- ==============================================================================
-- ŞANTİYE GO – RESEND VE TELEFON OTP DOĞRULAMA FONKSİYONLARI
-- ==============================================================================

-- 1. PHONE VERIFICATIONS TABLOSU İÇİN GÜVENLİ KOD OLUŞTURMA RPC
CREATE OR REPLACE FUNCTION public.request_phone_otp(
    p_phone VARCHAR,
    p_code_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_last RECORD;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO v_last
    FROM public.phone_verifications
    WHERE phone = p_phone
    ORDER BY created_at DESC
    LIMIT 1;

    -- Rate Limit: 60 saniye içinde tekrar kod isteğini engelle
    IF v_last IS NOT NULL AND v_last.resend_after > v_now THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'RATE_LIMIT_COOLDOWN',
            'remaining_seconds', EXTRACT(EPOCH FROM (v_last.resend_after - v_now))::INT
        );
    END IF;

    -- Yeni doğrulama kaydı aç (5 dakika geçerlilik, 60 saniye tekrar bekleme)
    INSERT INTO public.phone_verifications (
        phone,
        code_hash,
        attempts,
        max_attempts,
        expires_at,
        resend_after
    ) VALUES (
        p_phone,
        p_code_hash,
        0,
        3,
        v_now + interval '5 minutes',
        v_now + interval '60 seconds'
    );

    RETURN jsonb_build_object(
        'success', true,
        'expires_in_seconds', 300,
        'resend_after_seconds', 60
    );
END;
$$;

-- Anon ve authenticated kullanıcıların RPC'yi çalıştırmasına izin ver
GRANT EXECUTE ON FUNCTION public.request_phone_otp TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.verify_phone_otp TO anon, authenticated, service_role;
