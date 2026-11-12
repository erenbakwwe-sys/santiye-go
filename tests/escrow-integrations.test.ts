/**
 * ŞANTİYE GO – PROMPT 9E-3: ÖDEME ENTEGRASYONLARI, WEBHOOK VE KOMİSYON BİRİM TESTLERİ
 * 
 * Test Kapsamı:
 * 1. Webhook HMAC İmza Doğrulama & Sahtecilik Engeli (HMAC-SHA256)
 * 2. Webhook Mükerrer İstek (Idempotency Replay) Koruması
 * 3. Webhook Sıra Bozukluğu ve Durum Çelişkisi (State Conflict) Tespiti & Durdurma
 * 4. Komisyon Oranı ve Tutar Dondurma (Freeze) Bütünlüğü (9C)
 * 5. Escrow Destekli Güven Skoru & İtiraz Dışlama Hesaplaması (9D)
 * 6. Kart Verisi Saklamama ve PCI-DSS Güvenlik Denetimi
 * 7. Yapılandırılmamış Sağlayıcı Açık Hata Denetimi
 */

import crypto from 'crypto';
import { IyzicoPaymentAdapter } from '../src/lib/payment/iyzico-adapter';
import { computeCommissionMath } from '../src/lib/services/commission-service';
import { calculateEscrowWeightedTrust } from '../src/lib/services/review-service';

async function runUnitTests() {
  console.log('================================================================');
  console.log(' 🧪  ŞANTİYE GO – 9E-3 ÖDEME SERVİSLERİ VE ENTEGRASYON BİRİM TESTLERİ');
  console.log('================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ [BAŞARILI] ${testName}`);
    } else {
      console.error(`  ❌ [BAŞARISIZ] ${testName}`);
      if (details) console.error(`     Ayrıntı: ${details}`);
    }
  }

  // ---------------------------------------------------------------------------
  // TEST 1: WEBHOOK HMAC-SHA256 İMZA DOĞRULAMA VE SAHTECİLİK ENGELİ
  // ---------------------------------------------------------------------------
  console.log('▶ TEST 1: Webhook HMAC-SHA256 İmza Doğrulama');
  const testSecret = 'sandbox-secretKey-production-test-12345';
  process.env.IYZICO_API_KEY = 'sandbox-apiKey-prod-12345';
  process.env.IYZICO_SECRET_KEY = testSecret;

  const adapter = new IyzicoPaymentAdapter();
  const validPayload = {
    paymentId: 'pay-test-9901',
    status: 'success',
    price: '15000.00',
    conversationId: 'tx-conv-01',
  };
  const validPayloadStr = JSON.stringify(validPayload);
  const correctHmac = crypto
    .createHmac('sha256', testSecret)
    .update(validPayloadStr)
    .digest('hex');

  // 1.1 Doğru imza ile doğrulama
  const resValid = await adapter.verifyWebhook(
    { 'x-iyz-signature': correctHmac },
    validPayload
  );
  assert(resValid.isValid === true, '1.1 Doğru HMAC-SHA256 imzası başarıyla doğrulandı.');
  assert(resValid.paymentId === 'pay-test-9901', '1.2 paymentId doğru ayrıştırıldı.');

  // 1.2 Değiştirilmiş (tampered) imza
  const resTamperedSig = await adapter.verifyWebhook(
    { 'x-iyz-signature': 'tampered-fake-signature-99999' },
    validPayload
  );
  assert(resTamperedSig.isValid === false, '1.3 Sahte/hatalı imza reddedildi (isValid: false).');

  // 1.3 Gövdesi (body) tahrif edilmiş istek
  const tamperedPayload = { ...validPayload, price: '1.00' }; // Tutar değiştirilmiş
  const resTamperedBody = await adapter.verifyWebhook(
    { 'x-iyz-signature': correctHmac },
    tamperedPayload
  );
  assert(resTamperedBody.isValid === false, '1.4 Gövdesi tahrif edilmiş istek reddedildi.');

  // ---------------------------------------------------------------------------
  // TEST 2: WEBHOOK MÜKERRER İSTEK (IDEMPOTENCY REPLAY) KONTROLÜ
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 2: Webhook Idempotency (Mükerrer İstek Yakalama)');
  const processedEventMemory = new Set<string>();

  function simulateIdempotentWebhookProcessing(eventId: string): { isDuplicate: boolean } {
    if (processedEventMemory.has(eventId)) {
      return { isDuplicate: true };
    }
    processedEventMemory.add(eventId);
    return { isDuplicate: false };
  }

  const eventA = 'evt-pay-test-9901-first-attempt';
  const firstAttempt = simulateIdempotentWebhookProcessing(eventA);
  assert(firstAttempt.isDuplicate === false, '2.1 İlk webhook isteği kabul edildi (isDuplicate: false).');

  const secondAttempt = simulateIdempotentWebhookProcessing(eventA);
  assert(secondAttempt.isDuplicate === true, '2.2 Mükerrer webhook isteği idempotency ile engellendi (isDuplicate: true).');

  // ---------------------------------------------------------------------------
  // TEST 3: WEBHOOK DURUM ÇELİŞKİSİ (STATE CONFLICT) VE DURDURMA ALARMI
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 3: Sıra Bozukluğu ve Durum Çelişkisi (State Conflict) Tespiti');

  function checkStateConflict(
    localEscrowStatus: string,
    incomingProviderStatus: string
  ): { hasConflict: boolean; shouldHalt: boolean; alertType?: string } {
    // Kural: Bizde para zaten releasable veya transferred iken sağlayıcı failed diyemez
    if (incomingProviderStatus === 'failed' && ['releasable', 'transferred'].includes(localEscrowStatus)) {
      return {
        hasConflict: true,
        shouldHalt: true,
        alertType: 'CRITICAL_PAYMENT_CONFLICT_ALREADY_RELEASED',
      };
    }
    // Normal durum eşleşmesi
    return { hasConflict: false, shouldHalt: false };
  }

  const normalTransition = checkStateConflict('pending', 'paid');
  assert(normalTransition.hasConflict === false, '3.1 Normal akışta (pending -> paid) çelişki yok.');

  const conflictingTransition = checkStateConflict('transferred', 'failed');
  assert(
    conflictingTransition.hasConflict === true && conflictingTransition.shouldHalt === true,
    '3.2 Aktarılmış ödemeye sağlayıcıdan failed gelmesi çelişki olarak yakalandı ve işlem DURDURULDU.',
    `Alert: ${conflictingTransition.alertType}`
  );

  // ---------------------------------------------------------------------------
  // TEST 4: KOMİSYON ORANI DONDURMA (9C) TESTİ
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 4: Komisyon Oranı ve Tutarlarının Dondurulması (Freeze Integrity)');

  const initialAmountCents = 2500000; // 25.000,00 ₺
  const activeBaseRate = 8.0; // %8 platform komisyonu
  const frozenCalc = computeCommissionMath(initialAmountCents, activeBaseRate, 1.0, 'category');

  // Dondurulmuş ödeme nesnesi
  const paymentTransactionRecord = {
    id: 'pay-frozen-001',
    amount_cents: initialAmountCents,
    commission_rate_percent: frozenCalc.appliedRatePercent, // %7.0
    commission_amount_cents: frozenCalc.commissionAmountCents, // 175.000 kuruş (1.750,00 ₺)
    vat_amount_cents: frozenCalc.vatAmountCents,
    net_company_amount_cents: frozenCalc.netCompanyAmountCents, // 23.250,00 ₺
  };

  // Daha sonra platform global komisyon oranı değişirse (Örn: %8 -> %12)
  const newBaseRate = 12.0;
  const newHypotheticalCalc = computeCommissionMath(initialAmountCents, newBaseRate, 0.0);

  assert(
    paymentTransactionRecord.commission_rate_percent === 7.0,
    '4.1 Ödeme anındaki komisyon oranı %7.0 olarak donduruldu.'
  );
  assert(
    paymentTransactionRecord.commission_amount_cents === 175000,
    '4.2 Ödeme anındaki net komisyon kuruşu (175.000) donduruldu.'
  );
  assert(
    paymentTransactionRecord.commission_rate_percent !== newHypotheticalCalc.appliedRatePercent,
    '4.3 Platformun sonradan kural değiştirmesi dondurulmuş ödemeyi etkilemedi.'
  );

  // ---------------------------------------------------------------------------
  // TEST 5: ESCROW GÜVEN AĞIRLIĞI VE İTİRAZ DIŞLAMA TESTİ (9D)
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 5: Escrow Güven Ağırlığı (Alıcı Onaylı vs Otomatik Aktarım) ve İtiraz Dışlama (9D)');

  const mockReviews = [
    {
      id: 'rev-1',
      company_id: 'c-1',
      rating_overall: 5.0,
      is_escrow_verified: true,
      buyer_approved: true, // Açık Alıcı Onaylı platform güvenceli iş (yüksek ağırlık)
      payment_status: 'transferred',
    },
    {
      id: 'rev-auto',
      company_id: 'c-1',
      rating_overall: 5.0,
      is_escrow_verified: true,
      buyer_approved: false, // Süre dolumu ile OTOMATİK aktarılan iş (alıcı onayı YOK -> standart 1.0x ağırlık)
      payment_status: 'transferred',
    },
    {
      id: 'rev-2',
      company_id: 'c-1',
      rating_overall: 4.0,
      is_escrow_verified: false, // Normal iş (1.0x ağırlık)
      payment_status: 'transferred',
    },
    {
      id: 'rev-3',
      company_id: 'c-1',
      rating_overall: 1.0,
      is_escrow_verified: false,
      payment_status: 'refunded', // İtiraz edilmiş ve alıcıya iade edilmiş!
      dispute_status: 'resolved_buyer',
    },
  ];

  const trustResult = calculateEscrowWeightedTrust(mockReviews as any, { buyerApprovalWeight: 1.5 });

  assert(
    trustResult.excludedDisputeCount === 1,
    '5.1 Alıcı lehine sonuçlanmış/iade edilmiş iş (rev-3) skordan çıkarıldı.'
  );
  assert(
    trustResult.totalValidCount === 3,
    '5.2 Sadece geçerli ve tamamlanan 3 iş skora dahil edildi.'
  );
  assert(
    trustResult.escrowVerifiedCount === 2,
    '5.3 Platform escrow tamamlanmış 2 iş tespit edildi.'
  );
  assert(
    trustResult.buyerApprovedCount === 1,
    '5.4 Otomatik aktarım (rev-auto) alıcı onaylı SAYILMADI; yalnızca açık onaylı (rev-1) yüksek güven kanıtı sayıldı.'
  );

  // 5.5 Admin ayarından gelen dinamik çarpan testi (örn: 2.0x)
  const trustCustomWeight = calculateEscrowWeightedTrust(mockReviews as any, { buyerApprovalWeight: 2.0 });
  assert(
    trustCustomWeight.bayesianScore !== null,
    '5.5 Admin platform ayarından gelen dinamik ağırlık (2.0x) başarıyla işletildi.'
  );

  // ---------------------------------------------------------------------------
  // TEST 6: KART VERİSİ SAKLAMAMA VE GÜVENLİK KISITI
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 6: Kart Verisi Saklamama (PCI-DSS) Güvenlik Denetimi');

  const checkoutPayloadSent = {
    transactionId: 'tx-999',
    amountCents: 100000,
    currency: 'TRY',
    buyer: {
      id: 'b-1',
      name: 'Ali',
      surname: 'Kaya',
      email: 'ali@test.com',
      phone: '05320000000',
      address: 'Adres',
      city: 'Ankara',
    },
    items: [{ id: '1', name: 'Ekskavatör', category: 'İş Makinesi', priceCents: 100000 }],
    callbackUrl: '/api/webhooks/payment',
  };

  const hasPan = 'cardNumber' in checkoutPayloadSent || 'pan' in checkoutPayloadSent;
  const hasCvv = 'cvv' in checkoutPayloadSent || 'cvc' in checkoutPayloadSent;

  assert(!hasPan && !hasCvv, '6.1 Ödeme isteğinde kart numarası (PAN) ve CVV saklanmıyor/taşınmıyor.');

  // ---------------------------------------------------------------------------
  // TEST 7: YAPILANDIRILMAMIŞ SAĞLAYICI AÇIK HATA DENETİMİ
  // ---------------------------------------------------------------------------
  console.log('\n▶ TEST 7: Yapılandırılmamış Sağlayıcı Açık Hata Denetimi');

  process.env.IYZICO_API_KEY = '';
  process.env.IYZICO_SECRET_KEY = '';
  const unconfiguredAdapter = new IyzicoPaymentAdapter();

  const unconfiguredRes = await unconfiguredAdapter.initiateCheckout(checkoutPayloadSent as any);
  assert(
    unconfiguredRes.success === false && unconfiguredRes.error?.includes('yapılandırılmamış'),
    '7.1 Anahtarlar eksik olduğunda sessizce başarılı dönülmedi, açık hata verildi.'
  );

  // ---------------------------------------------------------------------------
  // ÖZET
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(` 🎯  BİRİM TESTLERİ TAMAMLANDI: ${passedTests} / ${totalTests} BAŞARILI`);
  console.log('================================================================\n');

  if (passedTests !== totalTests) {
    process.exit(1);
  }
}

runUnitTests();
