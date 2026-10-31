-- ==============================================================================
-- ŞANTİYE GO – KATEGORİ VE ALT KATEGORİLER SEED VERİSİ
-- ==============================================================================

-- 1. ANA KATEGORİLER
INSERT INTO categories (id, parent_id, name, slug, icon, order_index) VALUES
('a0000000-0000-0000-0000-000000000001', NULL, 'İş Makineleri', 'is-makineleri', 'Wrench', 1),
('a0000000-0000-0000-0000-000000000002', NULL, 'Yapı Malzemeleri', 'yapi-malzemeleri', 'Boxes', 2),
('a0000000-0000-0000-0000-000000000003', NULL, 'Nakliye', 'nakliye', 'Truck', 3)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index;

-- 2. İŞ MAKİNELERİ ALT KATEGORİLERİ
INSERT INTO categories (id, parent_id, name, slug, icon, order_index) VALUES
('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Ekskavatör', 'ekskavator', 'Wrench', 1),
('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'Mini Ekskavatör', 'mini-ekskavator', 'Wrench', 2),
('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'JCB (Beko Loder)', 'jcb-beko-loder', 'Wrench', 3),
('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000001', 'Dozer', 'dozer', 'Wrench', 4),
('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'Greyder', 'greyder', 'Wrench', 5),
('b0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000001', 'Loder (Yükleyici)', 'loder-yukleyici', 'Wrench', 6),
('b0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'Forklift', 'forklift', 'Wrench', 7),
('b0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000001', 'Vinç (Mobil / Kule)', 'vinc', 'Wrench', 8),
('b0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000001', 'Beton Mikseri', 'beton-mikseri', 'Wrench', 9),
('b0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000001', 'Silindir', 'silindir', 'Wrench', 10),
('b0000000-0000-0000-0000-000000000011', 'a0000000-0000-0000-0000-000000000001', 'Kompresör', 'kompresor', 'Wrench', 11),
('b0000000-0000-0000-0000-000000000012', 'a0000000-0000-0000-0000-000000000001', 'Jeneratör', 'jenerator', 'Wrench', 12)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index;

-- 3. YAPI MALZEMELERİ ALT KATEGORİLERİ
INSERT INTO categories (id, parent_id, name, slug, icon, order_index) VALUES
('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'Çimento', 'cimento', 'Boxes', 1),
('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Demir / Donatı', 'demir-donati', 'Boxes', 2),
('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'Kum & Çakıl', 'kum-cakil', 'Boxes', 3),
('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000002', 'Hazır Beton', 'hazir-beton', 'Boxes', 4),
('c0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000002', 'Tuğla & Bims', 'tugla-bims', 'Boxes', 5),
('c0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000002', 'Gazbeton', 'gazbeton', 'Boxes', 6),
('c0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000002', 'Alçı & Sıva', 'alci-siva', 'Boxes', 7),
('c0000000-0000-0000-0000-000000000008', 'a0000000-0000-0000-0000-000000000002', 'Yalıtım & İzolasyon', 'yalitim-izolasyon', 'Boxes', 8),
('c0000000-0000-0000-0000-000000000009', 'a0000000-0000-0000-0000-000000000002', 'İnşaat Boyası', 'insaat-boyasi', 'Boxes', 9),
('c0000000-0000-0000-0000-000000000010', 'a0000000-0000-0000-0000-000000000002', 'Seramik & Fayans', 'seramik-fayans', 'Boxes', 10)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index;

-- 4. NAKLİYE ALT KATEGORİLERİ
INSERT INTO categories (id, parent_id, name, slug, icon, order_index) VALUES
('d0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'Hafriyat Nakliyesi', 'hafriyat-nakliyesi', 'Truck', 1),
('d0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Kamyon Kiralama', 'kamyon-kiralama', 'Truck', 2),
('d0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Lowbed (Ağır Nakliyat)', 'lowbed-agir-nakliyat', 'Truck', 3),
('d0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000003', 'Vinçli Nakliye', 'vincli-nakliye', 'Truck', 4),
('d0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'İş Makinesi Nakliyesi', 'is-makinesi-nakliyesi', 'Truck', 5),
('d0000000-0000-0000-0000-000000000006', 'a0000000-0000-0000-0000-000000000003', 'Moloz Taşıma', 'moloz-tasima', 'Truck', 6)
ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name, icon = EXCLUDED.icon, order_index = EXCLUDED.order_index;
