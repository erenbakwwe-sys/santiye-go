import { checkRateLimit, sanitizeRedirectUrl } from '../../security/rate-limiter';
import { getOrganizationSchema, getBreadcrumbSchema, getListingProductSchema } from '../../seo/jsonld';
import { toCleanSlug, findCityBySlug, findCategoryBySlug } from '../../seo/slug';
import { processPaymentSuccess } from '../payment-service';
import { recordAnalyticsEvent } from '../analytics-service';
import { runScheduledTasks } from '../cron-service';
import { Listing } from '@/types/database';

async function runPrompt7Tests() {
  console.log('--- ŞANTİYE GO – PROMPT 7 GÜVENLİK & SEO TESTLERİ ---');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // 1. Rate Limiting Tests
  console.log('\n[TEST GROUP 1: RATE LIMITING & GÜVENLİK]');
  const testKey = `test_ip_${Date.now()}`;
  for (let i = 0; i < 5; i++) {
    checkRateLimit(testKey, 5, 10000);
  }
  const blockedCheck = checkRateLimit(testKey, 5, 10000);
  assert(!blockedCheck.allowed, 'Rate limiter 5 deneme sonrasında isteği engeller (Brute-force koruması)');

  // 2. Open Redirect Sanitization
  const safe1 = sanitizeRedirectUrl('/firma-paneli');
  assert(safe1 === '/firma-paneli', 'Dahili geçerli rota güvenli geçirilir');

  const unsafe1 = sanitizeRedirectUrl('https://evil-phishing.com');
  assert(unsafe1 === '/', 'Harici phishing domaini ana sayfaya yönlendirilir (Open redirect engeli)');

  const unsafe2 = sanitizeRedirectUrl('//evil.com');
  assert(unsafe2 === '/', 'Protokol-relative //evil.com ana sayfaya yönlendirilir');

  // 3. Slug & Programmatic SEO
  console.log('\n[TEST GROUP 2: SEO SLUG & TÜRKÇE KARAKTER DÖNÜŞÜMÜ]');
  const cleanSlug = toCleanSlug('İskele & Kalıp Sistemleri (Şantiye - İstanbul)');
  assert(cleanSlug === 'iskele-kalip-sistemleri-santiye-istanbul', `Slug doğru temizlendi: ${cleanSlug}`);

  const cityLookup = findCityBySlug('samsun');
  assert(cityLookup?.name === 'Samsun', 'Samsun ili slug üzerinden başarıyla bulundu');

  const catLookup = findCategoryBySlug('insaat-hizmetleri');
  assert(catLookup?.name === 'İnşaat Hizmetleri', 'İnşaat Hizmetleri kategorisi slug üzerinden bulundu');

  // 4. JSON-LD Schema (No fake reviews guarantee)
  console.log('\n[TEST GROUP 3: SCHEMA.ORG JSON-LD BÜTÜNLÜĞÜ]');
  const orgSchema = getOrganizationSchema();
  assert(orgSchema['@type'] === 'Organization' && orgSchema.name === 'Şantiye GO', 'Organization schema geçerli');

  const mockListing: Listing = {
    id: 'test-1',
    company_id: 'comp-1',
    category_id: 'cat-1',
    title: 'Test Ekskavatör',
    slug: 'test-ekskavator',
    description: 'Açıklama',
    listing_type: 'rental',
    price_daily: 12000,
    price_weekly: null,
    price_monthly: null,
    price_sale: null,
    currency: 'TRY',
    is_operator_included: true,
    is_fuel_included: false,
    is_transport_included: true,
    status: 'active',
    city_id: 34,
    district_id: 101,
    address_detail: 'Kadıköy',
    lat: 41.0,
    lng: 29.0,
    technical_specs: {},
    images: ['https://example.com/test.jpg'],
    is_demo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const productSchema = getListingProductSchema(mockListing);
  assert(productSchema.offers?.price === 12000, 'Ürün fiyatı gerçek teklif verisinden çekildi');
  assert(!productSchema.aggregateRating, 'Yorum olmayan ilanda SAHTE AggregateRating ŞEMASI OLUŞTURULMAZ');

  // 5. Idempotent Payment Webhook
  console.log('\n[TEST GROUP 4: ÖDEME WEBHOOK İDEMPOTENCY]');
  // Calling processPaymentSuccess on existing transaction should succeed idempotently without double processing
  const res1 = await processPaymentSuccess('pay-0000-0000-0001');
  const res2 = await processPaymentSuccess('pay-0000-0000-0001');
  assert(res1.success && res2.success, 'Mükerrer webhook çağrısı idempotent olarak güvenle yanıtlandı');

  // 6. Cron Engine
  console.log('\n[TEST GROUP 5: ZAMANLANMIŞ İŞLER (CRON)]');
  const cronRes = await runScheduledTasks();
  assert(cronRes.success, 'Zamanlanmış görevler motoru hatasız çalıştı');

  console.log(`\n========================================`);
  console.log(`PROMPT 7 TEST SONUCU: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runPrompt7Tests().catch((err) => {
  console.error('Test hatası:', err);
  process.exit(1);
});
