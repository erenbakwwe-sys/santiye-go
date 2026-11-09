-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 13: TAVAN / KADEMELİ KOMİSYON VE OTOMATİK SÖZLEŞME (PROMPT 9C)
-- ==============================================================================

-- 1. KOMİSYON KURALLARI TABLOSUNU GENİŞLET
ALTER TABLE IF EXISTS public.commission_rules
ADD COLUMN IF NOT EXISTS cap_amount_cents BIGINT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS min_amount_cents BIGINT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS tiers JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS exempt_if_quote_credit_used BOOLEAN DEFAULT false;

-- 2. ÖDEME İŞLEMLERİ TABLOSUNA DONDURULMUŞ KOMİSYON ALANLARI
ALTER TABLE IF EXISTS public.payment_transactions
ADD COLUMN IF NOT EXISTS commission_base_rate NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS commission_cap_cents BIGINT,
ADD COLUMN IF NOT EXISTS is_commission_capped BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS capped_commission_savings_cents BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS commission_tier_applied JSONB,
ADD COLUMN IF NOT EXISTS credit_exemption_applied BOOLEAN DEFAULT false;

-- 3. SÖZLEŞME ŞABLONLARI TABLOSU (SÜRÜMLÜ ŞABLONLAR)
CREATE TABLE IF NOT EXISTS public.contract_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_type VARCHAR(50) NOT NULL, -- 'rental' (Kiralama), 'service' (Nakliye/Hizmet)
    version INT NOT NULL DEFAULT 1,
    title VARCHAR(200) NOT NULL,
    standard_terms TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(template_type, version)
);

CREATE INDEX IF NOT EXISTS idx_contract_templates_type_v ON public.contract_templates(template_type, version DESC);

-- Başlangıç Şablonları (Sürüm 1)
INSERT INTO public.contract_templates (template_type, version, title, standard_terms)
VALUES
    ('rental', 1, 'İş Makineleri ve Ekipman Kiralama Sözleşmesi', $$1. TARAFLAR: İşbu sözleşme ŞantiyeGO platformu üzerinden anlaşan Kiralayan (Firma) ile Kiracı (Alıcı) arasında akdedilmiştir.
2. SÖZLEŞMENİN KONUSU: İlanda ve sipariş dökümünde dinamik özellikleri belirtilen ekipmanın, belirtilen süre ve şantiye adresinde kiralanmasıdır.
3. PLATFORMUN KONUMU: ŞantiyeGO (Platform), 6563 sayılı Kanun kapsamında Aracı Hizmet Sağlayıcıdır; sözleşmenin tarafı, garantörü veya kefili değildir.
4. TESLİM VE İADE: Ekipman eksiksiz ve çalışır vaziyette tutanakla teslim edilir ve iade alınır.
5. KULLANIM VE BAKIM: Kiracı, ekipmanı amacına uygun, iş güvenliği mevzuatına riayet ederek kullanmakla yükümlüdür.
6. HASAR VE KAYIP: Kiracının kusurundan doğan hasarlar Kiracı tarafından tazmin edilir.
7. İPTAL VE FESİH: İptal ve cayma hallerinde ŞantiyeGO İptal ve İade Koşulları geçerlidir.
8. MÜCBİR SEBEPLER: Tarafların kontrolü dışındaki doğal afet, yangın, salgın vb. durumlarda yükümlülükler askıya alınır.
9. GİZLİLİK VE KVKK: Taraflar paylaşılan bilgileri işbu sözleşme haricinde kullanamaz.
10. UYUŞMAZLIKLARIN ÇÖZÜMÜ: Uyuşmazlıklarda yetkili icra daireleri ve mahkemeler hukukçular tarafından belirlenecektir.
NOT: İşbu metin TASLAK niteliğinde olup hukuki incelemeden geçirilmelidir.$$),

    ('service', 1, 'Ağır Nakliye ve İnşaat Hizmeti Sözleşmesi', $$1. TARAFLAR: İşbu sözleşme ŞantiyeGO platformu üzerinden anlaşan Hizmet Sağlayıcı (Firma) ile Hizmet Alan (Alıcı) arasında akdedilmiştir.
2. SÖZLEŞMENİN KONUSU: İlanda belirtilen nakliye/hizmetin, belirtilen güzergah veya şantiye sahasında ifa edilmesidir.
3. PLATFORMUN KONUMU: ŞantiyeGO Aracı Hizmet Sağlayıcıdır; hizmetin doğrudan ifacısı veya tarafı değildir.
4. YÜK VE SAHA SORUMLULUĞU: Hizmet alan, yükün niteliği ve yol/saha koşulları hakkında doğru bilgi vermekle yükümlüdür.
5. İFA VE GECİKME: Taşıma ve hizmet süresi mücbir sebepler saklı kalmak üzere kararlaştırılan tarihlerde tamamlanır.
6. İPTAL KOŞULLARI: ŞantiyeGO hizmet iptal politikası geçerlidir.
7. GİZLİLİK: Ticari bilgiler gizli tutulacaktır.
8. UYUŞMAZLIKLAR: Yetkili mahkeme alanı taraflarca belirlenecektir.
NOT: İşbu metin TASLAK niteliğinde olup hukuki incelemeden geçirilmelidir.$$)
ON CONFLICT (template_type, version) DO NOTHING;

-- 4. ÜRETİLEN SÖZLEŞMELER TABLOSU (DONDURULMUŞ SNAPSHOT VE SHA-256)
CREATE TABLE IF NOT EXISTS public.contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contract_number VARCHAR(50) UNIQUE NOT NULL,
    contract_type VARCHAR(50) NOT NULL, -- 'rental' | 'service'
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    quote_id UUID REFERENCES public.quotes(id) ON DELETE SET NULL,
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    
    template_id UUID REFERENCES public.contract_templates(id),
    template_version INT NOT NULL DEFAULT 1,
    data_snapshot JSONB NOT NULL,
    
    pdf_sha256 VARCHAR(64) NOT NULL,
    pdf_storage_path TEXT,
    
    status VARCHAR(30) DEFAULT 'pending_approval', -- 'draft', 'pending_approval', 'mutual_approved', 'revision_requested', 'superseded'
    company_approved_at TIMESTAMPTZ,
    buyer_approved_at TIMESTAMPTZ,
    company_approved_ip VARCHAR(45),
    buyer_approved_ip VARCHAR(45),
    revision_notes TEXT,
    
    signed_copy_url TEXT,
    signed_uploaded_by UUID REFERENCES public.profiles(id),
    signed_uploaded_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contracts_buyer ON public.contracts(buyer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_company ON public.contracts(company_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_contracts_booking ON public.contracts(booking_id);
CREATE INDEX IF NOT EXISTS idx_contracts_quote ON public.contracts(quote_id);

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.contract_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;

-- Şablonları herkes okuyabilir (aktif olanları)
DROP POLICY IF EXISTS "contract_templates_read_all" ON public.contract_templates;
CREATE POLICY "contract_templates_read_all" ON public.contract_templates
    FOR SELECT USING (is_active = true);

-- Sözleşmeleri sadece taraflar ve adminler okuyabilir
DROP POLICY IF EXISTS "contracts_parties_read" ON public.contracts;
CREATE POLICY "contracts_parties_read" ON public.contracts
    FOR SELECT USING (
        buyer_id = auth.uid() OR
        company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );

-- Taraflar onay bilgilerini güncelleyebilir
DROP POLICY IF EXISTS "contracts_parties_update" ON public.contracts;
CREATE POLICY "contracts_parties_update" ON public.contracts
    FOR UPDATE USING (
        buyer_id = auth.uid() OR
        company_id IN (SELECT id FROM public.companies WHERE user_id = auth.uid()) OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin'))
    );
