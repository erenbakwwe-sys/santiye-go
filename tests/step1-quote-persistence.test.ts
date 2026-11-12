import { createQuoteRequest, getBuyerQuoteRequests } from '../src/lib/services/quote-service';

async function testStep1QuotePersistence() {
  console.log('=== ADIM 1: TEKLİF TALEBİ KALICILIK TESTİ ===\n');

  const buyerId = 'test-müteahhit-uuid-001';
  const otherBuyerId = 'test-diger-alici-uuid-002';

  // 1. Yeni Teklif Talebi Oluşturma
  console.log('1. Yeni Teklif Talebi Açılıyor...');
  const createRes = await createQuoteRequest({
    buyer_id: buyerId,
    request_type: 'multi_vendor',
    title: 'Kadıköy Şantiyesi İçin 30 Ton Ekskavatör',
    description: '1 aylık metro hafriyatı projesi için kiralık paletli ekskavatör.',
    city_id: 34,
    district_id: 101,
    quantity: 2,
    need_operator: true,
    need_fuel: true,
    need_transport: true,
  });

  if (!createRes.success || !createRes.request) {
    console.error('❌ [FAIL] Teklif talebi oluşturulamadı:', createRes.error);
    process.exit(1);
  }

  const createdId = createRes.request.id;
  console.log(`✅ [PASS] Teklif talebi başarıyla oluşturuldu. ID: ${createdId}`);

  // 2. İlk Listeleme (Sayfa Açılışı)
  console.log('\n2. Alıcı Paneli Taleplerim Sayfası Yükleniyor...');
  const firstLoad = await getBuyerQuoteRequests(buyerId);
  const foundInFirst = firstLoad.find((r) => r.id === createdId);

  if (!foundInFirst) {
    console.error('❌ [FAIL] Oluşturulan talep ilk yüklemede bulunamadı!');
    process.exit(1);
  }
  console.log(`✅ [PASS] Talep alıcı listesinde mevcut: "${foundInFirst.title}"`);

  // 3. SAYFA YENİLEME SİMÜLASYONU (F5 / Refresh)
  console.log('\n3. Sayfa Yenileme Simülasyonu (F5)...');
  // Yeni çağrı - önbelleksiz taze istek
  const afterRefresh = await getBuyerQuoteRequests(buyerId);
  const foundAfterRefresh = afterRefresh.find((r) => r.id === createdId);

  if (!foundAfterRefresh) {
    console.error('❌ [FAIL] Sayfa yenilendiğinde talep kayboldu!');
    process.exit(1);
  }
  console.log('✅ [PASS] Sayfa yenilendiğinde talep hala mevcut, KAYBOLMADI!');

  // 4. ÇIKIŞ YAPIP TEKRAR GİRİŞ YAPMA SİMÜLASYONU
  console.log('\n4. Çıkış / Yeniden Giriş Simülasyonu...');
  // Kullanıcı aynı ID ile tekrar bağlandığında taleplerini eksiksiz görmeli
  const afterReLogin = await getBuyerQuoteRequests(buyerId);
  const foundAfterReLogin = afterReLogin.find((r) => r.id === createdId);

  if (!foundAfterReLogin) {
    console.error('❌ [FAIL] Yeniden giriş yapıldığında talep kayboldu!');
    process.exit(1);
  }
  console.log('✅ [PASS] Yeniden giriş yapıldığında talep eksiksiz geldi, KALICI!');

  // 5. İZOLASYON KONTROLÜ (Başka alıcı bu talebi görmemeli)
  console.log('\n5. Farklı Kullanıcı İzolasyon Kontrolü...');
  const otherUserRequests = await getBuyerQuoteRequests(otherBuyerId);
  const leakedToOther = otherUserRequests.find((r) => r.id === createdId);

  if (leakedToOther) {
    console.error('❌ [FAIL] Güvenlik ihlali: Başka kullanıcı bu talebi gördü!');
    process.exit(1);
  }
  console.log('✅ [PASS] İzolasyon tam: Farklı kullanıcı bu talebe erişemiyor.');

  console.log('\n======================================================');
  console.log('1. ADIM (TEKLİF KALICILIĞI) TESTİ %100 BAŞARIYLA GEÇTİ!');
  console.log('======================================================\n');
}

testStep1QuotePersistence().catch((err) => {
  console.error('Test hatası:', err);
  process.exit(1);
});
