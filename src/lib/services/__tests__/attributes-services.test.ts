import { getCategoryAttributes, addCategoryAttribute, formatTechnicalSpecLabel } from '../attribute-service';
import { searchListings } from '../listing-service';
import { CATEGORIES } from '@/lib/mock-data';

async function runTests() {
  console.log('--- ŞANTİYE GO - PROMPT 6 UNIT TESTS ---');
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

  // 1. Category Count and Structure
  console.log('\n[TEST GROUP 1: CATEGORIES & ATTRIBUTE SCHEMAS]');
  assert(CATEGORIES.length === 7, 'Platform contains all 7 main categories');
  
  const iskeleCat = CATEGORIES.find((c) => c.slug === 'iskele-kalip');
  assert(!!iskeleCat, 'İskele & Kalıp Sistemleri category exists');
  assert(
    iskeleCat?.allowed_listing_types?.includes('rental') &&
    iskeleCat?.allowed_listing_types?.includes('sale') &&
    iskeleCat?.allowed_listing_types?.includes('service'),
    'İskele category supports rental, sale, and service'
  );

  const serviceCat = CATEGORIES.find((c) => c.slug === 'insaat-hizmetleri');
  assert(!!serviceCat, 'İnşaat Hizmetleri category exists');
  assert(
    serviceCat?.allowed_listing_types?.length === 1 &&
    serviceCat?.allowed_listing_types?.includes('service'),
    'İnşaat Hizmetleri ONLY supports service (kiralama/satış yok)'
  );

  // 2. Dynamic Attribute Retrieval
  const iskeleAttrs = await getCategoryAttributes('iskele-kalip');
  assert(iskeleAttrs.length >= 5, `İskele has at least 5 dynamic attributes (found ${iskeleAttrs.length})`);
  
  const heightAttr = iskeleAttrs.find((a) => a.slug === 'max_working_height_m');
  assert(!!heightAttr && heightAttr.unit === 'm', 'Working height attribute found with unit "m"');

  const asnAttrs = await getCategoryAttributes('asansor-platform');
  assert(asnAttrs.length >= 5, `Asansör & Platform has dynamic attributes (found ${asnAttrs.length})`);
  const capacityAttr = asnAttrs.find((a) => a.slug === 'lifting_capacity_kg');
  assert(!!capacityAttr && capacityAttr.unit === 'kg', 'Lifting capacity attribute found with unit "kg"');

  // 3. Technical Spec Label Formatter
  console.log('\n[TEST GROUP 2: FORMATTING & INTEGRITY]');
  const label1 = formatTechnicalSpecLabel('scaffold_system_type');
  assert(label1 === 'İskele / Kalıp Sistemi Tipi', `Formatted label correctly: ${label1}`);

  const label2 = formatTechnicalSpecLabel('construction_service_branch');
  assert(label2 === 'Hizmet Uzmanlık Dalı', `Formatted service branch label: ${label2}`);

  // 4. Add Dynamic Attribute dynamically (Admin capability)
  const newAttr = await addCategoryAttribute({
    category_id: 'cat-iskele-kalip',
    name: 'Boru Et Kalınlığı',
    slug: 'pipe_thickness_mm',
    attribute_type: 'number',
    unit: 'mm',
    is_required: false,
    is_filterable: true,
    show_in_comparison: true,
    order_index: 99,
  });
  assert(newAttr.slug === 'pipe_thickness_mm', 'Admin dynamically added a new attribute');
  const updatedAttrs = await getCategoryAttributes('iskele-kalip');
  assert(updatedAttrs.some((a) => a.slug === 'pipe_thickness_mm'), 'New attribute resolved in getCategoryAttributes');

  // 5. Search Engine & Service Area Radius Matching
  console.log('\n[TEST GROUP 3: SEARCH & SERVICE AREA DISTANCE MATCHING]');
  
  // Search for service listing located in Istanbul (Kadıköy) from Kocaeli / Gebze (~45 km away)
  // Gebze approx lat: 40.8027, lng: 29.4307
  const serviceSearch = await searchListings({
    category: 'insaat-hizmetleri',
    lat: 40.8027,
    lng: 29.4307,
    radius: 25, // Searcher only asked for 25 km
    limit: 10,
  });
  // Service listing has service_radius_km: 150 km, so even though 45 km > 25 km search radius,
  // the company's service coverage covers Gebze!
  const foundService = serviceSearch.listings.some((l) => l.listing_type === 'service');
  assert(foundService, 'Service provider with 150 km radius matched user 45 km away');

  // 6. Dynamic Filter Query Matching
  const filteredSearch = await searchListings({
    category: 'iskele-kalip',
    dynamic_filters: {
      has_tse_standard: true,
    },
    limit: 10,
  });
  assert(
    filteredSearch.listings.length > 0 &&
    filteredSearch.listings.every((l) => (l.technical_specs as any)?.has_tse_standard === true),
    'Dynamic filter on JSONB technical_specs (has_tse_standard === true) executed accurately'
  );

  // Summary
  console.log(`\n========================================`);
  console.log(`PROMPT 6 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log(`========================================`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
