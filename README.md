# 🏗️ ŞANTİYE GO – Akıllı Şantiye ve Yapı Marketiniz

> **"Şantiyenizin akıllı çözüm ortağı."**  
> *"Aradığın her şey, sana en yakın yerde, en iyi tekliflerle!"*

ŞANTİYE GO, Türkiye genelinde inşaat firmaları, müteahhitler ve şantiye yöneticileri için geliştirilmiş, konum tabanlı (PostGIS) yeni nesil bir dijital pazaryeridir.

---

## 🚀 Hızlı Başlangıç

### 1. Bağımlılıkların Yüklenmesi
```bash
npm install
```

### 2. Ortam Değişkenleri (.env.local)
Proje kök dizininde yer alan `.env.example` dosyasını `.env.local` olarak kopyalayın:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SHOW_DEMO_DATA=true
```
*(Supabase bilgileri girilmediğinde sistem otomatik olarak yerel demo modunda ve gerçek mesafe formülüyle çalışır).*

### 3. Geliştirme Sunucusunu Başlatma
```bash
npm run dev
```
Tarayıcınızda [http://localhost:3000](http://localhost:3000) adresine gidin.

### 4. Canlı Üretime Derleme (Production Build)
```bash
npm run build
npm run start
```

---

## 🗄️ Veritabanı Kurulumu (Supabase + PostGIS)

Proje veritabanı şeması ve tohum (seed) SQL betikleri `supabase/` dizinindedir:

1. **Şema & RLS Kurulumu:**
   `supabase/migrations/01_schema.sql` dosyasını Supabase SQL Editöründe çalıştırın.  
   *(PostGIS uzantısı, `cities`, `districts`, `categories`, `listings`, `companies`, `profiles`, `favorites` tabloları ve mesafe arama fonksiyonu `search_listings_by_distance` kurulur).*

2. **İl ve İlçe Verisi (Türkiye 81 İl):**
   `supabase/seed_cities_districts.sql` dosyasını çalıştırarak illeri ve örnek sanayi ilçelerini WGS84 koordinatlarıyla yükleyin.

3. **Kategoriler (İş Makineleri, Yapı Malzemeleri, Nakliye):**
   `supabase/seed_categories.sql` dosyasını çalıştırarak 3 ana kategori ve 28 alt kategoriyi yükleyin.

4. **Test (Demo) Verileri:**
   `supabase/seed_demo_data.sql` dosyasını çalıştırarak `is_demo = true` etiketli test ilanlarını yükleyin.

5. **Demo Veri Temizleme (Tek Komut):**
   `supabase/clean_demo.sql` dosyasını çalıştırarak sistemdeki tüm demo kayıtları anında silebilirsiniz:
   ```sql
   DELETE FROM listings WHERE is_demo = true;
   DELETE FROM companies WHERE is_demo = true;
   ```

---

## 🎯 Tamamlanan Kapsam (MVP Özellikleri)

1. **3 Ana Kategori ve Dinamik Alt Kategoriler:**
   - **İş Makineleri:** Ekskavatör, Mini Ekskavatör, JCB (Beko Loder), Dozer, Greyder, Loder, Forklift, Vinç, Beton Mikseri, Silindir, Kompresör, Jeneratör.
   - **Yapı Malzemeleri:** Çimento, Demir/Donatı, Kum/Çakıl, Hazır Beton, Tuğla/Bims, Gazbeton, Alçı/Sıva, Yalıtım, Boya, Seramik.
   - **Nakliye:** Hafriyat, Kamyon Kiralama, Lowbed (Ağır Nakliye), Vinçli Nakliye, İş Makinesi Nakliyesi, Moloz Taşıma.

2. **Rol Bazlı Kullanıcı Sistemi & KVKK:**
   - Alıcı / Müteahhit ve Firma / Satıcı rol ayrımı.
   - KVKK aydınlatma metni onayı ve gizlilik taahhüdü.
   - Next.js Middleware korumalı panel yönlendirmeleri.

3. **Firma Paneli:**
   - Firma profili (Unvan, telefon, WhatsApp, vergi dairesi, il/ilçe, garaj adresi).
   - İlan ekleme / düzenleme / yayından kaldırma.
   - Fiyatlama: Günlük, haftalık, aylık kiralama veya satış fiyatı.
   - Hizmet kapsamı: Operatör dahil mi, Yakıt dahil mi, Nakliye dahil mi?
   - İnteraktif Leaflet harita üzerinden pin sürükleyerek şantiye/depo tam koordinatı belirleme.

4. **Alıcı Paneli & Doğrudan İletişim:**
   - Favori ilan takibi.
   - İlan detayında **"Firmayı Ara" (`tel:`)** ve **"WhatsApp İle Teklif Al" (`https://wa.me/...`)** butonları (aracısız ve komisyonsuz doğrudan temas).

5. **Akıllı Arama ve PostGIS Mesafe Filtreleme:**
   - Kelime + Kategori + İl/İlçe filtresi.
   - **"Konumumu Kullan" (Browser Geolocation API):** Tarayıcı konumundan anlık mesafe hesabı.
   - Mesafe yarıçapı: 5 km / 10 km / 25 km / 50 km / 100 km / Tüm Türkiye.
   - Sıralama: En Yakın, En Ucuz, En Yeni.
   - Liste görünümü ve Leaflet Harita görünümü geçişi.

6. **İlan Detay Sayfası:**
   - Fotoğraf galerisi, teknik özellikler tablosu, fiyatlama şeffaflığı, onaylı firma kartı ve harita pini.
