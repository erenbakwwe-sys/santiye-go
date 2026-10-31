-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 08: PRODUCTION AUTH, VERIFICATIONS & STORAGE
-- Prompt 8: Demo'dan Çıkış ve Gerçek Çalışan Sistem Altyapısı
-- ==============================================================================

-- 1. PHONE VERIFICATIONS (SMS OTP)
CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(64) NOT NULL,
    attempts INT DEFAULT 0,
    max_attempts INT DEFAULT 3,
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    resend_after TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON public.phone_verifications (phone);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires ON public.phone_verifications (expires_at);

-- 2. EMAIL VERIFICATION TOKENS
CREATE TABLE IF NOT EXISTS public.email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_verif_token ON public.email_verification_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_email_verif_user ON public.email_verification_tokens (user_id);

-- 3. PASSWORD RESET TOKENS
CREATE TABLE IF NOT EXISTS public.password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pwd_reset_token ON public.password_reset_tokens (token_hash);
CREATE INDEX IF NOT EXISTS idx_pwd_reset_user ON public.password_reset_tokens (user_id);

-- 4. LOGIN SECURITY LOGS (BRUTE FORCE & AUDIT)
CREATE TABLE IF NOT EXISTS public.login_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    status VARCHAR(20) NOT NULL CHECK (status IN ('success', 'failed', 'locked')),
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_logs_ident ON public.login_security_logs (identifier, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip ON public.login_security_logs (ip_address, created_at DESC);

-- 5. EXTEND PROFILES FOR VERIFICATION & PREFERENCES
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS is_phone_verified BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS kvkk_version VARCHAR(20) DEFAULT 'v1.0',
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS two_factor_secret VARCHAR(255),
    ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": true, "sms": true, "push": true}'::jsonb;

-- 6. EXTEND COMPANIES FOR ONBOARDING & VERIFICATION DOCUMENTS
ALTER TABLE public.companies
    ADD COLUMN IF NOT EXISTS onboarding_step VARCHAR(50) DEFAULT 'profile_completed',
    ADD COLUMN IF NOT EXISTS tax_number VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100),
    ADD COLUMN IF NOT EXISTS tax_document_url TEXT,
    ADD COLUMN IF NOT EXISTS signature_circular_url TEXT,
    ADD COLUMN IF NOT EXISTS operating_license_url TEXT;

-- 7. STORAGE BUCKETS (LISTING PHOTOS & COMPANY DOCUMENTS)
-- If storage schema exists (standard in Supabase)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES 
            ('listing-photos', 'listing-photos', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
            ('company-documents', 'company-documents', false, 10485760, ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
        ON CONFLICT (id) DO UPDATE SET
            public = EXCLUDED.public,
            file_size_limit = EXCLUDED.file_size_limit,
            allowed_mime_types = EXCLUDED.allowed_mime_types;
    END IF;
END $$;

-- 8. ROW LEVEL SECURITY (RLS) FOR NEW TABLES
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_verification_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_security_logs ENABLE ROW LEVEL SECURITY;

-- Phone verifications: only service role can read/insert/update
CREATE POLICY "Service role manages phone verifications"
    ON public.phone_verifications FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Email verification tokens: only service role
CREATE POLICY "Service role manages email tokens"
    ON public.email_verification_tokens FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Password reset tokens: only service role
CREATE POLICY "Service role manages password tokens"
    ON public.password_reset_tokens FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Login logs: read by admin, write by service role
CREATE POLICY "Admins can view login logs"
    ON public.login_security_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
        )
    );

CREATE POLICY "Service role manages login logs"
    ON public.login_security_logs FOR ALL
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- 9. RPC FUNCTION: VERIFY PHONE OTP
CREATE OR REPLACE FUNCTION public.verify_phone_otp(
    p_phone VARCHAR,
    p_code_hash VARCHAR
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_record RECORD;
BEGIN
    SELECT * INTO v_record
    FROM public.phone_verifications
    WHERE phone = p_phone
      AND verified_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Aktif bir doğrulama kodu bulunamadı.');
    END IF;

    IF now() > v_record.expires_at THEN
        RETURN jsonb_build_object('success', false, 'error', 'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.');
    END IF;

    IF v_record.attempts >= v_record.max_attempts THEN
        RETURN jsonb_build_object('success', false, 'error', 'Maksimum deneme sayısını aştınız. Lütfen yeni kod isteyin.');
    END IF;

    IF v_record.code_hash <> p_code_hash THEN
        UPDATE public.phone_verifications
        SET attempts = attempts + 1
        WHERE id = v_record.id;
        
        RETURN jsonb_build_object(
            'success', false, 
            'error', format('Hatalı doğrulama kodu. Kalan deneme hakkı: %s', v_record.max_attempts - v_record.attempts - 1)
        );
    END IF;

    -- Success
    UPDATE public.phone_verifications
    SET verified_at = now()
    WHERE id = v_record.id;

    -- If user is logged in, mark profile phone as verified
    IF auth.uid() IS NOT NULL THEN
        UPDATE public.profiles
        SET is_phone_verified = true,
            phone_verified_at = now()
        WHERE id = auth.uid();
    END IF;

    RETURN jsonb_build_object('success', true, 'message', 'Telefon numarası başarıyla doğrulandı.');
END;
$$;
