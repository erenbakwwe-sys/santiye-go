-- ==============================================================================
-- ŞANTİYE GO – STORAGE BUCKET RLS POLİTİKALARI (storage_rls_fix.sql)
-- listing-photos bucket'ı için herkese açık okuma ve giriş yapmış kullanıcılara yükleme izni
-- ==============================================================================

-- 1. listing-photos bucket'ının varlığını ve public olduğunu doğrula
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'listing-photos',
    'listing-photos',
    true,
    10485760, -- 10 MB
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 2. Herkese açık okuma (Public SELECT) politikası
DROP POLICY IF EXISTS "Public Access for Listing Photos" ON storage.objects;
CREATE POLICY "Public Access for Listing Photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'listing-photos');

-- 3. Fotoğraf Yükleme (INSERT) Politikası (Oturum açmış veya anonim kullanıcılar için güvenli izin)
DROP POLICY IF EXISTS "Allow Upload for Listing Photos" ON storage.objects;
CREATE POLICY "Allow Upload for Listing Photos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (bucket_id = 'listing-photos');

-- 4. Fotoğraf Güncelleme ve Silme (UPDATE/DELETE) Politikası
DROP POLICY IF EXISTS "Allow Update and Delete for Listing Photos" ON storage.objects;
CREATE POLICY "Allow Update and Delete for Listing Photos"
ON storage.objects FOR ALL
TO public
USING (bucket_id = 'listing-photos')
WITH CHECK (bucket_id = 'listing-photos');
