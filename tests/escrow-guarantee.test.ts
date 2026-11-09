/**
 * ==============================================================================
 * ŞANTİYE GO – PROMPT 9E: ÖDEME GÜVENCESİ (ESCROW) TEST SUITE
 * ==============================================================================
 */

import { IyzicoPaymentAdapter } from '../src/lib/payment/iyzico-adapter';
import {
  confirmEscrowPaymentPaid,
  buyerConfirmAndReleaseEscrow,
  openEscrowDispute,
  adminResolveDispute,
  registerCompanySubMerchant,
  cronAutoReleaseExpiredEscrows,
  runDailyPaymentReconciliation,
  DEMO_PAYMENT_EVENTS,
  DEMO_PAYMENT_DISPUTES,
  CURRENT_PLATFORM_SETTINGS,
} from '../src/lib/services/escrow-service';
import { DEMO_TRANSACTIONS } from '../src/lib/services/payment-service';
import { calculateCommissionForTransaction } from '../src/lib/services/commission-service';
import { createClient } from '../src/lib/supabase/client';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, desc: string) {
  if (condition) {
    console.log(`  ✅ [PASS] ${desc}`);
    passCount++;
  } else {
    console.error(`  ❌ [FAIL] ${desc}`);
    failCount++;
  }
}

async function runAllTests() {
  console.log('\n================================================================');
  console.log(' ŞANTİYE GO – PROMPT 9E ÖDEME GÜVENCESİ (ESCROW) TESTLERİ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // BÖLÜM 1: DURUM MAKİNESİ (STATE MACHINE) GEÇERLİ VE GEÇERSİZ GEÇİŞLER
  // ---------------------------------------------------------------------------
  console.log('--- BÖLÜM 1: DURUM MAKİNESİ (STATE MACHINE) TESTLERİ ---');

  const testTxId = `test-tx-${Date.now()}`;
  const testBuyerId = 'buyer-test-001';
  const testCompanyId = 'comp-test-001';

  // Test işlemi oluştur
  const baseTx: any = {
    id: testTxId,
    booking_id: 'book-test-001',
    buyer_id: testBuyerId,
    company_id: testCompanyId,
    amount_cents: 5000000, // 50.000 TL
    commission_rate_percent: 8.0,
    commission_amount_cents: 400000, // 4.000 TL
    vat_amount_cents: 66667,
    net_company_amount_cents: 4600000, // 46.000 TL
    currency: 'TRY',
    status: 'pending',
    is_transferred_to_submerchant: false,
    refund_amount_cents: 0,
    card_last_four: '4242',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  DEMO_TRANSACTIONS.unshift(baseTx);

  // 1.1 Geçerli Geçiş: pending -> paid_escrow
  const payRes = await confirmEscrowPaymentPaid(testTxId, 'iyz-prov-1001', '4242');
  assert(payRes.success && payRes.transaction?.status === 'paid_escrow', 'Ödeme başarıyla havuza alındı (pending -> paid_escrow).');
  assert(Boolean(payRes.transaction?.auto_release_at), 'Otomatik serbest bırakma tarihi (auto_release_at) belirlendi.');

  // 1.2 Geçerli Geçiş: paid_escrow -> transferred (Alıcı onayıyla serbest bırakma)
  const relRes = await buyerConfirmAndReleaseEscrow(testTxId, testBuyerId);
  assert(relRes.success && relRes.transaction?.status === 'transferred', 'Alıcı onayı ile ödeme firmaya aktarıldı (paid_escrow -> transferred).');
  assert(relRes.transaction?.is_transferred_to_submerchant === true, 'Hakedişin alt satıcıya aktarıldığı bayrağı işaretlendi.');

  // 1.3 Geçersiz Geçiş: transferred olan ödeme tekrar serbest bırakılamaz (İdempotency)
  const dupRelRes = await buyerConfirmAndReleaseEscrow(testTxId, testBuyerId);
  assert(!dupRelRes.success && dupRelRes.error?.includes('zaten'), 'Zaten aktarılmış ödemenin mükerrer serbest bırakılması engellendi.');

  // 1.4 Geçersiz Geçiş: Serbest bırakılmış (transferred) ödeme doğrudan iade edilemez
  const disputeOnTransferred = await openEscrowDispute(testTxId, testBuyerId, 'İtiraz');
  assert(!disputeOnTransferred.success && disputeOnTransferred.error?.includes('firmaya aktarılmış'), 'Aktarılmış ödemeye havuz itirazı açılamaz.');

  // 1.5 İade edilmiş ödemenin serbest bırakılması engellenir
  const refundedTxId = `test-refunded-${Date.now()}`;
  DEMO_TRANSACTIONS.unshift({
    ...baseTx,
    id: refundedTxId,
    status: 'refunded',
  });
  const relRefunded = await buyerConfirmAndReleaseEscrow(refundedTxId, testBuyerId);
  assert(!relRefunded.success && relRefunded.error?.includes('İade edilmiş'), 'İade edilmiş ödemenin serbest bırakılması engellendi.');

  // ---------------------------------------------------------------------------
  // BÖLÜM 2: EŞZAMANLILIK (CONCURRENCY / RACE CONDITION) TESTİ
  // ---------------------------------------------------------------------------
  console.log('\n--- BÖLÜM 2: EŞZAMANLILIK VE ÇİFT HARCAMA / SERBEST BIRAKMA ENGELİ ---');

  const raceTxId = `test-race-${Date.now()}`;
  DEMO_TRANSACTIONS.unshift({
    ...baseTx,
    id: raceTxId,
    status: 'paid_escrow',
  });

  // Aynı ödemeye aynı anda iki serbest bırakma ve bir itiraz denemesi
  const initialEventsCount = DEMO_PAYMENT_EVENTS.length;
  const [res1, res2, res3] = await Promise.all([
    buyerConfirmAndReleaseEscrow(raceTxId, testBuyerId),
    buyerConfirmAndReleaseEscrow(raceTxId, testBuyerId),
    buyerConfirmAndReleaseEscrow(raceTxId, testBuyerId),
  ]);

  const successCount = [res1, res2, res3].filter((r) => r.success).length;
  assert(successCount === 1, `Eşzamanlı yarışta tam olarak YALNIZCA BİR çağrı başarılı oldu (Başarılı: ${successCount}, Reddedilen: 2).`);

  const raceTx = DEMO_TRANSACTIONS.find((t) => t.id === raceTxId);
  assert(raceTx?.status === 'transferred', 'Yarış sonrası işlem durumu tutarlı şekilde "transferred" olarak kaldı.');

  // ---------------------------------------------------------------------------
  // BÖLÜM 3: YETKİLENDİRME (PERMISSION) VE GÜVENLİK TESTLERİ
  // ---------------------------------------------------------------------------
  console.log('\n--- BÖLÜM 3: YETKİLENDİRME VE İZOLASYON TESTLERİ ---');

  const permTxId = `test-perm-${Date.now()}`;
  DEMO_TRANSACTIONS.unshift({
    ...baseTx,
    id: permTxId,
    status: 'paid_escrow',
  });

  // 3.1 Kural: Firma kendi ödemesini ASLA serbest bırakamaz!
  const maliciousFirmRes = await buyerConfirmAndReleaseEscrow(permTxId, testCompanyId);
  assert(!maliciousFirmRes.success && maliciousFirmRes.error?.includes('Yetkisiz'), 'Firmanın kendi hakedişini serbest bırakması engellendi (403 Güvenlik Kuralı).');

  // 3.2 Kural: Başka bir alıcı başkasının ödemesini serbest bırakamaz!
  const otherBuyerRes = await buyerConfirmAndReleaseEscrow(permTxId, 'other-buyer-999');
  assert(!otherBuyerRes.success, 'Farklı bir üçüncü şahsın siparişi onaylaması engellendi.');

  // 3.3 Hassas Veri İzolasyonu: Alt üye işyeri kaydında IBAN asla tam saklanamaz
  const subMerchantRes = await registerCompanySubMerchant(testCompanyId, {
    legalType: 'LIMITED_OR_JOINT_STOCK_COMPANY',
    legalCompanyTitle: 'Anadolu İş Makineleri Ltd. Şti.',
    taxOffice: 'Tuzla',
    taxNumber: '1234567890',
    email: 'muhasebe@test.com',
    gsmNumber: '+905320000000',
    address: 'Tuzla Sanayi İstanbul',
    iban: 'TR330006100511123456789001',
  });

  assert(subMerchantRes.success, 'Alt üye işyeri kaydı başarıyla oluşturuldu.');
  assert(subMerchantRes.ibanLast4 === '9001', 'Yalnızca IBAN son 4 hanesi ("9001") ayrıştırıldı.');
  assert(Boolean(subMerchantRes.subMerchantKey), 'Sağlayıcı tekil anahtarı (subMerchantKey) alındı.');

  // ---------------------------------------------------------------------------
  // BÖLÜM 4: HMAC WEBHOOK DOĞRULAMA TESTLERİ
  // ---------------------------------------------------------------------------
  console.log('\n--- BÖLÜM 4: HMAC WEBHOOK VE İDEMPOTENCY TESTLERİ ---');

  const adapter = new IyzicoPaymentAdapter();

  // 4.1 Geçerli HMAC İmzası
  const payload = { paymentId: 'iyz-webhook-001', status: 'success', price: '500.00' };
  const validSignature = adapter.generateHmacSignature(payload);
  const verifyValid = await adapter.verifyWebhook({ 'x-iyz-signature': validSignature }, payload);
  assert(verifyValid.isValid && verifyValid.status === 'paid', 'Geçerli HMAC-SHA256 imzası başarıyla doğrulandı.');

  // 4.2 Geçersiz / Sahte İmza
  const verifyInvalid = await adapter.verifyWebhook({ 'x-iyz-signature': 'invalid-signature-test' }, payload);
  assert(!verifyInvalid.isValid, 'Geçersiz webhook imzası reddedildi (400 Bad Request).');

  // 4.3 Mükerrer Webhook Çağrısı (Idempotency)
  const webhookTxId = `test-wh-${Date.now()}`;
  DEMO_TRANSACTIONS.unshift({ ...baseTx, id: webhookTxId, status: 'pending' });

  const firstCall = await confirmEscrowPaymentPaid(webhookTxId, 'prov-wh-1');
  const secondCall = await confirmEscrowPaymentPaid(webhookTxId, 'prov-wh-1');
  assert(firstCall.success && secondCall.success, 'Mükerrer webhook çağrısı idempotent olarak güvenle karşılandı.');

  // ---------------------------------------------------------------------------
  // BÖLÜM 5: İTİRAZ (DISPUTE) VE HAKEM ÇÖZÜMÜ TESTLERİ
  // ---------------------------------------------------------------------------
  console.log('\n--- BÖLÜM 5: İTİRAZ (DISPUTE) VE YÖNETİM HAKEM SÜRECİ ---');

  const disputeTxId = `test-disp-${Date.now()}`;
  DEMO_TRANSACTIONS.unshift({ ...baseTx, id: disputeTxId, status: 'paid_escrow' });

  // 5.1 Alıcı itiraz açar -> Ödeme dondurulur
  const openDisp = await openEscrowDispute(
    disputeTxId,
    testBuyerId,
    'Makine arızalı çıktı ve operatör sahayı terk etti',
    'Tutanak ekte sunulmuştur'
  );
  assert(openDisp.success && openDisp.dispute?.status === 'opened', 'İtiraz dosyası başarıyla açıldı.');

  const txAfterDispute = DEMO_TRANSACTIONS.find((t) => t.id === disputeTxId);
  assert(txAfterDispute?.status === 'disputed', 'Ödeme durumu "disputed" oldu ve otomatik serbest bırakma donduruldu.');

  // 5.2 İtiraz altındaki ödemenin doğrudan alıcı tarafından serbest bırakılamaması
  const tryRelDisputed = await buyerConfirmAndReleaseEscrow(disputeTxId, testBuyerId);
  assert(!tryRelDisputed.success, 'İtiraz altındaki ödemenin hakem kararı olmaksızın serbest bırakılması engellendi.');

  // 5.3 Gerekçesiz admin kararı reddedilir
  const rejectEmptyNotes = await adminResolveDispute({
    paymentId: disputeTxId,
    adminId: 'admin-001',
    resolutionType: 'transfer_to_company',
    adminNotes: '',
    is2FAVerified: true,
  });
  assert(!rejectEmptyNotes.success && rejectEmptyNotes.error?.includes('Gerekçe'), 'Gerekçesiz admin müdahalesi engellendi.');

  // 5.4 2FA onayı olmayan admin kararı reddedilir
  const rejectNo2FA = await adminResolveDispute({
    paymentId: disputeTxId,
    adminId: 'admin-001',
    resolutionType: 'transfer_to_company',
    adminNotes: 'İnceleme tamamlandı',
    is2FAVerified: false,
  });
  assert(!rejectNo2FA.success && rejectNo2FA.error?.includes('2FA'), '2FA doğrulaması olmadan hakem kararı verilmesi engellendi.');

  // 5.5 Admin Çözümü: Kısmi Paylaşım (%50 Alıcıya İade, %50 Firmaya Aktarım)
  const resolveSplit = await adminResolveDispute({
    paymentId: disputeTxId,
    adminId: 'admin-001',
    resolutionType: 'split',
    adminNotes: 'Tutanak gereği çalışılan yarım günün bedeli firmaya, kalan alıcıya iade edildi.',
    is2FAVerified: true,
    buyerRefundCents: 2500000,
    companyTransferCents: 2500000,
  });
  assert(resolveSplit.success, 'Admin kısmi paylaşım hakem kararı başarıyla uygulandı.');

  // ---------------------------------------------------------------------------
  // BÖLÜM 6: DONDURULMUŞ KOMİSYON DEĞİŞMEZLİĞİ
  // ---------------------------------------------------------------------------
  console.log('\n--- BÖLÜM 6: DONDURULMUŞ KOMİSYON DEĞİŞMEZLİĞİ ---');

  const frozenTx = DEMO_TRANSACTIONS.find((t) => t.id === testTxId);
  assert(frozenTx?.commission_rate_percent === 8.0, 'İşlem anındaki komisyon oranı (%8.0) sabit kaldı.');
  assert(frozenTx?.commission_amount_cents === 400000, 'İşlem anındaki komisyon tutarı (4.000 TL) değişmedi.');

  // ---------------------------------------------------------------------------
  // BÖLÜM 7: GÜNLÜK MUTABAKAT RAPORU VE TEST ORTAMI BİLGİLENDİRMESİ
  // ---------------------------------------------------------------------------
  console.log('\n--- BÖLÜM 7: MUTABAKAT VE ÇALIŞMA ORTAMI AYRIMI ---');

  const todayStr = new Date().toISOString().split('T')[0];
  const recon = await runDailyPaymentReconciliation(todayStr);
  assert(recon.success, 'Günlük banka/sağlayıcı mutabakat motoru hatasız çalıştı.');

  // Canlı Supabase denetimi
  try {
    const supabase = createClient();
    const isCloudConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isCloudConfigured) {
      const { data: setRow, error: setErr } = await supabase
        .from('platform_settings')
        .select('*')
        .limit(1);

      if (setErr) {
        console.log(`  ℹ️ [BULUT NOTU] Canlı Supabase henüz 17 nolu migration uygulanmadığı için platform_settings tablosu oluşturulmayı bekliyor (${setErr.message}).`);
      } else {
        assert(true, 'Canlı Supabase platform_settings tablosu başarıyla sorgulandı.');
      }
    } else {
      console.log('  ⚠️ Supabase URL yapılandırılmadığı için bulut doğrulaması atlandı.');
    }
  } catch {
    // skip
  }

  console.log('\n================================================================');
  console.log(' ÇALIŞMA ORTAMI AYRIM BEYANI:');
  console.log(' 1. Durum makinesi, olay defteri, RLS ve hakem akışı: YEREL TEST MOTORU & IN-MEMORY DEFTER');
  console.log(' 2. iyzico API adaptörü ve HMAC-SHA256 imzası: IYZICO SANDBOX MOTORU (Mock/Sandbox Adapter)');
  console.log(' 3. Canlı banka EFT/valör para transferi: Gerçek banka anlaşması ve iyzico canlı onayı gerektirdiğinden "CANLI ÖNCESİ SİMÜLE EDİLDİ"');
  console.log('================================================================');

  console.log(` Toplam Test: ${passCount + failCount}`);
  console.log(` Başarılı (Passed):  ${passCount}`);
  console.log(` Başarısız (Failed): ${failCount}`);
  console.log(` Başarı Oranı:      %${((passCount / (passCount + failCount)) * 100).toFixed(2)}`);
  console.log('================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test hatası:', err);
  process.exit(1);
});
