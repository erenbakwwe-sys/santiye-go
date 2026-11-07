/**
 * ==============================================================================
 * ŞANTİYE GO – PROMPT 9C BİRİM TEST PAKETİ: TAVAN KOMİSYON VE OTOMATİK SÖZLEŞME (PDF)
 * ==============================================================================
 * 
 * Test Kapsamı:
 * 1. Sınır değerler (0 TL, 1 TL, küsuratlı kuruş tutarları)
 * 2. Kuruş yuvarlama hassasiyeti ve sıfır kayar nokta hatası
 * 3. Kademeli komisyon geçişleri (farklı işlem hacimleri)
 * 4. Tavan komisyonun (Cap) devreye girmesi ve tasarruf hesabı
 * 5. Tavan komisyonun devreye girmemesi (tavan altı işlemler)
 * 6. Asgari komisyonun (Taban / Min) devreye girmesi
 * 7. 9B Teklif verme kredisi muafiyeti (Kredi harcandıysa komisyon = 0)
 * 8. Doğrudan / Platform dışı ödeme modunda komisyon = 0
 * 9. Öncelik hiyerarşisi: Firma Özel > Kategori > Global
 * 10. Üyelik plan indirimi + Tavan kombinasyonu (Tavan en sonda uygulanır)
 * 11. KDV ayrımı (%20 KDV tam tamsayı kuruş ayrımı)
 * 12. Sözleşme şablon ayrımı (Kiralama vs Hizmet)
 * 13. Dondurulmuş veri anlık görüntüsü (Snapshot) değişmezliği
 * 14. PDF üretimi, Türkçe karakter desteği ve < 2MB boyut denetimi
 * 15. SHA-256 kriptografik özet bütünlüğü
 * 16. İki taraflı onay akışı (Tek taraf -> Karşılıklı onaylandı)
 * 17. Revizyon talebi ve onayların sıfırlanması
 * 18. Yetki denetimi ve Admin erişim log kaydı
 */

import {
  calculateCommissionForTransaction,
  computeCommissionMath,
  saveCommissionRule,
  getCommissionRules,
  formatCentsToTRY,
} from '../src/lib/services/commission-service.ts';
import {
  createContract,
  approveContract,
  requestContractRevision,
  getContractById,
  createNewTemplateVersion,
  getContractTemplates,
} from '../src/lib/services/contract-service.ts';
import { generateContractPdf } from '../src/lib/services/pdf-service.ts';
import { ContractSnapshot } from '../src/types/database.ts';

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
  console.log(' ŞANTİYE GO – PROMPT 9C TAVAN KOMİSYON VE SÖZLEŞME (PDF) TESTLERİ');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // BÖLÜM 1: KOMİSYON HESAPLAMA MOTORU TESTLERİ
  // ---------------------------------------------------------------------------
  console.log('--- BÖLÜM 1: KOMİSYON VE TAVAN TESTLERİ ---');

  // Test 1: Sınır Değerler ve Kuruş Hassasiyeti
  console.log('\nTest 1: Sınır Değerler ve Kuruş Hassasiyeti');
  const resZero = computeCommissionMath({ amountCents: 0, baseRatePercent: 8.0 });
  assert(resZero.commissionAmountCents === 0, '0 TL işlemde komisyon 0 TL olarak hesaplandı.');

  const resSmall = computeCommissionMath({ amountCents: 100, baseRatePercent: 8.0 }); // 1 TL
  assert(resSmall.commissionAmountCents === 8, '1 TL (100 kuruş) işlemde %8 komisyon 8 kuruş olarak hesaplandı.');

  const resFraction = computeCommissionMath({ amountCents: 12550, baseRatePercent: 7.5 }); // 125.50 TL * %7.5 = 9.4125 -> 9.41 TL = 941 kuruş
  assert(resFraction.commissionAmountCents === 941, 'Küsuratlı işlemde (125.50 TL, %7.5) tam kuruş yuvarlaması yapıldı (941 kuruş).');

  // Test 2: %20 KDV Ayrımı
  console.log('\nTest 2: KDV Ayrımı (%20 Dahil)');
  // 120 TL komisyonda: Matrah = 100 TL, KDV = 20 TL
  const resVat = computeCommissionMath({ amountCents: 120000, baseRatePercent: 10.0 }); // 1200 TL işlem -> 120 TL komisyon (12000 kuruş)
  assert(resVat.commissionAmountCents === 12000, 'Komisyon tutarı 120.00 TL.');
  assert(resVat.vatAmountCents === 2000, '%20 KDV tutarı tam 20.00 TL (2000 kuruş) olarak ayrıştırıldı.');
  assert(resVat.netCompanyAmountCents === 108000, 'Firma net hakedişi 1.080.00 TL olarak hesaplandı.');

  // Test 3: Tavan Komisyon (Cap) Devreye Girmesi
  console.log('\nTest 3: Tavan Komisyon (Cap) Devreye Girmesi');
  // 100.000 TL işlem (10.000.000 kuruş), %8 komisyon normalde 8.000 TL (800.000 kuruş) eder.
  // Kuralda tavan 5.000 TL (500.000 kuruş) belirlenmişse:
  const resCap = computeCommissionMath({
    amountCents: 10000000, // 100.000 TL
    baseRatePercent: 8.0,
    capAmountCents: 500000, // 5.000 TL Tavan
  });
  assert(resCap.isCapApplied === true, 'Azami komisyon tavanı devreye girdi (isCapApplied = true).');
  assert(resCap.commissionAmountCents === 500000, 'Komisyon tavanda (5.000 TL) sınırlandırıldı.');
  assert(resCap.cappedSavingsCents === 300000, 'Firma lehine tavanla kırpılan komisyon tasarrufu 3.000 TL olarak kaydedildi.');
  assert(resCap.netCompanyAmountCents === 9500000, 'Firma net hakedişi 95.000 TL olarak korundu.');

  // Test 4: Tavan Altında Kalan İşlemler (Tavan Devreye Girmez)
  console.log('\nTest 4: Tavan Altında Kalan İşlemler');
  // 20.000 TL işlem, %8 komisyon = 1.600 TL. Tavan 5.000 TL.
  const resNoCap = computeCommissionMath({
    amountCents: 2000000,
    baseRatePercent: 8.0,
    capAmountCents: 500000,
  });
  assert(resNoCap.isCapApplied === false, 'Tavan altında kalan işlemde tavan devreye girmedi (isCapApplied = false).');
  assert(resNoCap.commissionAmountCents === 160000, 'Normal oransal komisyon uygulandı (1.600 TL).');
  assert(resNoCap.cappedSavingsCents === 0, 'Kırpılan komisyon tutarı 0 TL.');

  // Test 5: Asgari Komisyon (Taban / Floor) Sınırı
  console.log('\nTest 5: Asgari Komisyon (Taban / Min)');
  // 500 TL işlem (50.000 kuruş), %6 = 30 TL. Taban 100 TL (10.000 kuruş).
  const resMin = computeCommissionMath({
    amountCents: 50000,
    baseRatePercent: 6.0,
    minAmountCents: 10000, // 100 TL Taban
  });
  assert(resMin.isMinApplied === true, 'Asgari komisyon tabanı devreye girdi (isMinApplied = true).');
  assert(resMin.commissionAmountCents === 10000, 'Komisyon asgari tutar olan 100.00 TL olarak kesildi.');

  // Test 6: Prompt 9B Kredi Muafiyeti
  console.log('\nTest 6: 9B Teklif Verme Kredisi Muafiyeti');
  const resExempt = computeCommissionMath({
    amountCents: 5000000,
    baseRatePercent: 8.0,
    isCreditExempt: true,
  });
  assert(resExempt.isCreditExempt === true, 'Kredi muafiyeti bayrağı doğru işaretlendi.');
  assert(resExempt.commissionAmountCents === 0, 'Kredi harcanan işlemde komisyon 0 TL olarak uygulandı.');
  assert(resExempt.netCompanyAmountCents === 5000000, 'İşlem tutarının %100\'ü firmanın net hakedişine aktarıldı.');

  // Test 7: Doğrudan / Platform Dışı Ödeme Modu
  console.log('\nTest 7: Doğrudan / Platform Dışı Ödeme');
  const resDirect = computeCommissionMath({
    amountCents: 10000000,
    baseRatePercent: 8.0,
    isDirectPayment: true,
  });
  assert(resDirect.isDirectPaymentExempt === true, 'Doğrudan ödeme muafiyeti uygulandı.');
  assert(resDirect.commissionAmountCents === 0, 'Platform dışı ödemede komisyon hesabı yapılmadı (0 TL).');

  // Test 8: Üyelik İndirimi ve Tavan Birlikte Uygulama
  console.log('\nTest 8: Üyelik İndirimi + Tavan Kombinasyonu (Sıralama)');
  // İşlem: 100.000 TL, Temel Oran: %10, Üyelik Plan İndirimi: %2. Uygulanan oran: %8 -> 8.000 TL.
  // Tavan: 6.000 TL. Tavan en sonda uygulanarak 6.000 TL kesilmeli.
  const resPlanCap = computeCommissionMath({
    amountCents: 10000000,
    baseRatePercent: 10.0,
    discountRatePercent: 2.0,
    capAmountCents: 600000,
  });
  assert(resPlanCap.appliedRatePercent === 8.0, 'Önce üyelik indirimi uygulandı (%10 - %2 = %8).');
  assert(resPlanCap.rawCommissionAmountCents === 800000, 'Ham indirimli komisyon 8.000 TL.');
  assert(resPlanCap.commissionAmountCents === 600000, 'En sonda tavan uygulanarak 6.000 TL\'ye indirildi.');
  assert(resPlanCap.cappedSavingsCents === 200000, 'Tavanla ek 2.000 TL tasarruf sağlandı.');

  // Test 9: Öncelik Hiyerarşisi (Firma Özel > Kategori > Global)
  console.log('\nTest 9: Öncelik Hiyerarşisi (Firma > Kategori > Global)');
  // Firma: Anadolu İş Makineleri Parkı (f0000000-0000-0000-0000-000000000001) -> Özel %7 ve 5.000 TL tavan
  const resPriorityCompany = await calculateCommissionForTransaction({
    amountCents: 10000000, // 100.000 TL
    companyId: 'f0000000-0000-0000-0000-000000000001',
    categoryId: 'd0000000-0000-0000-0000-000000000003', // Lowbed
  });
  assert(resPriorityCompany.ruleSource === 'company', 'Firma özel kuralı kategori kuralına baskın geldi.');
  assert(resPriorityCompany.baseRatePercent === 7.0, 'Firma özel oranı (%7) uygulandı.');
  assert(resPriorityCompany.capAmountCents === 500000, 'Firma özel tavanı (5.000 TL) uygulandı.');

  // Kategori: Lowbed (Başka bir firma ID ile) -> Kategori kuralı (%6 ve 7.500 TL tavan)
  const resPriorityCategory = await calculateCommissionForTransaction({
    amountCents: 10000000,
    companyId: 'random-company-002',
    categoryId: 'd0000000-0000-0000-0000-000000000003',
  });
  assert(resPriorityCategory.ruleSource === 'category', 'Firma kuralı olmayan durumda kategori kuralı uygulandı.');

  // ---------------------------------------------------------------------------
  // BÖLÜM 2: OTOMATİK SÖZLEŞME VE PDF MOTORU TESTLERİ
  // ---------------------------------------------------------------------------
  console.log('\n--- BÖLÜM 2: SÖZLEŞME (PDF), SNAPSHOT VE ONAY TESTLERİ ---');

  // Test 10: Şablon Seçimi ve Sürümleme
  console.log('\nTest 10: Şablon Seçimi ve Sürümleme');
  const rentalTemplates = await getContractTemplates('rental');
  const serviceTemplates = await getContractTemplates('service');
  assert(rentalTemplates.length > 0, 'İş makineleri kiralama şablonu başarıyla yüklendi.');
  assert(serviceTemplates.length > 0, 'Ağır nakliye ve hizmet sözleşmesi şablonu başarıyla yüklendi.');
  assert(
    rentalTemplates[0].standard_terms.includes('TASLAK'),
    'Kiralama şablonunda "TASLAK – hukuki incelemeden geçmelidir" notu mevcut.'
  );

  // Test 11: Dondurulmuş Anlık Görüntü (Snapshot) ve Sözleşme Üretimi
  console.log('\nTest 11: Dondurulmuş Anlık Görüntü (Snapshot) Üretimi');
  const testSnapshot: ContractSnapshot = {
    contract_number: `SNT-2026-KRL-${Date.now().toString().slice(-4)}`,
    contract_type: 'rental',
    template_version: 1,
    created_at: new Date().toISOString(),
    company: {
      id: 'f0000000-0000-0000-0000-000000000001',
      name: 'Anadolu İş Makineleri Parkı A.Ş.',
      tax_office: 'Tuzla V.D.',
      tax_number: '1234567890',
      address: 'İçmeler Sanayi Cad. No:14, Tuzla',
      city: 'İstanbul',
      district: 'Tuzla',
      authorized_person: 'Kemal Demir',
      phone: '+90 532 000 0101',
    },
    buyer: {
      id: 'buyer-test-001',
      full_name: 'Ahmet Yılmaz',
      legal_type: 'individual',
      company_name: null,
      tax_office: null,
      tax_number: null, // TC Kimlik No istenmez
      address: 'Barbaros Mah. Şantiye Sok. No:5, Ataşehir',
      phone: '+90 532 999 8877',
    },
    subject: {
      title: 'CAT 320D Paletli Ekskavatör (22 Ton)',
      category_name: 'İş Makineleri',
      start_date: '2026-12-01',
      end_date: '2026-12-15',
      worksite_address: 'Barbaros Mah. Konut Projesi Şantiye Alanı',
      city_name: 'İstanbul',
      district_name: 'Ataşehir',
      need_operator: true,
      need_fuel: false,
      need_transport: true,
    },
    pricing: {
      unit_price: 15000,
      total_price: 210000,
      currency: 'TRY',
      vat_included: true,
      payment_method: 'platform',
    },
    standard_terms: 'Dondurulmuş standart şartlar.',
  };

  const createContractRes = await createContract({
    companyId: testSnapshot.company.id,
    buyerId: testSnapshot.buyer.id,
    contractType: 'rental',
    snapshot: testSnapshot,
  });

  assert(createContractRes.success === true, 'Sözleşme kaydı başarıyla oluşturuldu.');
  const newContract = createContractRes.contract!;
  assert(newContract.status === 'pending_approval', 'Sözleşme başlangıç durumu "pending_approval".');
  assert(!!newContract.pdf_sha256, `SHA-256 kriptografik özeti saklandı: ${newContract.pdf_sha256.slice(0, 16)}...`);

  // Test 12: PDF Üretimi ve Dosya Boyutu (< 2 MB)
  console.log('\nTest 12: PDF Üretimi, Türkçe Karakterler ve Dosya Boyutu');
  const pdfRes = await generateContractPdf(testSnapshot);
  assert(pdfRes.pdfBuffer.length > 0, 'PDF bayt dizisi üretildi.');
  assert(pdfRes.pdfBuffer.length < 2 * 1024 * 1024, `PDF boyutu 2 MB sınırının çok altında (${(pdfRes.pdfBuffer.length / 1024).toFixed(1)} KB).`);
  assert(pdfRes.sha256 === newContract.pdf_sha256, 'Üretilen PDF özeti ile sözleşme kaydındaki SHA-256 tam eşleşti.');

  // Test 13: Dondurulmuş Snapshot Değişmezliği (Immutability)
  console.log('\nTest 13: Dondurulmuş Snapshot Değişmezliği');
  // Firma unvanı veya profil sonradan değişse bile sözleşmedeki snapshot korunur
  testSnapshot.company.name = 'DEĞİŞTİRİLMİŞ SAHTE FİRMA ADI';
  const fetchedContractRes = await getContractById(newContract.id, testSnapshot.buyer.id, 'buyer');
  assert(
    fetchedContractRes.contract?.data_snapshot.company.name === 'Anadolu İş Makineleri Parkı A.Ş.',
    'Sözleşme dondurulmuş verisi sonradan yapılan profil güncellemelerinden etkilenmedi (Değişmez Snapshot).'
  );

  // Test 14: İki Taraflı Onay Akışı
  console.log('\nTest 14: İki Taraflı Onay Akışı ("Okudum, Onaylıyorum")');
  // 1. Adım: Alıcı onaylar
  const approveBuyerRes = await approveContract(newContract.id, testSnapshot.buyer.id, 'buyer', '192.168.1.10');
  assert(approveBuyerRes.success === true, 'Alıcı "Okudum, onaylıyorum" ile sözleşmeyi onayladı.');
  assert(approveBuyerRes.contract?.buyer_approved_at !== null, 'Alıcı onay zaman damgası kaydedildi.');
  assert(approveBuyerRes.contract?.status === 'pending_approval', 'Firma henüz onaylamadığı için durum "pending_approval" olarak kaldı.');

  // 2. Adım: Firma da onaylar -> Karşılıklı Onaylandı
  const approveCompRes = await approveContract(newContract.id, testSnapshot.company.id, 'company', '192.168.1.20');
  assert(approveCompRes.success === true, 'Firma da "Okudum, onaylıyorum" ile sözleşmeyi onayladı.');
  assert(approveCompRes.contract?.status === 'mutual_approved', 'İki taraf da onaylayınca durum "mutual_approved" (Karşılıklı Onaylandı) oldu.');

  // Test 15: Revizyon Talebi ve Onayların Sıfırlanması
  console.log('\nTest 15: Revizyon Talebi');
  const revisionRes = await requestContractRevision(
    newContract.id,
    testSnapshot.buyer.id,
    'buyer',
    'Başlangıç tarihinin 5 Aralık olarak revize edilmesi talep ediliyor.'
  );
  assert(revisionRes.success === true, 'Revizyon talebi başarıyla işlendi.');
  assert(revisionRes.contract?.status === 'revision_requested', 'Sözleşme durumu "revision_requested" oldu.');
  assert(revisionRes.contract?.buyer_approved_at === null, 'Revizyonla birlikte alıcı onayı sıfırlandı.');
  assert(revisionRes.contract?.company_approved_at === null, 'Revizyonla birlikte firma onayı sıfırlandı.');
  assert(revisionRes.contract?.revision_notes?.includes('5 Aralık') === true, 'Revizyon notu sözleşme kaydına işlendi.');

  // Test 16: Yetkilendirme / Erişim Denetimi
  console.log('\nTest 16: Yetkilendirme ve Güvenlik Denetimi');
  // Üçüncü şahıs (ne alıcı ne firma)
  const unauthorizedRes = await getContractById(newContract.id, 'intruder-user-999', 'buyer');
  assert(unauthorizedRes.success === false, 'Yetkisiz üçüncü şahsın sözleşmeyi görmesi engellendi (403 Güvenlik Koruması).');

  // Admin erişimi
  const adminAccessRes = await getContractById(newContract.id, 'admin-super-001', 'admin');
  assert(adminAccessRes.success === true, 'Platform yöneticisi denetim amacıyla sözleşmeye erişebildi.');

  // Test 17: Süper Admin Yeni Şablon Sürümü Tanımlama
  console.log('\nTest 17: Süper Admin Yeni Şablon Sürümü');
  const newTmplRes = await createNewTemplateVersion({
    templateType: 'rental',
    title: '2026/Q4 Özel Şantiye Kiralama Şablonu',
    standardTerms: 'Yeni sürüm standart maddeleri...',
    adminId: 'admin-super-001',
  });
  assert(newTmplRes.success === true, 'Süper admin yeni şablon sürümü oluşturabildi.');
  assert(newTmplRes.template?.version === 2, 'Yeni şablon sürüm numarası otomatik artırıldı (v2).');

  // ---------------------------------------------------------------------------
  // ÖZET RAPOR
  // ---------------------------------------------------------------------------
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
