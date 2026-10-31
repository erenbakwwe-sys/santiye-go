-- ==============================================================================
-- ŞANTİYE GO – AÇIKÇA "DEMO" ETİKETLİ TEST VERİLERİ (PROMPT 2: 30+ İLAN)
-- (Tüm kayıtlar is_demo = true olarak işaretlenmiştir ve canlıda tek komutla silinebilir)
-- ==============================================================================

-- 1. DEMO KULLANICI PROFİLLERİ
INSERT INTO profiles (id, role, full_name, phone, kvkk_accepted_at) VALUES
('e0000000-0000-0000-0000-000000000001', 'company', '[DEMO] Anadolu İş Makineleri Ltd.', '+90 532 000 0101', NOW()),
('e0000000-0000-0000-0000-000000000002', 'company', '[DEMO] Marmara Yapı & Lojistik A.Ş.', '+90 532 000 0102', NOW()),
('e0000000-0000-0000-0000-000000000003', 'company', '[DEMO] Başkent Ağır Nakliyat & Lowbed', '+90 532 000 0103', NOW()),
('e0000000-0000-0000-0000-000000000004', 'company', '[DEMO] Karadeniz İş Makineleri Parkı', '+90 532 000 0551', NOW()),
('e0000000-0000-0000-0000-000000000005', 'company', '[DEMO] Ege İnşaat & Lojistik A.Ş.', '+90 532 000 0351', NOW()),
('e0000000-0000-0000-0000-000000000006', 'company', '[DEMO] Güney Marmara İş Makineleri', '+90 532 000 0161', NOW()),
('e0000000-0000-0000-0000-000000000007', 'company', '[DEMO] Akdeniz Vinç & Makine Ltd.', '+90 532 000 0071', NOW())
ON CONFLICT (id) DO NOTHING;

-- 2. DEMO FİRMALAR
INSERT INTO companies (id, user_id, name, phone, whatsapp, city_id, district_id, address, location, is_verified, is_demo) VALUES
('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', '[DEMO] Anadolu İş Makineleri Parkı', '+90 532 000 0101', '+90 532 000 0101', 34, 104, 'Tuzla Mermerciler Sanayi Sitesi No: 42, İstanbul', ST_SetSRID(ST_MakePoint(29.3512, 40.8495), 4326)::geography, true, true),
('f0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', '[DEMO] Marmara Yapı Malzemeleri Deposu', '+90 532 000 0102', '+90 532 000 0102', 41, 401, 'Gebze Organize Sanayi Bölgesi 100. Yıl Cad., Kocaeli', ST_SetSRID(ST_MakePoint(29.4612, 40.8512), 4326)::geography, true, true),
('f0000000-0000-0000-0000-000000000003', 'e0000000-0000-0000-0000-000000000003', '[DEMO] Başkent Ağır Nakliyat & Lowbed', '+90 532 000 0103', '+90 532 000 0103', 6, 205, 'Ostim Sanayi Sitesi 1234. Sokak No: 18, Ankara', ST_SetSRID(ST_MakePoint(32.7483, 39.9767), 4326)::geography, true, true),
('f0000000-0000-0000-0000-000000000004', 'e0000000-0000-0000-0000-000000000004', '[DEMO] Karadeniz İş Makineleri Parkı', '+90 532 000 0551', '+90 532 000 0551', 55, 701, 'Tekkeköy Şabanoğlu OSB No: 12, Samsun', ST_SetSRID(ST_MakePoint(36.4215, 41.2412), 4326)::geography, true, true),
('f0000000-0000-0000-0000-000000000005', 'e0000000-0000-0000-0000-000000000005', '[DEMO] Ege İnşaat & Lojistik A.Ş.', '+90 532 000 0351', '+90 532 000 0351', 35, 305, 'Aliağa OSB Ağır Sanayi Parkı No: 55, İzmir', ST_SetSRID(ST_MakePoint(26.9722, 38.7986), 4326)::geography, true, true),
('f0000000-0000-0000-0000-000000000006', 'e0000000-0000-0000-0000-000000000006', '[DEMO] Güney Marmara İş Makineleri', '+90 532 000 0161', '+90 532 000 0161', 16, 501, 'Nilüfer NOSAB Sanayi Sitesi No: 88, Bursa', ST_SetSRID(ST_MakePoint(28.9833, 40.2167), 4326)::geography, true, true),
('f0000000-0000-0000-0000-000000000007', 'e0000000-0000-0000-0000-000000000007', '[DEMO] Akdeniz Vinç & Makine Ltd.', '+90 532 000 0071', '+90 532 000 0071', 7, 602, 'Kepezaltı Makine Sahası No: 104, Antalya', ST_SetSRID(ST_MakePoint(30.6833, 36.9333), 4326)::geography, true, true)
ON CONFLICT (id) DO NOTHING;

-- 3. DEMO İLANLAR (30+ Kayıt)
INSERT INTO listings (
    id, company_id, category_id, title, slug, description, listing_type,
    price_daily, price_weekly, price_monthly, price_sale, currency,
    is_operator_included, is_fuel_included, is_transport_included,
    status, city_id, district_id, neighborhood_id, address_detail, location,
    technical_specs, images, is_demo
) VALUES
-- SAMSUN İLANLARI
(
    '10000000-0000-0000-0000-000000000021',
    'f0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000001',
    '[DEMO] 21 Ton Paletli Ekskavatör Kiralık (Samsun OSB)',
    'demo-21-ton-paletli-ekskavator-kiralik-samsun-osb',
    'Samsun Tekkeköy OSB ve liman çevresi hafriyat işleri için bakımlı, tecrübeli operatörlü Komatsu 21 ton ekskavatör.',
    'rental', 13000, 78000, 290000, NULL, 'TRY',
    true, false, true, 'active', 55, 701, 70101, 'Tekkeköy Şabanoğlu OSB',
    ST_SetSRID(ST_MakePoint(36.4215, 41.2412), 4326)::geography,
    '{"brand": "Komatsu", "model": "PC210", "year": 2021, "tonnage": "21 Ton", "working_hours": 2900, "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80'],
    true
),
(
    '10000000-0000-0000-0000-000000000022',
    'f0000000-0000-0000-0000-000000000004',
    'b0000000-0000-0000-0000-000000000003',
    '[DEMO] JCB 3CX Beko Loder Kepçe - Günlük / Aylık',
    'demo-jcb-3cx-beko-loder-kepce-samsun',
    'Şehir içi kanalizasyon, altyapı ve çevre düzenleme işlerine uygun hidrolik kırıcılı ve çatallı JCB kepçe.',
    'rental', 8500, 50000, 185000, NULL, 'TRY',
    true, false, false, 'active', 55, 702, 70201, 'İlkadım Sanayi Sitesi',
    ST_SetSRID(ST_MakePoint(36.3312, 41.2854), 4326)::geography,
    '{"brand": "JCB", "model": "3CX Eco", "year": 2022, "tonnage": "8.2 Ton", "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80'],
    true
),
(
    '10000000-0000-0000-0000-000000000023',
    'f0000000-0000-0000-0000-000000000004',
    'd0000000-0000-0000-0000-000000000003',
    '[DEMO] 50 Ton Ağır Yük Lowbed Taşıma (Karadeniz Bölgesi)',
    'demo-50-ton-lowbed-karadeniz',
    'Samsun, Trabzon, Ordu ve Çorum hattında ağır iş makinesi ve gabari dışı yük taşımacılığı. Özel izinli.',
    'rental', 22000, 120000, NULL, NULL, 'TRY',
    true, true, true, 'active', 55, 701, 70102, 'Tekkeköy Kirazlık Lojistik Garajı',
    ST_SetSRID(ST_MakePoint(36.3985, 41.2512), 4326)::geography,
    '{"brand": "Kässbohrer", "capacity": "50 Ton", "axle_count": "3 Dingil", "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80'],
    true
),
(
    '10000000-0000-0000-0000-000000000024',
    'f0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000001',
    '[DEMO] Torba Portland Çimento CEM II 42.5 (Paletli)',
    'demo-torba-portland-cimento-samsun',
    'TSE belgeli standart torba çimento. Samsun ve çevre ilçelere kamyon bazında şantiye teslimi.',
    'sale', NULL, NULL, NULL, 175, 'TRY',
    false, false, true, 'active', 55, 701, 70101, 'Tekkeköy Çimento Depoları',
    ST_SetSRID(ST_MakePoint(36.4215, 41.2412), 4326)::geography,
    '{"brand": "Yurtçim", "packaging": "50 kg Torba", "condition": "sıfır"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=800&q=80'],
    true
),

-- İSTANBUL İLANLARI
(
    '10000000-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '[DEMO] CAT 320D 22 Ton Paletli Ekskavatör Kiralık',
    'demo-cat-320d-22-ton-paletli-ekskavator-kiralik',
    'Şantiye ve hafriyat projeleri için periyodik bakımlı, tecrübeli operatörlü 22 ton paletli ekskavatör.',
    'rental', 14500, 85000, 320000, NULL, 'TRY',
    true, false, false, 'active', 34, 104, 10401, 'Tuzla Mermerciler OSB',
    ST_SetSRID(ST_MakePoint(29.3512, 40.8495), 4326)::geography,
    '{"brand": "CAT", "model": "320D", "year": 2021, "tonnage": "22 Ton", "working_hours": 3400, "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80'],
    true
),
(
    '10000000-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000003',
    '[DEMO] 4CX Beko Loder Kepçe - Günlük / Aylık Kiralık',
    'demo-4cx-beko-loder-kepce-gunluk-aylik-kiralik',
    'Kanal kazısı, çevre düzenleme ve yükleme işleri için ideal 4CX JCB kepçe. Operatörlü teslim.',
    'rental', 9500, 58000, 210000, NULL, 'TRY',
    true, false, true, 'active', 34, 102, 10201, 'Ümraniye Dudullu Sahası',
    ST_SetSRID(ST_MakePoint(29.1712, 41.0125), 4326)::geography,
    '{"brand": "JCB", "model": "4CX", "year": 2022, "tonnage": "8.5 Ton", "working_hours": 1850, "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80'],
    true
),
(
    '10000000-0000-0000-0000-000000000008',
    'f0000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000008',
    '[DEMO] 80 Ton Mobil Teleskopik Vinç Kiralık (Operatörlü)',
    'demo-80-ton-mobil-vinç-istanbul',
    'Çelik konstrüksiyon montajı, trafo indirme ve ağır kule vinç kurulumları için 50m ana bomlu mobil vinç.',
    'rental', 26000, 145000, NULL, NULL, 'TRY',
    true, true, true, 'active', 34, 103, 10301, 'Kurtköy Sanayi Garajı',
    ST_SetSRID(ST_MakePoint(29.3015, 40.9082), 4326)::geography,
    '{"brand": "Liebherr", "model": "LTM 1080", "capacity": "80 Ton", "boom_length": "50m", "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80'],
    true
),
(
    '10000000-0000-0000-0000-000000000009',
    'f0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000004',
    '[DEMO] C30/37 Hazır Beton (Mikser & Pompa Dahil m³ Fiyatı)',
    'demo-c30-hazir-beton-istanbul',
    'Yüksek dayanımlı standart yapı betonu. Şantiye sahasına transmikser ve 42m mobil beton pompası ile döküm.',
    'sale', NULL, NULL, NULL, 2350, 'TRY',
    true, true, true, 'active', 34, 105, 10501, 'İkitelli OSB Beton Santrali',
    ST_SetSRID(ST_MakePoint(28.7954, 41.0742), 4326)::geography,
    '{"standard": "TS EN 206", "strength": "C30/37", "slump": "S4 Akıcı", "condition": "sıfır"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80'],
    true
),

-- ANKARA İLANLARI
(
    '10000000-0000-0000-0000-000000000005',
    'f0000000-0000-0000-0000-000000000003',
    'd0000000-0000-0000-0000-000000000003',
    '[DEMO] 60 Ton Kapasiteli 4 Dingil Lowbed Ağır Nakliyat',
    'demo-60-ton-kapasiteli-4-dingil-lowbed-agir-nakliyat',
    'Türkiye geneli paletli ekskavatör, dozer ve gabari dışı ağır şantiye yüklerinin nakliyesi.',
    'rental', 28000, 160000, NULL, NULL, 'TRY',
    true, true, true, 'active', 6, 205, 20501, 'Ostim Sanayi Bölgesi',
    ST_SetSRID(ST_MakePoint(32.7483, 39.9767), 4326)::geography,
    '{"brand": "Mercedes-Benz / Faymonville", "capacity": "60 Ton", "axle_count": "4 Dingil", "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=800&q=80'],
    true
),
(
    '10000000-0000-0000-0000-000000000011',
    'f0000000-0000-0000-0000-000000000003',
    'b0000000-0000-0000-0000-000000000004',
    '[DEMO] CAT D6T Paletli Dozer Kiralık (Lazerli Tesviye)',
    'demo-cat-d6t-dozer-ankara',
    'Yol yapımı, saha düzleme ve büyük hafriyat projeleri için GPS/Lazer kontrollü 22 ton dozer.',
    'rental', 21000, 125000, 460000, NULL, 'TRY',
    true, false, false, 'active', 6, 204, 20401, 'Sincan 1. OSB Garajı',
    ST_SetSRID(ST_MakePoint(32.5512, 39.9812), 4326)::geography,
    '{"brand": "CAT", "model": "D6T XL", "year": 2020, "tonnage": "22.8 Ton", "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80'],
    true
),

-- KOCAELİ İLANLARI
(
    '10000000-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    '[DEMO] Torba Çimento CEM I 42.5 R (Paletli / Kamyon Bazı)',
    'demo-torba-cimento-cem-i-42-5-r-paletli-kamyon-bazi',
    'Yüksek mukavemetli gri portland çimento. Minimum sipariş 1 palet (64 torba).',
    'sale', NULL, NULL, NULL, 185, 'TRY',
    false, false, true, 'active', 41, 401, 40101, 'Gebze Pelitli Lojistik Depo',
    ST_SetSRID(ST_MakePoint(29.4612, 40.8512), 4326)::geography,
    '{"brand": "Çimsa", "standard": "CEM I 42.5 R", "packaging": "50 kg Torba", "condition": "sıfır"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1590069261209-f8e9b8642343?auto=format&fit=crop&w=800&q=80'],
    true
),
(
    '10000000-0000-0000-0000-000000000004',
    'f0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    '[DEMO] Nervürlü İnşaat Demiri B420C (Ø8 - Ø32 mm Ton Fiyatı)',
    'demo-nervurlu-insaat-demiri-b420c-ton-fiyati',
    'TSE ve CE belgeli nervürlü inşaat demiri. İstenilen ebat ve boylarda şantiye sahasına indirmeli teslimat.',
    'sale', NULL, NULL, NULL, 24500, 'TRY',
    false, false, true, 'active', 41, 404, 40401, 'Dilovası Mermerciler Deposu',
    ST_SetSRID(ST_MakePoint(29.5612, 40.8012), 4326)::geography,
    '{"standard": "B420C", "diameter": "Ø8 - Ø32 mm", "origin": "Yerli Üretim", "condition": "sıfır"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80'],
    true
),

-- İZMİR İLANLARI
(
    '10000000-0000-0000-0000-000000000014',
    'f0000000-0000-0000-0000-000000000005',
    'b0000000-0000-0000-0000-000000000001',
    '[DEMO] 30 Ton Hitachi Paletli Ağır Ekskavatör Kiralık',
    'demo-30-ton-hitachi-ekskavator-izmir',
    'Aliağa rafineri ve liman projelerine uygun ağır hizmet kaya kovası ve kırıcılı 30 ton ekskavatör.',
    'rental', 18500, 110000, 410000, NULL, 'TRY',
    true, false, false, 'active', 35, 305, 30501, 'Aliağa OSB Ağır Sanayi Parkı',
    ST_SetSRID(ST_MakePoint(26.9722, 38.7986), 4326)::geography,
    '{"brand": "Hitachi", "model": "ZX300-5G", "year": 2021, "tonnage": "30 Ton", "condition": "az_kullanılmış"}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80'],
    true
)
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 4. DEMO ALICI PROFİLLERİ (PROMPT 3: TEKLİF & REZERVASYON & PUANLAMA TESTİ)
-- ==============================================================================
INSERT INTO profiles (id, role, full_name, phone, kvkk_accepted_at) VALUES
('buyer-demo-001', 'buyer', '[DEMO] Ahmet Yılmaz (Müteahhit)', '+90 532 111 2233', NOW()),
('buyer-demo-002', 'buyer', '[DEMO] Mehmet Demir (Alt Taşeron)', '+90 532 444 5566', NOW())
ON CONFLICT (id) DO NOTHING;

-- 5. DEMO TEKLİF TALEPLERİ (QUOTE REQUESTS)
INSERT INTO quote_requests (
    id, buyer_id, request_type, listing_id, category_id, title, description,
    quantity, start_date, end_date, city_id, district_id, address_detail,
    location, need_operator, need_fuel, need_transport, status,
    max_recipients, search_radius_km, is_demo
) VALUES
(
    'qr-0000-0000-0000-000000000001',
    'buyer-demo-001',
    'single_listing',
    '10000000-0000-0000-0000-000000000001',
    'b0000000-0000-0000-0000-000000000001',
    '[DEMO] Tuzla Şantiye Sahası İçin 22 Ton Ekskavatör Kiralama',
    '3 haftalık temel kazı çalışması için tecrübeli operatörlü 22 ton paletli ekskavatör teklifi talep ediyoruz. Mazot şantiye sahasında bizim tarafımızdan sağlanacaktır.',
    1, '2026-11-05', '2026-11-26', 34, 104, 'Tuzla Tepeören Şantiyesi',
    ST_SetSRID(ST_MakePoint(29.3876, 40.8841), 4326)::geography,
    true, false, true, 'quotes_received', 1, 50, true
),
(
    'qr-0000-0000-0000-000000000002',
    'buyer-demo-001',
    'multi_vendor',
    NULL,
    'd0000000-0000-0000-0000-000000000003',
    '[DEMO] Samsun - Ankara Arası 55 Ton İş Makinesi Taşıma (Lowbed)',
    'Tekkeköy OSB şantiyesinden Ostim sanayi garajına 55 tonluk ekskavatör nakliyesi. Eskortlu ve sigortalı teklif rica olunur.',
    1, '2026-11-10', '2026-11-12', 55, 701, 'Samsun Tekkeköy OSB',
    ST_SetSRID(ST_MakePoint(36.4215, 41.2412), 4326)::geography,
    true, true, true, 'quotes_received', 10, 100, true
)
ON CONFLICT (id) DO NOTHING;

-- 6. DEMO FİRMA TEKLİFLERİ (QUOTES)
INSERT INTO quotes (
    id, request_id, company_id, listing_id, price_total, price_unit, currency,
    is_operator_included, is_fuel_included, is_transport_included,
    notes, valid_until, status, is_demo
) VALUES
(
    'quote-0000-0000-0000-000000000001',
    'qr-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    245000, 11666, 'TRY',
    true, false, true,
    '21 günlük kiralama için nakliye gidiş-dönüş tarafımızca karşılanacaktır. CAT 320D 2021 model makine tahsis edilecektir.',
    NOW() + INTERVAL '3 days', 'submitted', true
),
(
    'quote-0000-0000-0000-000000000002',
    'qr-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000023',
    68000, 68000, 'TRY',
    true, true, true,
    'Samsun - Ankara güzergahı özel izin belgeleri, eskort ve ferdi kaza sigortası fiyata dahildir. 4 dingil hidrolik lowbed ile taşınır.',
    NOW() + INTERVAL '3 days', 'submitted', true
)
ON CONFLICT (id) DO NOTHING;

-- 7. DEMO MÜSAİTLİK TAKVİMİ (CALENDAR ENTRIES)
INSERT INTO availability_calendar (listing_id, date, status, stock_booked, notes) VALUES
('10000000-0000-0000-0000-000000000001', '2026-11-01', 'booked', 1, '[DEMO] Önceden kiralanmış'),
('10000000-0000-0000-0000-000000000001', '2026-11-02', 'booked', 1, '[DEMO] Önceden kiralanmış'),
('10000000-0000-0000-0000-000000000001', '2026-11-03', 'booked', 1, '[DEMO] Önceden kiralanmış'),
('10000000-0000-0000-0000-000000000001', '2026-11-04', 'maintenance', 1, '[DEMO] Periyodik 1000 saat bakımı')
ON CONFLICT (listing_id, date) DO NOTHING;

-- 8. DEMO REZERVASYONLAR (BOOKINGS)
INSERT INTO bookings (
    id, listing_id, buyer_id, company_id, start_date, end_date,
    quantity, daily_price_applied, total_price, currency, status,
    operator_included, fuel_included, transport_included, site_address,
    expires_at, is_demo
) VALUES
(
    'book-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'buyer-demo-001',
    'f0000000-0000-0000-0000-000000000001',
    '2026-11-01', '2026-11-03',
    1, 12000, 36000, 'TRY', 'approved',
    true, false, true, 'Tuzla Tepeören Şantiyesi No: 4',
    NOW() + INTERVAL '2 days', true
)
ON CONFLICT (id) DO NOTHING;

-- 9. DEMO DOĞRULANMIŞ DEĞERLENDİRMELER (REVIEWS & RATINGS)
INSERT INTO reviews (
    id, company_id, listing_id, booking_id, buyer_id,
    rating_overall, rating_quality, rating_timing, rating_communication,
    comment, company_reply, company_reply_at, is_verified, is_demo
) VALUES
(
    'rev-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'book-0000-0000-0000-000000000001',
    'buyer-demo-001',
    4.8, 5, 4, 5,
    'Tuzla şantiyemizdeki temel kazısı için kiraladık. CAT 320D ekskavatör tam vaktinde geldi. Operatör son derece tecrübeli ve İSG kurallarına tam uyumluydu. Teşekkürler.',
    'Güzel yorumunuz için teşekkür ederiz Ahmet Bey. Şantiye GO üzerinden her zaman yanınızdayız.',
    NOW() - INTERVAL '2 days', true, true
)
ON CONFLICT (id) DO NOTHING;

-- 10. DEMO KONUŞMALAR VE MESAJLAR
INSERT INTO conversations (id, listing_id, buyer_id, company_id, is_demo) VALUES
('conv-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'buyer-demo-001', 'f0000000-0000-0000-0000-000000000001', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, conversation_id, sender_id, body, is_read, created_at) VALUES
('msg-0000-0000-0000-000000000001', 'conv-0000-0000-0000-000000000001', 'buyer-demo-001', 'Merhaba, Tuzla Tepeören şantiyemiz için 3 haftalık kiralama düşünüyoruz. Operatörünüzün G sınıfı belgesi ve SGK dökümü mevcut mudur?', true, NOW() - INTERVAL '6 hours'),
('msg-0000-0000-0000-000000000002', 'conv-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Merhabalar, evet tüm operatörlerimiz sertifikalıdır, İSG evrakları şantiye girişine eksiksiz teslim edilir.', true, NOW() - INTERVAL '4 hours'),
('msg-0000-0000-0000-000000000003', 'conv-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'Pazartesi günü şantiye sahanıza tır ile teslimatı sağlayabiliriz.', false, NOW() - INTERVAL '3 hours')
ON CONFLICT (id) DO NOTHING;

-- 11. DEMO YÖNETİCİ HESABI (PROMPT 4)
INSERT INTO admin_users (id, email, full_name, role, is_active, two_factor_enabled) VALUES
('admin-super-001', 'eren@santiyego.com', 'Eren Yılmaz (Süper Admin)', 'super_admin', true, true)
ON CONFLICT (id) DO NOTHING;

-- 12. DEMO FİRMA DOĞRULAMA & ALT ÜYE İŞYERİ GÜNCELLEMESİ
UPDATE companies SET
    verification_status = 'approved',
    tax_office = 'Tuzla Vergi Dairesi',
    tax_number = '1234567890',
    iban = 'TR330006100511123456789001',
    official_title = 'Anadolu İş Makineleri İnşaat ve Sanayi Ltd. Şti.',
    submerchant_key = 'subm_anadolu_001',
    accept_online_payments = true
WHERE id = 'f0000000-0000-0000-0000-000000000001';

UPDATE companies SET
    verification_status = 'pending_review',
    tax_office = 'Gebze İlyasbey VD',
    tax_number = '9876543210',
    iban = 'TR440006200000000123456789',
    official_title = 'Marmara Yapı Malzemeleri Lojistik A.Ş.',
    tax_document_url = 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800',
    signature_circular_url = 'https://images.unsplash.com/photo-1450133064473-71024230f91b?w=800'
WHERE id = 'f0000000-0000-0000-0000-000000000002';

-- 13. DEMO ABONELİK (PROFESYONEL PAKET)
INSERT INTO company_subscriptions (id, company_id, plan_id, billing_cycle, starts_at, expires_at, is_active, auto_renew) VALUES
('sub-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'professional', 'monthly', NOW() - INTERVAL '10 days', NOW() + INTERVAL '20 days', true, true)
ON CONFLICT (id) DO NOTHING;

-- 14. DEMO ÖDEME İŞLEMİ (İYİGÜVENLİ HAVUZ & KOMİSYON KESİNTİSİ)
INSERT INTO payment_transactions (
    id, booking_id, buyer_id, company_id, gateway_provider, gateway_payment_id,
    gross_amount_cents, commission_amount_cents, net_amount_cents,
    commission_rate_applied, vat_amount_cents, status, submerchant_payout_status, is_demo
) VALUES (
    'pay-0000-0000-0000-000000000001',
    'book-0000-0000-0000-000000000001',
    'buyer-demo-001',
    'f0000000-0000-0000-0000-000000000001',
    'iyzico',
    'iyzi_demo_98274192',
    3600000, 216000, 3384000, 0.060, 36000,
    'success', 'transferred', true
)
ON CONFLICT (id) DO NOTHING;

-- 15. DEMO ADMİN DENETİM LOGU
INSERT INTO admin_audit_logs (id, admin_id, admin_email, action, target_type, target_id, details) VALUES
('log-0000-0000-0000-000000000001', 'admin-super-001', 'eren@santiyego.com', 'approve_company', 'company', 'f0000000-0000-0000-0000-000000000001', '{"notes": "Vergi levhası ve imza sirküleri onaylandı. Alt üye işyeri anahtarı üretildi."}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 16. DEMO REKLAM VE ÖNE ÇIKARMA KAMPANYALARI (PROMPT 5)
INSERT INTO ad_campaigns (
    id, company_id, product_id, listing_id, title,
    target_city_id, target_category_id, target_radius_km,
    pricing_model, duration_days, starts_at, expires_at,
    total_price_cents, status, impressions_count, clicks_count, is_demo
) VALUES
(
    'camp-0000-0000-0000-000000000001',
    'f0000000-0000-0000-0000-000000000001',
    'sponsored_listing',
    '10000000-0000-0000-0000-000000000001',
    '[DEMO] CAT 320D Sponsorlu Arama',
    34, 'b0000000-0000-0000-0000-000000000001', 50,
    'fixed_duration', 14, NOW() - INTERVAL '3 days', NOW() + INTERVAL '11 days',
    110000, 'active', 342, 28, true
),
(
    'camp-0000-0000-0000-000000000002',
    'f0000000-0000-0000-0000-000000000004',
    'sponsored_listing',
    '10000000-0000-0000-0000-000000000021',
    '[DEMO] Komatsu 21 Ton Karadeniz Sponsorlu',
    55, 'b0000000-0000-0000-0000-000000000001', 50,
    'fixed_duration', 7, NOW() - INTERVAL '2 days', NOW() + INTERVAL '5 days',
    60000, 'active', 184, 15, true
),
(
    'camp-0000-0000-0000-000000000003',
    'f0000000-0000-0000-0000-000000000001',
    'showcase_home',
    '10000000-0000-0000-0000-000000000001',
    '[DEMO] Ana Sayfa Vitrin Ekskavatör',
    NULL, NULL, NULL,
    'fixed_duration', 30, NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days',
    245000, 'active', 1240, 76, true
)
ON CONFLICT (id) DO NOTHING;

-- 17. DEMO ANALİTİK GÜNLÜK ÖZET (PROMPT 5)
INSERT INTO analytics_daily_summary (
    date, target_type, target_id, views_count, unique_visitors_count,
    favorites_count, phone_clicks_count, whatsapp_clicks_count,
    quote_requests_count, bookings_count, ad_impressions_count, ad_clicks_count
) VALUES
(
    CURRENT_DATE, 'company', 'f0000000-0000-0000-0000-000000000001',
    184, 92, 5, 6, 4, 2, 1, 158, 12
)
ON CONFLICT (date, target_type, target_id) DO NOTHING;

-- ==============================================================================
-- 18. PROMPT 6: İSKELE, ASANSÖR, EKİPMAN & İNŞAAT HİZMETLERİ DEMO İLANLARI
-- ==============================================================================
INSERT INTO listings (
    id, company_id, category_id, title, slug, description,
    listing_type, price_daily, price_weekly, price_monthly, price_sale, currency,
    is_operator_included, is_fuel_included, is_transport_included, status,
    city_id, district_id, address_detail, location, technical_specs, images, is_demo
) VALUES
-- İskele ve Kalıp
(
    '10000000-0000-0000-0000-000000000030', 'f0000000-0000-0000-0000-000000000001', 'sub-isk-1',
    '[DEMO] Güvenlikli Flanşlı Dış Cephe İskelesi (10.000 m² Stok)', 'demo-guvenlikli-flansli-dis-cephe-iskelesi',
    'TSE EN 12810 normlarına uygun flanşlı kamalı güvenlikli dış cephe iskele sistemi.',
    'rental', 45, NULL, 45, NULL, 'TRY',
    false, false, true, 'active', 34, 102, 'Ümraniye Dudullu OSB İskele Deposu',
    ST_SetSRID(ST_MakePoint(29.1712, 41.0125), 4326)::geography,
    '{"scaffold_system_type": "Flanşlı Kamalı", "surface_area_m2": 10000, "has_tse_standard": true}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80'],
    true
),
-- Asansör ve Platform
(
    '10000000-0000-0000-0000-000000000035', 'f0000000-0000-0000-0000-000000000001', 'sub-asn-1',
    '[DEMO] 2 Ton Çift Kabin Dış Cephe İnşaat Yük Asansörü', 'demo-2-ton-cift-kabin-insaat-asansoru',
    'Yüksek yapılarda malzeme ve personel taşıma için çift kabinli güvenlik sistemli inşaat asansörü.',
    'rental', 4800, 28000, 95000, NULL, 'TRY',
    true, false, true, 'active', 34, 104, 'İkitelli OSB Metal-İş Sanayi',
    ST_SetSRID(ST_MakePoint(28.7981, 41.0745), 4326)::geography,
    '{"lift_system_type": "Dış Cephe Yük Asansörü", "lifting_capacity_kg": 2000, "working_height_m": 60, "has_periodic_inspection": true}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=800&q=80'],
    true
),
-- Şantiye Ekipmanları
(
    '10000000-0000-0000-0000-000000000040', 'f0000000-0000-0000-0000-000000000001', 'sub-ekp-1',
    '[DEMO] 3x7 m Çift Odalı WC & Lavabolu Şantiye Yaşam Konteyneri', 'demo-3x7-santiye-yasam-konteyneri',
    'Sandviç panel izolasyonlu, elektrik ve su tesisatlı şantiye konteyneri.',
    'rental', 450, 2800, 9500, NULL, 'TRY',
    false, false, true, 'active', 34, 102, 'Ümraniye Dudullu Sahası',
    ST_SetSRID(ST_MakePoint(29.1712, 41.0125), 4326)::geography,
    '{"equipment_type": "Konteyner", "power_output_kva": 0}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80'],
    true
),
-- İnşaat Hizmetleri (Service)
(
    '10000000-0000-0000-0000-000000000045', 'f0000000-0000-0000-0000-000000000001', 'sub-hzm-2',
    '[DEMO] Şantiye Karot & Hidrolik Beton Kesme Delme Hizmeti', 'demo-karot-hidrolik-beton-kesme-hizmeti',
    'Q20 ile Q600 mm çap arası vibrasyonsuz elmaslı karot delimi ve hidrolik beton kesme hizmeti.',
    'service', NULL, NULL, NULL, NULL, 'TRY',
    false, false, true, 'active', 34, 101, 'Kadıköy Fikirtepe Hizmet Sahası',
    ST_SetSRID(ST_MakePoint(29.0492, 40.9984), 4326)::geography,
    '{"construction_service_branch": "Karot & Beton Delme Kesme", "team_experience_years": 15, "crew_size_people": 12, "has_official_authorization": true}'::jsonb,
    ARRAY['https://images.unsplash.com/photo-1541888946425-d0fbb186c5f7?auto=format&fit=crop&w=800&q=80'],
    true
)
ON CONFLICT (id) DO NOTHING;
