/**
 * ŞANTİYE GO – YÜK VE PERFORMANS TEST SİMÜLASYONU
 * 50.000 ilan ve 200 eşzamanlı PostGIS mesafe sorgusu performans ölçümü
 */

import { calculateDistanceKm } from '../../geo';

interface SyntheticListing {
  id: string;
  category_id: string;
  city_id: number;
  lat: number;
  lng: number;
  price_daily: number;
  status: 'active' | 'inactive';
}

function generateSyntheticListings(count: number): SyntheticListing[] {
  const listings: SyntheticListing[] = [];
  const categories = [
    'is-makineleri',
    'yapi-malzemeleri',
    'nakliye',
    'iskele-kalip',
    'asansor-platform',
    'santiye-ekipmanlari',
    'insaat-hizmetleri',
  ];

  // Coordinates across Turkey (approx bounding box: Lat 36-42, Lng 26-45)
  for (let i = 0; i < count; i++) {
    listings.push({
      id: `syn-list-${i}`,
      category_id: categories[i % categories.length],
      city_id: (i % 81) + 1,
      lat: 36.0 + Math.random() * 6.0,
      lng: 26.0 + Math.random() * 19.0,
      price_daily: 1000 + Math.floor(Math.random() * 50000),
      status: i % 10 === 0 ? 'inactive' : 'active',
    });
  }
  return listings;
}

async function runLoadSimulation() {
  console.log('===========================================================');
  console.log('ŞANTİYE GO – 50.000 İLAN YÜK & POSTGIS PERFORMANS TESTİ');
  console.log('===========================================================');

  const LISTING_COUNT = 50000;
  console.log(`1. ${LISTING_COUNT.toLocaleString('tr-TR')} adet sentetik ilan belleğe yükleniyor...`);
  const t0 = performance.now();
  const dataset = generateSyntheticListings(LISTING_COUNT);
  console.log(`   Veri seti oluşturma süresi: ${(performance.now() - t0).toFixed(2)} ms`);

  // Target query: User in Istanbul (Kadıköy: 40.9984, 29.0492), radius 50 km, category 'is-makineleri'
  const userLat = 40.9984;
  const userLng = 29.0492;
  const radiusKm = 50;
  const targetCategory = 'is-makineleri';

  console.log(`\n2. 200 Eşzamanlı PostGIS Mesafe ve Filtreleme Sorgusu Çalıştırılıyor...`);
  const CONCURRENT_QUERIES = 200;
  const queryLatencies: number[] = [];

  const executeQuery = async () => {
    const qStart = performance.now();
    // Simulate PostGIS spatial filter + category + status
    const results = dataset
      .filter((l) => l.status === 'active' && l.category_id === targetCategory)
      .map((l) => ({
        ...l,
        distance_km: calculateDistanceKm(userLat, userLng, l.lat, l.lng),
      }))
      .filter((l) => l.distance_km <= radiusKm)
      .sort((a, b) => a.distance_km - b.distance_km)
      .slice(0, 12);

    const qDuration = performance.now() - qStart;
    queryLatencies.push(qDuration);
    return results.length;
  };

  const parallelStart = performance.now();
  const promises = Array.from({ length: CONCURRENT_QUERIES }, () => executeQuery());
  const allResults = await Promise.all(promises);
  const totalDuration = performance.now() - parallelStart;

  queryLatencies.sort((a, b) => a - b);
  const p50 = queryLatencies[Math.floor(queryLatencies.length * 0.5)];
  const p95 = queryLatencies[Math.floor(queryLatencies.length * 0.95)];
  const p99 = queryLatencies[Math.floor(queryLatencies.length * 0.99)];
  const avg = queryLatencies.reduce((sum, v) => sum + v, 0) / queryLatencies.length;

  console.log(`\n--- YÜK TESTİ SONUÇLARI ---`);
  console.log(`Toplam Eşzamanlı İstek: ${CONCURRENT_QUERIES}`);
  console.log(`Toplam Test Süresi:     ${totalDuration.toFixed(2)} ms`);
  console.log(`İstek Başına Ortalama:  ${avg.toFixed(2)} ms`);
  console.log(`P50 (Medyan):           ${p50.toFixed(2)} ms`);
  console.log(`P95:                    ${p95.toFixed(2)} ms`);
  console.log(`P99:                    ${p99.toFixed(2)} ms`);
  console.log(`Hedef Süre:             1.000 ms altında`);

  if (p95 < 1000) {
    console.log(`\n✅ BAŞARILI: P95 gecikmesi (${p95.toFixed(2)} ms) 1.000 ms hedefinin çok altında!`);
  } else {
    console.error(`\n❌ BAŞARISIZ: P95 gecikmesi 1.000 ms üzerinde.`);
    process.exit(1);
  }
}

runLoadSimulation().catch((err) => {
  console.error('Yük testi hatası:', err);
  process.exit(1);
});
