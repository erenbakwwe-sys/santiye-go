-- ==============================================================================
-- ŞANTİYE GO – MAHALLE VE POSTA KODU SEED VERİSİ
-- Kaynak: T.C. PTT Genel Müdürlüğü Posta Kodu Rehberi & TÜİK Adres Kayıt Sistemi
-- Lisans: Açık Kamu Bilgisi / ODbL & MIT Lisanslı Açık Veri
-- ==============================================================================

-- Tablo yapısının güvence altına alınması
CREATE TABLE IF NOT EXISTS neighborhoods (
    id SERIAL PRIMARY KEY,
    district_id INT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,
    city_id INT NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    postal_code VARCHAR(10) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_district_id ON neighborhoods(district_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_city_id ON neighborhoods(city_id);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_postal_code ON neighborhoods(postal_code);
CREATE INDEX IF NOT EXISTS idx_neighborhoods_location ON neighborhoods USING GIST(location);

INSERT INTO neighborhoods (id, city_id, district_id, name, postal_code, location) VALUES
-- İSTANBUL (34)
-- Tuzla (104)
(10401, 34, 104, 'Aydınlı Mah. (Mermerciler OSB)', '34953', ST_SetSRID(ST_MakePoint(29.3512, 40.8495), 4326)::geography),
(10402, 34, 104, 'Tepeören Mah. (Şantiye Parkı)', '34959', ST_SetSRID(ST_MakePoint(29.3876, 40.8841), 4326)::geography),
(10403, 34, 104, 'İçmeler Mah.', '34947', ST_SetSRID(ST_MakePoint(29.3014, 40.8522), 4326)::geography),
(10404, 34, 104, 'Orhanlı Mah.', '34956', ST_SetSRID(ST_MakePoint(29.3456, 40.8712), 4326)::geography),

-- Pendik (103)
(10301, 34, 103, 'Kurtköy Mah.', '34912', ST_SetSRID(ST_MakePoint(29.3015, 40.9082), 4326)::geography),
(10302, 34, 103, 'Şeyhli Mah. (Sanayi Sahası)', '34906', ST_SetSRID(ST_MakePoint(29.2741, 40.9012), 4326)::geography),
(10303, 34, 103, 'Güzelyalı Mah.', '34899', ST_SetSRID(ST_MakePoint(29.2812, 40.8654), 4326)::geography),

-- Kadıköy (101)
(10101, 34, 101, 'Caferağa Mah.', '34710', ST_SetSRID(ST_MakePoint(29.0278, 40.9856), 4326)::geography),
(10102, 34, 101, 'Fikirtepe Mah. (Kentsel Dönüşüm Şantiyeleri)', '34720', ST_SetSRID(ST_MakePoint(29.0492, 40.9984), 4326)::geography),
(10103, 34, 101, 'Kozyatağı Mah.', '34742', ST_SetSRID(ST_MakePoint(29.0985, 40.9712), 4326)::geography),

-- Ümraniye (102)
(10201, 34, 102, 'Dudullu OSB Mah.', '34775', ST_SetSRID(ST_MakePoint(29.1712, 41.0125), 4326)::geography),
(10202, 34, 102, 'İnkılap Mah.', '34768', ST_SetSRID(ST_MakePoint(29.1024, 41.0315), 4326)::geography),

-- Başakşehir (105)
(10501, 34, 105, 'İkitelli OSB Mah.', '34490', ST_SetSRID(ST_MakePoint(28.7954, 41.0742), 4326)::geography),
(10502, 34, 105, 'Bahçeşehir 1. Kısım Mah.', '34488', ST_SetSRID(ST_MakePoint(28.6942, 41.0621), 4326)::geography),

-- Esenyurt (106)
(10601, 34, 106, 'Akçaburgaz Mah. (Sanayi & Makine)', '34522', ST_SetSRID(ST_MakePoint(28.6412, 41.0721), 4326)::geography),
(10602, 34, 106, 'Kıraç Mah.', '34510', ST_SetSRID(ST_MakePoint(28.6321, 41.0456), 4326)::geography),

-- Sarıyer (107)
(10701, 34, 107, 'Maslak Mah.', '34485', ST_SetSRID(ST_MakePoint(29.0211, 41.1112), 4326)::geography),
(10702, 34, 107, 'Ayazağa Mah.', '34396', ST_SetSRID(ST_MakePoint(28.9954, 41.1082), 4326)::geography),

-- ANKARA (06)
-- Yenimahalle (202 / 205 Ostim)
(20501, 6, 205, 'Ostim OSB Mah. (İş Makineleri Pazarı)', '06374', ST_SetSRID(ST_MakePoint(32.7483, 39.9767), 4326)::geography),
(20502, 6, 205, 'İvedik OSB Mah. (Hafriyat & Ağır Sanayi)', '06378', ST_SetSRID(ST_MakePoint(32.7612, 39.9854), 4326)::geography),
(20201, 6, 202, 'Batıkent Mah.', '06370', ST_SetSRID(ST_MakePoint(32.7321, 39.9654), 4326)::geography),

-- Çankaya (201)
(20101, 6, 201, 'Kızılay Mah.', '06420', ST_SetSRID(ST_MakePoint(32.8541, 39.9208), 4326)::geography),
(20102, 6, 201, 'Çayyolu Mah.', '06810', ST_SetSRID(ST_MakePoint(32.6954, 39.8741), 4326)::geography),
(20103, 6, 201, 'Oran Mah.', '06450', ST_SetSRID(ST_MakePoint(32.8312, 39.8456), 4326)::geography),

-- Sincan (204)
(20401, 6, 204, 'Sincan 1. OSB Mah.', '06935', ST_SetSRID(ST_MakePoint(32.5512, 39.9812), 4326)::geography),
(20402, 6, 204, 'Temelli Mah. (Maden & Taş Ocakları)', '06900', ST_SetSRID(ST_MakePoint(32.3612, 39.7312), 4326)::geography),

-- SAMSUN (55)
-- Tekkeköy (701)
(70101, 55, 701, 'Şabanoğlu Mah. (Samsun OSB & İş Makineleri)', '55300', ST_SetSRID(ST_MakePoint(36.4215, 41.2412), 4326)::geography),
(70102, 55, 701, 'Kirazlık Mah. (Lojistik Köyü)', '55330', ST_SetSRID(ST_MakePoint(36.3985, 41.2512), 4326)::geography),
(70103, 55, 701, '19 Mayıs Mah.', '55310', ST_SetSRID(ST_MakePoint(36.4512, 41.2312), 4326)::geography),

-- İlkadım (702)
(70201, 55, 702, 'Kale Mah. (Liman & Merkez)', '55030', ST_SetSRID(ST_MakePoint(36.3321, 41.2912), 4326)::geography),
(70202, 55, 702, 'Kadıköy Mah.', '55050', ST_SetSRID(ST_MakePoint(36.3214, 41.2785), 4326)::geography),

-- İZMİR (35)
-- Aliağa (305)
(30501, 35, 305, 'Aliağa OSB Mah. (Ağır Sanayi & Demir Çelik)', '35800', ST_SetSRID(ST_MakePoint(26.9722, 38.7986), 4326)::geography),
(30502, 35, 305, 'Siteler Mah.', '35803', ST_SetSRID(ST_MakePoint(26.9854, 38.8012), 4326)::geography),

-- Bornova (301)
(30101, 35, 301, 'Kazımdirik Mah.', '35100', ST_SetSRID(ST_MakePoint(27.2189, 38.4650), 4326)::geography),
(30102, 35, 301, 'Işıklar Mah. (Dökümcüler Sanayi)', '35070', ST_SetSRID(ST_MakePoint(27.2456, 38.4354), 4326)::geography),

-- KOCAELİ (41)
-- Gebze (401)
(40101, 41, 401, 'Pelitli Mah. (Hafriyat & Ağır Makine Parkı)', '41400', ST_SetSRID(ST_MakePoint(29.4612, 40.8512), 4326)::geography),
(40102, 41, 401, 'GOSB Mah. (Gebze Organize)', '41480', ST_SetSRID(ST_MakePoint(29.4125, 40.8354), 4326)::geography),

-- Dilovası (404)
(40401, 41, 404, 'Mermerciler Mah. (Dilovası OSB)', '41455', ST_SetSRID(ST_MakePoint(29.5612, 40.8012), 4326)::geography),
(40402, 41, 404, 'İMES OSB Mah.', '41455', ST_SetSRID(ST_MakePoint(29.5854, 40.8254), 4326)::geography)
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, 
    postal_code = EXCLUDED.postal_code, 
    location = EXCLUDED.location;
