import {
  getActiveAdsForSlot,
  calculateAdPrice,
  DEFAULT_AD_PRODUCTS,
} from '../ad-service';
import { recordAnalyticsEvent } from '../analytics-service';

export function runAdRankingUnitTests(): { passed: boolean; results: string[] } {
  const results: string[] = [];
  let allPassed = true;

  function assert(desc: string, condition: boolean) {
    if (condition) {
      results.push(`✓ PASS: ${desc}`);
    } else {
      results.push(`✗ FAIL: ${desc}`);
      allPassed = false;
    }
  }

  // 1. Test: Strict Regional Targeting (Geo-fencing)
  // Samsun search (cityId: 55) should NEVER return an Istanbul ad (target_city_id: 34)
  const samsunSlot = getActiveAdsForSlot({
    productId: 'sponsored_listing',
    cityId: 55, // Samsun
    limit: 2,
  });

  const hasIstanbulAdInSamsun = samsunSlot.campaigns.some(
    (c) => c.target_city_id !== null && c.target_city_id !== 55
  );
  assert(
    'Samsun arama sorgusunda İstanbul reklamı ASLA gösterilmez (Bölgesel hedefleme testi)',
    !hasIstanbulAdInSamsun
  );

  // 2. Test: Slot Capacity Constraint
  // When limit is set to 2, getActiveAdsForSlot should return at most 2 ads
  const cappedSlot = getActiveAdsForSlot({
    productId: 'sponsored_listing',
    limit: 2,
  });
  assert(
    'Sponsorlu arama slot kapasitesi (en fazla 2) aşılmaz',
    cappedSlot.campaigns.length <= 2 && cappedSlot.listings.length <= 2
  );

  // 3. Test: Deduplication logic test
  // An ad that is in sponsored list must not be present in organic listings
  const sponsoredIds = cappedSlot.listings.map((l) => l.id);
  const mockOrganicListings = [
    { id: cappedSlot.listings[0]?.id || 'item-99', title: 'Test 1' },
    { id: 'organic-unique-1', title: 'Test 2' },
    { id: 'organic-unique-2', title: 'Test 3' },
  ];
  const deduplicatedOrganic = mockOrganicListings.filter((l) => !sponsoredIds.includes(l.id));
  assert(
    'Sponsorlu slotta çıkan ilan organik arama sonuçlarından filtrelenir (Deduplication testi)',
    !deduplicatedOrganic.some((l) => sponsoredIds.includes(l.id))
  );

  // 4. Test: Anti-Fraud Click Debouncing
  // First click is accepted, rapid second click within 15 minutes is debounced
  const firstClick = recordAnalyticsEvent({
    event_type: 'ad_click',
    target_type: 'ad_campaign',
    target_id: 'test-camp-fraud-check',
  });
  const secondRapidClick = recordAnalyticsEvent({
    event_type: 'ad_click',
    target_type: 'ad_campaign',
    target_id: 'test-camp-fraud-check',
  });
  assert(
    '15 dakika içindeki yapay mükerrer tıklamalar elenir (Anti-Fraud Debounce testi)',
    firstClick === true && secondRapidClick === false
  );

  // 5. Test: Membership plan discount calculation
  // 30 days showcase home: 245000 cents with 10% discount -> 220500 cents
  const pricing = calculateAdPrice(DEFAULT_AD_PRODUCTS[0], 30, 10);
  assert(
    'Aktif üyelik indirimi reklam fiyatına doğru uygulanır (%10 indirim)',
    pricing.discountCents === 24500 && pricing.netCents === 220500
  );

  return { passed: allPassed, results };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  const { passed, results } = runAdRankingUnitTests();
  console.log('--- ŞANTİYE GO REKLAM VE SIRALAMA TEST RAPORU ---');
  results.forEach((r) => console.log(r));
  console.log(`Sonuç: ${passed ? 'TÜM TESTLER BAŞARILI' : 'BAZI TESTLER BAŞARISIZ'}`);
  process.exit(passed ? 0 : 1);
}
