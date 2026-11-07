/**
 * ŞANTİYE GO – İLETİŞİM KORUMA & MASKELEME TEST SUITE (105 ÖRNEK)
 * Gerçek telefon/iletişim kalıpları, atlatma denemeleri ve yanlış alarm testleri.
 */

import { sanitizeContent } from '../src/lib/security/contact-masker.ts';
import type { MaskResult } from '../src/lib/security/contact-masker.ts';

export interface TestCase {
  id: number;
  category: 'phone_real' | 'phone_bypass' | 'email' | 'url' | 'keyword' | 'iban' | 'false_positive_safe';
  input: string;
  expectedMasked: boolean;
  description: string;
}

export const TEST_CASES: TestCase[] = [
  // --- GRUP 1: GERÇEK TELEFON NUMARALARI (1-20) ---
  { id: 1, category: 'phone_real', input: 'Numaram 05321234567 arayabilirsiniz.', expectedMasked: true, description: 'Bitişik 05xx 11 hane' },
  { id: 2, category: 'phone_real', input: 'İletişim için: 0532 123 45 67', expectedMasked: true, description: 'Standart boşluklu 05xx' },
  { id: 3, category: 'phone_real', input: 'Telefonum: +90 532 123 45 67 hemen görüşelim.', expectedMasked: true, description: '+90 formatı' },
  { id: 4, category: 'phone_real', input: '+905321234567 arayın lütfen.', expectedMasked: true, description: '+90 bitişik' },
  { id: 5, category: 'phone_real', input: 'Sabit/Cep: 0090 542 987 65 43', expectedMasked: true, description: '0090 formatı' },
  { id: 6, category: 'phone_real', input: 'Telefon (0542) 123 45 67', expectedMasked: true, description: 'Parantezli alan kodu' },
  { id: 7, category: 'phone_real', input: '0555-123-45-67 arayın', expectedMasked: true, description: 'Tireli cep numarası' },
  { id: 8, category: 'phone_real', input: '0533.123.45.67', expectedMasked: true, description: 'Noktalı cep numarası' },
  { id: 9, category: 'phone_real', input: 'Bana 532 123 45 67 den ulaşın', expectedMasked: true, description: '0 sız 5xx boşluklu' },
  { id: 10, category: 'phone_real', input: 'Hemen 5441234567 arayınız.', expectedMasked: true, description: '0 sız bitişik 10 hane' },
  { id: 11, category: 'phone_real', input: '0530 000 00 00', expectedMasked: true, description: '0530 serisi' },
  { id: 12, category: 'phone_real', input: 'Şantiye şefi tel: 0541 222 33 44', expectedMasked: true, description: 'Metin içinde 0541' },
  { id: 13, category: 'phone_real', input: 'Usta cebi +90 (535) 999 88 77', expectedMasked: true, description: '+90 parantezli' },
  { id: 14, category: 'phone_real', input: '0538 456 7890 ararsanız sevinirim', expectedMasked: true, description: 'Farklı bloklamalı numara' },
  { id: 15, category: 'phone_real', input: 'Tel: 0549 111 2233', expectedMasked: true, description: '0549 serisi' },
  { id: 16, category: 'phone_real', input: '+90 505 123 4567', expectedMasked: true, description: '0505 serisi' },
  { id: 17, category: 'phone_real', input: '0536 765 43 21 numarasından ulaşabilirsiniz.', expectedMasked: true, description: 'Cümle ortasında telefon' },
  { id: 18, category: 'phone_real', input: '0537-888-99-00', expectedMasked: true, description: 'Tireli 0537' },
  { id: 19, category: 'phone_real', input: 'Ara beni: 539 012 34 56', expectedMasked: true, description: 'Başında sıfır olmayan 539' },
  { id: 20, category: 'phone_real', input: '+905511234567', expectedMasked: true, description: 'Bitişik uluslararası format' },

  // --- GRUP 2: NUMARA ATLATMA DENEMELERİ (21-40) ---
  { id: 21, category: 'phone_bypass', input: '0 5 3 2 1 2 3 4 5 6 7', expectedMasked: true, description: 'Her rakam arası boşluklu' },
  { id: 22, category: 'phone_bypass', input: '0.5.3.2.1.2.3.4.5.6.7', expectedMasked: true, description: 'Her rakam arası noktalı' },
  { id: 23, category: 'phone_bypass', input: '0-5-3-2-1-2-3-4-5-6-7', expectedMasked: true, description: 'Her rakam arası tireli' },
  { id: 24, category: 'phone_bypass', input: 'O532 123 45 67 (sıfır yerine O harfi)', expectedMasked: true, description: '0 yerine büyük O harfi' },
  { id: 25, category: 'phone_bypass', input: 'o532 123 45 67 arayın', expectedMasked: true, description: '0 yerine küçük o harfi' },
  { id: 26, category: 'phone_bypass', input: 'sıfır beş yüz otuz iki yüz yirmi üç kırk beş altmış yedi', expectedMasked: true, description: 'Türkçe yazı ile numara' },
  { id: 27, category: 'phone_bypass', input: 'sıfır 5 3 2 1 2 3 4 5 6 7', expectedMasked: true, description: 'Yazı ve rakam karışık' },
  { id: 28, category: 'phone_bypass', input: 'Numaram: 0532  123   45    67', expectedMasked: true, description: 'Düzensiz çoklu boşluklar' },
  { id: 29, category: 'phone_bypass', input: '0 532 123 45 67', expectedMasked: true, description: '0 sonrası boşluk' },
  { id: 30, category: 'phone_bypass', input: '5 3 2 1 2 3 4 5 6 7 arayın', expectedMasked: true, description: '5 ile başlayan aralıklı yazım' },

  // --- GRUP 3: E-POSTA VE ATLATMA DENEMELERİ (31-45) ---
  { id: 31, category: 'email', input: 'Mail adresim ahmet@gmail.com dur.', expectedMasked: true, description: 'Standart Gmail adresi' },
  { id: 32, category: 'email', input: 'Teklifi info@santiyehafriyat.com.tr adresine atın.', expectedMasked: true, description: 'Kurumsal com.tr e-posta' },
  { id: 33, category: 'email', input: 'İletişim: mehmet.demir_34@hotmail.com', expectedMasked: true, description: 'Noktalı ve alt çizgili e-posta' },
  { id: 34, category: 'email', input: 'ahmet [at] gmail [dot] com yazın', expectedMasked: true, description: '[at] [dot] gizleme denemesi' },
  { id: 35, category: 'email', input: 'iletisim(at)firma.com', expectedMasked: true, description: '(at) gizleme denemesi' },
  { id: 36, category: 'email', input: 'bana ali @ yandex.com dan ulaşın', expectedMasked: true, description: 'Boşluklu @ işareti' },
  { id: 37, category: 'email', input: 'muhasebe@santiye.org', expectedMasked: true, description: 'org uzantılı mail' },
  { id: 38, category: 'email', input: 'ali.veli@outlook.com', expectedMasked: true, description: 'Outlook mail' },
  { id: 39, category: 'email', input: 'pazarlama@nakliye.net', expectedMasked: true, description: 'net uzantılı mail' },
  { id: 40, category: 'email', input: 'patron@icloud.com bekliyorum', expectedMasked: true, description: 'iCloud mail' },

  // --- GRUP 4: WEB BAĞLANTILARI VE ALAN ADLARI (41-55) ---
  { id: 41, category: 'url', input: 'Makinelerimizi https://www.hafriyatparki.com adresinden inceleyin.', expectedMasked: true, description: 'https://www tam link' },
  { id: 42, category: 'url', input: 'Sitemiz www.demirmakine.com.tr ziyaret ediniz.', expectedMasked: true, description: 'www ile başlayan com.tr' },
  { id: 43, category: 'url', input: 'Katalog için santiyemakine.com a bakın.', expectedMasked: true, description: 'Protokolsüz alan adı' },
  { id: 44, category: 'url', input: 'http://makinekiralama.net', expectedMasked: true, description: 'http link' },
  { id: 45, category: 'url', input: 'Detaylar bit.ly/santiye-teklif linkinde.', expectedMasked: true, description: 'Kısaltılmış link' },
  { id: 46, category: 'url', input: 'araclarimiz.xyz adresine gelin', expectedMasked: true, description: 'xyz uzantılı alan adı' },
  { id: 47, category: 'url', input: 'www.betonpompasi.org', expectedMasked: true, description: 'org uzantılı www' },
  { id: 48, category: 'url', input: 'https://t.me/santiyeci', expectedMasked: true, description: 'Telegram linki' },

  // --- GRUP 5: HARİCİ İLETİŞİM YÖNLENDİRMELERİ (49-65) ---
  { id: 49, category: 'keyword', input: 'Detayları whatsapp üzerinden konuşalım.', expectedMasked: true, description: 'whatsapp kelimesi' },
  { id: 50, category: 'keyword', input: 'Bana wp den yazın fiyat vereyim.', expectedMasked: true, description: 'wp kısaltması' },
  { id: 51, category: 'keyword', input: 'Watsap tan konum atar mısınız?', expectedMasked: true, description: 'watsap yazılışı' },
  { id: 52, category: 'keyword', input: 'İnstagram hesabımızdan makineleri görebilirsiniz.', expectedMasked: true, description: 'instagram kelimesi' },
  { id: 53, category: 'keyword', input: 'Insta adresimize yazın', expectedMasked: true, description: 'insta kısaltması' },
  { id: 54, category: 'keyword', input: 'Telegram üzerinden mesaj atın', expectedMasked: true, description: 'telegram kelimesi' },
  { id: 55, category: 'keyword', input: 'Buradan komisyon kesiyor, özelden yazın anlaşalım.', expectedMasked: true, description: 'özelden yazın yönlendirmesi' },
  { id: 56, category: 'keyword', input: 'Beni özelden ara fiyatta güzellik yaparım.', expectedMasked: true, description: 'özelden ara yönlendirmesi' },
  { id: 57, category: 'keyword', input: 'Elden anlaşalım komisyon ödemeyelim.', expectedMasked: true, description: 'elden anlaşalım yönlendirmesi' },
  { id: 58, category: 'keyword', input: 'Elden öde daha uygun olur', expectedMasked: true, description: 'elden öde yönlendirmesi' },
  { id: 59, category: 'keyword', input: 'Gelin şantiyede w.p üzerinden yazın', expectedMasked: true, description: 'w.p noktalı yazım' },
  { id: 60, category: 'keyword', input: 'W/P den yaz', expectedMasked: true, description: 'W/P eğik çizgili' },

  // --- GRUP 6: IBAN VE HESAP NUMARALARI (61-70) ---
  { id: 61, category: 'iban', input: 'Kapora için IBAN: TR12 0006 1000 0000 1234 5678 90', expectedMasked: true, description: 'Standart 26 hane boşluklu IBAN' },
  { id: 62, category: 'iban', input: 'TR120006100000001234567890 hesabıma gönderin.', expectedMasked: true, description: 'Bitişik 26 hane IBAN' },
  { id: 63, category: 'iban', input: 'İban TR56 0001 5001 5800 7300 1234 56', expectedMasked: true, description: 'Farklı banka IBAN formatı' },
  { id: 64, category: 'iban', input: 'Hesap: TR330006200000000123456789', expectedMasked: true, description: 'TR ile başlayan 26 hane hesap' },

  // --- GRUP 7: YANLIŞ ALARM KONTROLLERİ (FALSE POSITIVES - ASLA MASKELENMEMELİ!) (71-105) ---
  { id: 71, category: 'false_positive_safe', input: 'Günlük kiralama bedeli 15.000 ₺ dir.', expectedMasked: false, description: 'Fiyat: 15.000 ₺' },
  { id: 72, category: 'false_positive_safe', input: 'Aylık 250000 TL nakliye dahil.', expectedMasked: false, description: 'Fiyat: 250000 TL' },
  { id: 73, category: 'false_positive_safe', input: 'Haftalık 45.500 TL + KDV talep ediyoruz.', expectedMasked: false, description: 'Fiyat: Küsüratlı TL' },
  { id: 74, category: 'false_positive_safe', input: 'Makinemiz 22 ton paletli ekskavatördür.', expectedMasked: false, description: 'Tonaj: 22 ton' },
  { id: 75, category: 'false_positive_safe', input: '55 tonluk lowbed ile taşıma yapılacaktır.', expectedMasked: false, description: 'Tonaj: 55 tonluk' },
  { id: 76, category: 'false_positive_safe', input: '30t mobil vinç ile montaj.', expectedMasked: false, description: 'Tonaj: 30t' },
  { id: 77, category: 'false_positive_safe', input: 'Şantiye alanı toplam 1500 m2 dir.', expectedMasked: false, description: 'Alan: 1500 m2' },
  { id: 78, category: 'false_positive_safe', input: 'Temel kazısı 120 m² lik alanda yapılacak.', expectedMasked: false, description: 'Alan: 120 m²' },
  { id: 79, category: 'false_positive_safe', input: 'Derinlik 50 metre, genişlik 25 mt.', expectedMasked: false, description: 'Uzunluk: metre/mt' },
  { id: 80, category: 'false_positive_safe', input: 'Mesafe yaklaşık 85 km sürmektedir.', expectedMasked: false, description: 'Mesafe: 85 km' },
  { id: 81, category: 'false_positive_safe', input: 'Makine modeli: CAT 320D ekskavatör.', expectedMasked: false, description: 'Model Kodu: CAT 320D' },
  { id: 82, category: 'false_positive_safe', input: 'Komatsu PC200-8 kepçe mevcut.', expectedMasked: false, description: 'Model Kodu: PC200-8' },
  { id: 83, category: 'false_positive_safe', input: 'JCB 3CX kazıcı yükleyici 2022 model.', expectedMasked: false, description: 'Model Kodu: JCB 3CX 2022' },
  { id: 84, category: 'false_positive_safe', input: 'Volvo EC380D kırıcı ataşmanlı.', expectedMasked: false, description: 'Model Kodu: EC380D' },
  { id: 85, category: 'false_positive_safe', input: 'Hidromek HMK 102B beko loder.', expectedMasked: false, description: 'Model Kodu: HMK 102B' },
  { id: 86, category: 'false_positive_safe', input: 'İş başlama tarihi 15.11.2026 dır.', expectedMasked: false, description: 'Tarih: 15.11.2026' },
  { id: 87, category: 'false_positive_safe', input: '2026-11-20 ile 2026-11-30 arası kiralık.', expectedMasked: false, description: 'ISO Tarih aralığı' },
  { id: 88, category: 'false_positive_safe', input: 'Günde 8 saat vardiyalı çalışma yapılabilir.', expectedMasked: false, description: 'Saat: 8 saat' },
  { id: 89, category: 'false_positive_safe', input: 'Teslimat saat 14:30 da şantiyede olacak.', expectedMasked: false, description: 'Saat: 14:30' },
  { id: 90, category: 'false_positive_safe', input: 'Toplam 3 gün içinde temel kazısı biter.', expectedMasked: false, description: 'Gün: 3 gün' },
  { id: 91, category: 'false_positive_safe', input: '5 adet damperli kamyon talep ediyoruz.', expectedMasked: false, description: 'Miktar: 5 adet' },
  { id: 92, category: 'false_positive_safe', input: '2 operatör ve 1 yağcı dahil fiyattır.', expectedMasked: false, description: 'Kişi: 2 operatör' },
  { id: 93, category: 'false_positive_safe', input: 'İlan No: #10425 hakkında soru sormak istiyorum.', expectedMasked: false, description: 'İlan numarası: #10425' },
  { id: 94, category: 'false_positive_safe', input: 'Talep Referansı: 58921', expectedMasked: false, description: 'Talep No: 58921' },
  { id: 95, category: 'false_positive_safe', input: 'Türkiye ve TR genelinde iş yapmaktayız.', expectedMasked: false, description: 'Tek başına "TR" kelimesi (IBAN değildir)' },
  { id: 96, category: 'false_positive_safe', input: 'TR standartlarına uygun CE belgeli ekipman.', expectedMasked: false, description: 'TR standartları cümlesi' },
  { id: 97, category: 'false_positive_safe', input: 'Motor gücü 128 kW, devir 2000 rpm.', expectedMasked: false, description: 'Teknik birimler: kW, rpm' },
  { id: 98, category: 'false_positive_safe', input: 'Kova kapasitesi 1.2 m3 tür.', expectedMasked: false, description: 'Hacim: 1.2 m3' },
  { id: 99, category: 'false_positive_safe', input: 'Yakıt deposu 350 litre mazot alır.', expectedMasked: false, description: 'Litre: 350 litre' },
  { id: 100, category: 'false_positive_safe', input: 'Şantiye no: 42 sokak no 15.', expectedMasked: false, description: 'Kapı ve sokak numaraları' },
  { id: 101, category: 'false_positive_safe', input: '1200 devirde saatte 18 litre tüketir.', expectedMasked: false, description: 'Tüketim rakamları' },
  { id: 102, category: 'false_positive_safe', input: 'En fazla 45 derece eğimli arazide çalışabilir.', expectedMasked: false, description: 'Açı / derece' },
  { id: 103, category: 'false_positive_safe', input: 'Maksimum uzanma mesafesi 10.5 metredir.', expectedMasked: false, description: 'Ondalıklı metre' },
  { id: 104, category: 'false_positive_safe', input: 'Haftada 6 gün, ayda 26 iş günü esastır.', expectedMasked: false, description: 'İş günü sayısı' },
  { id: 105, category: 'false_positive_safe', input: 'Ön ödeme olarak %20 peşinat alınır.', expectedMasked: false, description: 'Yüzde oranı: %20' },
  { id: 106, category: 'phone_real', input: 'Şantiye tel: 0(533) 444-55-66 arayabilirsiniz', expectedMasked: true, description: '0(533) biçimi' },
  { id: 107, category: 'email', input: 'destek@santiyego.com.tr', expectedMasked: true, description: 'destek mail adresi' },
  { id: 108, category: 'keyword', input: 'Lütfen t.me/santiye_kanal grubuna katılın', expectedMasked: true, description: 't.me linki' },
  { id: 109, category: 'false_positive_safe', input: 'Bom uzunluğu 36 mt, sepet kapasitesi 250 kg.', expectedMasked: false, description: 'Sepet kg ve mt' },
  { id: 110, category: 'false_positive_safe', input: 'Kule vinç 60 metre yükseklik, 2.5 ton uç kaldırma.', expectedMasked: false, description: 'Kule vinç teknik değerleri' },
];

/**
 * Testleri çalıştırıp istatistiksel rapor üreten fonksiyon
 */
export function runContactMaskerTests(): {
  total: number;
  passed: number;
  failed: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  failures: { id: number; description: string; expected: boolean; actual: boolean; text: string }[];
} {
  let passed = 0;
  let failed = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  const failures: { id: number; description: string; expected: boolean; actual: boolean; text: string }[] = [];

  for (const tc of TEST_CASES) {
    const result = sanitizeContent(tc.input);
    const success = result.isMasked === tc.expectedMasked;

    if (success) {
      passed++;
    } else {
      failed++;
      if (result.isMasked && !tc.expectedMasked) {
        falsePositives++;
      } else if (!result.isMasked && tc.expectedMasked) {
        falseNegatives++;
      }
      failures.push({
        id: tc.id,
        description: tc.description,
        expected: tc.expectedMasked,
        actual: result.isMasked,
        text: tc.input,
      });
    }
  }

  const accuracy = (passed / TEST_CASES.length) * 100;
  return {
    total: TEST_CASES.length,
    passed,
    failed,
    falsePositives,
    falseNegatives,
    accuracy,
    failures,
  };
}

// Auto-run if executed directly
const results = runContactMaskerTests();
console.log('================================================================');
console.log(' ŞANTİYE GO – İLETİŞİM KORUMA & MASKELEME BİRİM TEST RAPORU');
console.log('================================================================');
console.log(` Toplam Test Sayısı:           ${results.total}`);
console.log(` Başarılı (Passed):             ${results.passed}`);
console.log(` Başarısız (Failed):            ${results.failed}`);
console.log(` Yanlış Alarm (False Positive): ${results.falsePositives} (Hedef: 0)`);
console.log(` Kaçırılan (False Negative):    ${results.falseNegatives} (Hedef: 0)`);
console.log(` Doğruluk / Başarı Oranı:       %${results.accuracy.toFixed(2)}`);
console.log('================================================================');
if (results.failures.length > 0) {
  console.log('BAŞARISIZ OLAN TESTLER:');
  results.failures.forEach((f) => {
    console.log(`[ID ${f.id}] [${f.description}] Beklenen: ${f.expected}, Gerçekleşen: ${f.actual}`);
    console.log(`   Metin: "${f.text}"`);
  });
}

