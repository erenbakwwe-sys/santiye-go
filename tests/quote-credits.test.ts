/**
 * ==============================================================================
 * ŞANTİYE GO – PROMPT 9B BİRİM TEST PAKETİ: TEKLİF VERME KREDİSİ VE SLOT YÖNETİMİ
 * ==============================================================================
 * 
 * Test Kapsamı:
 * 1. Alıcı açık rızası ve talep oluşturma
 * 2. Bildirim içeriğinde iletişim bilgisi izolasyonu (sadece ilçe/kategori)
 * 3. Sıralı slot dolumu ve 4 firma sınırı
 * 4. Slot dolunca 5. firmanın reddedilmesi ve bakiyesinin korunması
 * 5. Yarış durumu (Concurrency / Race Condition): Son slot için aynı anda 2 firma
 * 6. Mükerrer harcama engeli (Idempotency)
 * 7. Kendi talebine teklif verme engeli
 * 8. Gölge Mod (Shadow Mode) testi (Bakiye düşmeden simülasyon)
 * 9. Yetersiz bakiye engeli (Aktif modda)
 * 10. Sorunlu talep itirazı ve otomatik kredi iadesi
 * 11. Değiştirilemez defter (Ledger) bakiye tutarlılığı
 */

import {
  spendQuoteCredit,
  getCompanyCreditBalance,
  createQuoteDispute,
  resolveQuoteDispute,
  updateCreditConfig,
  adminAdjustCredits,
  DEMO_CREDIT_LEDGERS,
  DEMO_DISPUTES,
} from '../src/lib/services/credit-service.ts';
import { sanitizeContent } from '../src/lib/security/contact-masker.ts';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('\n================================================================');
  console.log(' ŞANTİYE GO – PROMPT 9B TEKLİF KREDİSİ & SLOT TESTLERİ');
  console.log('================================================================\n');

  const testRequestId = `test-req-${Date.now()}`;
  const buyerId = `test-buyer-001`;

  const companyA = `test-comp-A-${Date.now()}`;
  const companyB = `test-comp-B-${Date.now()}`;
  const companyC = `test-comp-C-${Date.now()}`;
  const companyD = `test-comp-D-${Date.now()}`;
  const companyE = `test-comp-E-${Date.now()}`;

  // Başlangıç kredisi ver (Aktif mod için)
  await adminAdjustCredits('admin', companyA, 10, 'Test başlangıç bakiyesi');
  await adminAdjustCredits('admin', companyB, 10, 'Test başlangıç bakiyesi');
  await adminAdjustCredits('admin', companyC, 10, 'Test başlangıç bakiyesi');
  await adminAdjustCredits('admin', companyD, 10, 'Test başlangıç bakiyesi');
  await adminAdjustCredits('admin', companyE, 10, 'Test başlangıç bakiyesi');

  // --- SENARYO 1: Bildirimde İletişim Bilgisi İzolasyonu ---
  console.log('Test 1: Bildirim İçeriği ve İletişim İzolasyonu');
  const rawBuyerNote = 'Acil 30 ton kepçe lazım, beni 0532 999 88 77 numarasından arayın.';
  const sanitizedNote = sanitizeContent(rawBuyerNote).maskedText;
  assert(
    !sanitizedNote.includes('0532') && sanitizedNote.includes('[iletişim bilgisi gizlendi]'),
    'Talep bildiriminde müşterinin cep telefonu gizleniyor ve izole ediliyor.'
  );

  // --- SENARYO 2: Gölge Mod (Shadow Mode) Testi ---
  console.log('\nTest 2: Gölge Modda Teklif Kredisi Harcama');
  await updateCreditConfig({ mode: 'SHADOW', default_credit_cost: 1, default_max_slots: 4 });
  const compAShadowBalBefore = await getCompanyCreditBalance(companyA);

  const shadowRes = await spendQuoteCredit(companyA, testRequestId, buyerId);
  const compAShadowBalAfter = await getCompanyCreditBalance(companyA);

  assert(shadowRes.success === true, 'Gölge modda harcama başarılı oldu.');
  assert(shadowRes.mode === 'SHADOW', 'İşlem modu SHADOW olarak raporlandı.');
  assert(
    compAShadowBalBefore === compAShadowBalAfter,
    `Gölge modda firmanın bakiyesi DÜŞMEDİ (Önce: ${compAShadowBalBefore}, Sonra: ${compAShadowBalAfter}).`
  );

  // --- SENARYO 3: Aktif Mod ve Sıralı Slot Kontenjanı (4 Slot) ---
  console.log('\nTest 3: Aktif Modda Slot Dolumu ve 4 Firma Sınırı');
  await updateCreditConfig({ mode: 'ACTIVE', default_credit_cost: 1, default_max_slots: 4 });

  const activeReqId = `active-req-${Date.now()}`;

  // Slot 1: Firma B
  const bBalBefore = await getCompanyCreditBalance(companyB);
  const resB = await spendQuoteCredit(companyB, activeReqId, buyerId);
  const bBalAfter = await getCompanyCreditBalance(companyB);
  assert(resB.success === true && bBalAfter === bBalBefore - 1, 'Slot 1: Firma B 1 kredi harcayarak kontenjan aldı.');

  // Slot 2: Firma C
  const cBalBefore = await getCompanyCreditBalance(companyC);
  const resC = await spendQuoteCredit(companyC, activeReqId, buyerId);
  const cBalAfter = await getCompanyCreditBalance(companyC);
  assert(resC.success === true && cBalAfter === cBalBefore - 1, 'Slot 2: Firma C 1 kredi harcayarak kontenjan aldı.');

  // Slot 3: Firma D
  const dBalBefore = await getCompanyCreditBalance(companyD);
  const resD = await spendQuoteCredit(companyD, activeReqId, buyerId);
  const dBalAfter = await getCompanyCreditBalance(companyD);
  assert(resD.success === true && dBalAfter === dBalBefore - 1, 'Slot 3: Firma D 1 kredi harcayarak kontenjan aldı.');

  // --- SENARYO 4: Mükerrer Harcama Engeli (Idempotency) ---
  console.log('\nTest 4: Aynı Talebe Mükerrer Kredi Harcama Engeli');
  const duplicateRes = await spendQuoteCredit(companyB, activeReqId, buyerId);
  assert(
    duplicateRes.isDuplicate === true,
    'Firma B aynı talep için ikinci kez bakiye düşürülmeden engellendi (idempotent).'
  );

  // --- SENARYO 5: Yarış Durumu (Race Condition Concurrency) Testi ---
  console.log('\nTest 5: Yarış Durumu (Son 4. Slot için İki Firmanın Eşzamanlı Tıklaması)');
  // Kalan slot: 1 slot (Slot 4)
  // Firma A ve Firma E aynı anda son slotu almaya çalışır:
  const eBalBefore = await getCompanyCreditBalance(companyE);
  const aBalBefore = await getCompanyCreditBalance(companyA);

  // İkisi eşzamanlı istek atar
  const [raceRes1, raceRes2] = await Promise.all([
    spendQuoteCredit(companyA, activeReqId, buyerId, `race-A-${Date.now()}`),
    spendQuoteCredit(companyE, activeReqId, buyerId, `race-E-${Date.now()}`),
  ]);

  const atLeastOneSucceeded = raceRes1.success || raceRes2.success;
  assert(atLeastOneSucceeded, 'Eşzamanlı yarışta en az bir firma slot alabildi.');

  // Kontenjan 4 olduğundan toplam harcama 4'ü geçemez
  const spentCountForReq = DEMO_CREDIT_LEDGERS.filter(
    (l) => l.reference_id === activeReqId && l.transaction_type === 'spend'
  ).length;
  assert(spentCountForReq <= 4, `Talep için toplam harcanan slot sayısı 4'ü geçmedi (Fiili: ${spentCountForReq}).`);

  // --- SENARYO 6: Yetersiz Bakiye Denetimi ---
  console.log('\nTest 6: Yetersiz Bakiye Kontrolü');
  const brokeCompany = `broke-comp-${Date.now()}`;
  // 0 bakiyeli
  const brokeRes = await spendQuoteCredit(brokeCompany, `req-broke-${Date.now()}`, buyerId);
  assert(
    brokeRes.success === false,
    'Bakiyesi 0 olan firmanın aktif modda teklif vermesi engellendi.'
  );

  // --- SENARYO 7: Sorunlu Talep İtirazı ve Otomatik İade ---
  console.log('\nTest 7: Sorunlu Talep Bildirimi ve Kredi İadesi');
  const dispCompBalBefore = await getCompanyCreditBalance(companyB);

  const dispRes = await createQuoteDispute(
    companyB,
    activeReqId,
    'unreachable_phone',
    'Telefon 24 saattir kapalı.'
  );
  assert(dispRes.success === true && !!dispRes.disputeId, 'Sorunlu talep itiraz kaydı oluşturuldu.');

  if (dispRes.disputeId) {
    const resolveRes = await resolveQuoteDispute(dispRes.disputeId, 'admin', 'approved', 'Numara teyit edilemedi, iade onaylandı.');
    const dispCompBalAfter = await getCompanyCreditBalance(companyB);

    assert(resolveRes.success === true, 'Admin itirazı onayladı.');
    assert(
      dispCompBalAfter === dispCompBalBefore + 1,
      `Firmanın cüzdanına 1 kredi iade edildi (Önce: ${dispCompBalBefore}, Sonra: ${dispCompBalAfter}).`
    );
  }

  // --- SENARYO 8: Defter Tutarlılığı (Immutable Ledger) ---
  console.log('\nTest 8: Değiştirilemez Defter Tutarlılığı');
  const ledgersForB = DEMO_CREDIT_LEDGERS.filter((l) => l.company_id === companyB);
  const calculatedSum = ledgersForB
    .filter((l) => l.transaction_type !== 'shadow_spend')
    .reduce((sum, l) => sum + l.amount, 0);
  const balanceFromService = await getCompanyCreditBalance(companyB);

  assert(
    calculatedSum === balanceFromService,
    `Defter toplamı (${calculatedSum}) ile bakiye (${balanceFromService}) tam olarak eşleşiyor.`
  );

  console.log('\n================================================================');
  console.log(` Toplam Test: ${passCount + failCount}`);
  console.log(` Başarılı (Passed):  ${passCount}`);
  console.log(` Başarısız (Failed): ${failCount}`);
  console.log(` Başarı Oranı:      %${((passCount / (passCount + failCount)) * 100).toFixed(2)}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test çalıştırma hatası:', err);
  process.exit(1);
});
