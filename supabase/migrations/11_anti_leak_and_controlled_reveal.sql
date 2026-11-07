-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 11: İLETİŞİM KORUMA, MASKELEME VE KONTROLLÜ AÇILIŞ (PROMPT 9A)
-- Platform dışı anlaşmaları engelleme, ihlal takibi ve kontrollü iletişim kartı şeması.
-- ==============================================================================

-- 1. SİSTEM AYARLARI TABLOSU (Admin tarafından yönetilebilir dinamik parametreler)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO public.system_settings (key, value, description)
VALUES 
    ('reveal_rule', '{"default": "teklif_kabul", "categories": {}}'::jsonb, 'İletişim açılış tetikleyicisi kuralı (teklif_kabul, odeme, talep_kredisi, numara_goster_butonu)'),
    ('violation_threshold', '{"info_max": 2, "warn_max": 4, "flag_max": 6}'::jsonb, 'Kullanıcı ihlal seviyesi eşikleri'),
    ('mask_patterns', '{"keywords": ["whatsapp", "wp", "watsap", "instagram", "insta", "telegram", "t.me", "özelden yaz", "özelden ara", "elden öde", "elden anlaşalım"]}'::jsonb, 'Yasaklı dış yönlendirme kelimeleri'),
    ('numara_goster_config', '{"enabled": false, "daily_limit": 5}'::jsonb, 'Yumuşak mod numara gösterim ayarı')
ON CONFLICT (key) DO UPDATE SET
    value = EXCLUDED.value,
    updated_at = now();

-- 2. İLETİŞİM MASKELEME VE İHLAL LOGLARI (KVKK Uyumlu - Asla ham telefon/e-posta saklanmaz)
CREATE TABLE IF NOT EXISTS public.compliance_mask_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    entity_type VARCHAR(50) NOT NULL, -- 'message', 'listing', 'company_profile', 'quote_note', 'review', 'booking_note'
    entity_id VARCHAR(100),
    detected_types TEXT[] NOT NULL, -- ARRAY['phone', 'email', 'iban', 'url', 'keyword']
    is_false_positive_reported BOOLEAN DEFAULT false,
    false_positive_reason TEXT,
    reviewed_by_admin UUID REFERENCES public.profiles(id),
    review_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_compliance_user ON public.compliance_mask_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_compliance_status ON public.compliance_mask_logs(review_status);
CREATE INDEX IF NOT EXISTS idx_compliance_created ON public.compliance_mask_logs(created_at DESC);

-- 3. KONTROLLÜ İLETİŞİM AÇILIŞ TABLOSU (REVEALS)
CREATE TABLE IF NOT EXISTS public.contact_reveals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    trigger_type VARCHAR(50) NOT NULL, -- 'teklif_kabul', 'odeme', 'talep_kredisi', 'numara_goster_butonu'
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contact_reveals_parties ON public.contact_reveals(buyer_id, company_id);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_booking ON public.contact_reveals(booking_id);
CREATE INDEX IF NOT EXISTS idx_contact_reveals_quote ON public.contact_reveals(quote_id);

-- 4. YUMUŞAK MOD: NUMARA GÖSTERİM KULLANIM LOGLARI
CREATE TABLE IF NOT EXISTS public.phone_reveal_daily_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_phone_reveal_user_daily ON public.phone_reveal_daily_logs(user_id, created_at DESC);

-- 5. PROFİLLERE İHLAL VE MASKELEME SAYACI EKLEME
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS mask_violation_count INT DEFAULT 0,
    ADD COLUMN IF NOT EXISTS compliance_status VARCHAR(20) DEFAULT 'clean'; -- 'clean', 'warned', 'flagged', 'suspended'

-- 6. GÜVENLİK MODELİ (ROW LEVEL SECURITY - RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_mask_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_reveals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.phone_reveal_daily_logs ENABLE ROW LEVEL SECURITY;

-- System settings: Herkes okuyabilir, sadece admin günceller
DROP POLICY IF EXISTS "Public can read settings" ON public.system_settings;
CREATE POLICY "Public can read settings" ON public.system_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can update settings" ON public.system_settings;
CREATE POLICY "Admins can update settings" ON public.system_settings FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

-- Compliance mask logs: Kullanıcı kendi loglarını görebilir, adminler hepsini görebilir ve inceleyebilir
DROP POLICY IF EXISTS "Users can view own mask logs" ON public.compliance_mask_logs;
CREATE POLICY "Users can view own mask logs" ON public.compliance_mask_logs FOR SELECT
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')));

DROP POLICY IF EXISTS "Users can report false positive on own mask log" ON public.compliance_mask_logs;
CREATE POLICY "Users can report false positive on own mask log" ON public.compliance_mask_logs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "System can insert compliance mask logs" ON public.compliance_mask_logs;
CREATE POLICY "System can insert compliance mask logs" ON public.compliance_mask_logs FOR INSERT
    WITH CHECK (true);

-- Contact reveals: SADECE ilgili alıcı, ilgili firma sahibi veya admin görebilir!
DROP POLICY IF EXISTS "Only involved parties can view contact reveal" ON public.contact_reveals;
CREATE POLICY "Only involved parties can view contact reveal" ON public.contact_reveals FOR SELECT
    USING (
        auth.uid() = buyer_id OR 
        auth.uid() IN (SELECT user_id FROM public.companies WHERE id = contact_reveals.company_id) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

DROP POLICY IF EXISTS "System can insert contact reveals" ON public.contact_reveals;
CREATE POLICY "System can insert contact reveals" ON public.contact_reveals FOR INSERT
    WITH CHECK (
        auth.uid() = buyer_id OR 
        auth.uid() IN (SELECT user_id FROM public.companies WHERE id = contact_reveals.company_id) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Phone reveal daily logs: Kullanıcı kendi kayıtlarını görür ve ekler
DROP POLICY IF EXISTS "Users manage own phone reveal logs" ON public.phone_reveal_daily_logs;
CREATE POLICY "Users manage own phone reveal logs" ON public.phone_reveal_daily_logs FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
