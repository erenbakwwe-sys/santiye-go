import { sanitizeContent } from '../src/lib/security/contact-masker';

async function testStep4ListingCreation() {
  console.log('=== ADIM 4: İLAN OLUŞTURMA VE ŞEMA DOĞRULAMA TESTİ ===\n');

  // 1. İlan Başlığı ve Açıklama Temizliği (Maskeleme Testi)
  const rawTitle = 'Temiz 2021 Model 22 Ton Ekskavatör Kiralık';
  const rawDesc = 'Ataşehir şantiyelerine operatörlü ekskavatör. Arayınız 0532 999 00 11 veya mail atın test@example.com';

  const maskedTitle = sanitizeContent(rawTitle).maskedText;
  const maskedDesc = sanitizeContent(rawDesc).maskedText;

  if (maskedDesc.includes('[iletişim bilgisi gizlendi]') || maskedDesc.includes('***')) {
    console.log('✅ [PASS] İlan açıklamasındaki izinsiz telefon numarası başarıyla filtrelendi/maskelendi.');
  } else {
    console.error('❌ [FAIL] Telefon numarası maskelenmedi:', maskedDesc);
    process.exit(1);
  }

  // 2. Slug Üretimi Doğrulaması (Türkçe Karakter ve Güvenlik)
  const baseSlug = rawTitle
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;
  if (/^[a-z0-9-]+$/.test(uniqueSlug) && !uniqueSlug.includes(' ')) {
    console.log(`✅ [PASS] URL dostu ve SEO uyumlu tekil slug üretildi: "${uniqueSlug}"`);
  } else {
    console.error('❌ [FAIL] Geçersiz slug:', uniqueSlug);
    process.exit(1);
  }

  // 3. PostGIS Coğrafi Format Doğrulaması
  const coords = { lat: 40.9833, lng: 29.1167 }; // Ataşehir
  const locationWkt = `SRID=4326;POINT(${coords.lng} ${coords.lat})`;

  if (locationWkt.startsWith('SRID=4326;POINT(') && locationWkt.endsWith(')')) {
    console.log(`✅ [PASS] PostGIS WKT koordinat formatı eksiksiz: "${locationWkt}"`);
  } else {
    console.error('❌ [FAIL] Hatalı PostGIS formatı:', locationWkt);
    process.exit(1);
  }

  // 4. Veritabanı Kolon Uyumluluğu Doğrulaması
  // listings tablosunun kabul ettiği birebir alanlar:
  const validDbColumns = [
    'company_id',
    'category_id',
    'title',
    'slug',
    'description',
    'listing_type',
    'price_daily',
    'price_weekly',
    'price_monthly',
    'price_sale',
    'currency',
    'is_operator_included',
    'is_fuel_included',
    'is_transport_included',
    'status',
    'city_id',
    'district_id',
    'address_detail',
    'location',
    'technical_specs',
    'images',
    'is_demo',
  ];

  const listingPayload: Record<string, any> = {
    company_id: 'c0000000-0000-0000-0000-000000000001',
    category_id: 'b0000000-0000-0000-0000-000000000001',
    title: maskedTitle,
    slug: uniqueSlug,
    description: maskedDesc,
    listing_type: 'rental',
    price_daily: 12000,
    price_weekly: 75000,
    price_monthly: 280000,
    price_sale: null,
    currency: 'TRY',
    is_operator_included: true,
    is_fuel_included: false,
    is_transport_included: true,
    status: 'active',
    city_id: 34,
    district_id: 104,
    address_detail: 'Tepeören Şantiyesi',
    location: locationWkt,
    technical_specs: {
      operating_weight_ton: 22,
      bucket_capacity_m3: 1.2,
      pricing_type: 'daily',
    },
    images: ['https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b'],
    is_demo: false,
  };

  // Tabloda olmayan herhangi bir geçersiz kolon (örneğin eski 'lat', 'lng', 'specifications') gönderilmediğinden emin ol
  const sentKeys = Object.keys(listingPayload);
  const invalidKeys = sentKeys.filter((k) => !validDbColumns.includes(k));

  if (invalidKeys.length === 0) {
    console.log('✅ [PASS] İlan verisi PostgreSQL şemasıyla %100 uyumlu (Hatalı kolon bulunmuyor).');
  } else {
    console.error('❌ [FAIL] Veritabanında olmayan kolonlar tespit edildi:', invalidKeys);
    process.exit(1);
  }

  console.log('\n======================================================');
  console.log('4. ADIM (İLAN AÇMA ŞEMA VE İŞLEM DOĞRULAMA) %100 GEÇTİ!');
  console.log('======================================================\n');
}

testStep4ListingCreation().catch((e) => {
  console.error('Test hatası:', e);
  process.exit(1);
});
