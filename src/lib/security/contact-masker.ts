/**
 * ŞANTİYE GO – MERKEZİ İLETİŞİM BİLGİSİ TARAYICI VE MASKELEME MOTORU (PROMPT 9A)
 * Platform dışı anlaşma ve komisyon kaçağını engellemek için telefon, e-posta,
 * IBAN, web linki ve harici mesajlaşma yönlendirmelerini tespit eder ve maskeler.
 * 
 * Yanlış alarmları (fiyat, tonaj, m², model kodu, tarih vb.) kesinlikle maskelemez.
 */

export type MaskDetectedType = 'phone' | 'email' | 'iban' | 'url' | 'keyword';

export interface MaskResult {
  isMasked: boolean;
  sanitizedText: string;
  maskedText: string; // alias for sanitizedText
  detectedTypes: MaskDetectedType[];
  infoNotice?: string;
}

export interface MaskOptions {
  allowContact?: boolean; // Teklif/rezervasyon onaylandığında true verilerek açık bırakılır
  customKeywords?: string[]; // Admin panelinden gelebilen dinamik yasaklı kelimeler
}

// Varsayılan harici yönlendirme kelimeleri
export const DEFAULT_FORBIDDEN_KEYWORDS = [
  'whatsapp',
  'watsap',
  'wp',
  'w.p',
  'w/p',
  'instagram',
  'insta',
  'telegram',
  't.me',
  'özelden yaz',
  'özelden yazın',
  'ozelden yaz',
  'özelden ara',
  'özelden arayın',
  'ozelden ara',
  'elden anlaşalım',
  'elden anlasalim',
  'elden öde',
  'elden ode',
  'aradan çıkalım',
  'komisyonsuz halledelim',
];

// Türkçe kelime rakam eşleşmeleri
const WORD_TO_DIGIT: Record<string, string> = {
  'sıfır': '0', 'sifir': '0',
  'bir': '1',
  'iki': '2',
  'üç': '3', 'uc': '3',
  'dört': '4', 'dort': '4',
  'beş': '5', 'bes': '5',
  'altı': '6', 'alti': '6',
  'yedi': '7',
  'sekiz': '8',
  'dokuz': '9',
  'on': '1',
  'yirmi': '2',
  'otuz': '3',
  'kırk': '4', 'kirk': '4',
  'elli': '5',
  'altmış': '6', 'altmis': '6',
  'yetmiş': '7', 'yetmis': '7',
  'seksen': '8',
  'doksan': '9',
  'yüz': '1', 'yuz': '1',
};

/**
 * Türkçe metni küçük harfe dönüştürürken Türkçe karakterleri (İ -> i, I -> ı) korur
 */
function turkishToLower(str: string): string {
  return str
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR');
}

/**
 * Metindeki harfle veya karışık yazılmış telefon numaralarını tespit etmek için normalize eder
 */
function normalizeTextForPhoneDetection(text: string): { normalized: string; mapping: number[] } {
  const lower = text.toLowerCase();
  let normalized = '';
  const mapping: number[] = []; // normalized index -> original index

  let i = 0;
  while (i < lower.length) {
    // Kelime kontrolü
    let matchedWord = false;
    for (const [word, digit] of Object.entries(WORD_TO_DIGIT)) {
      if (lower.startsWith(word, i)) {
        normalized += digit;
        mapping.push(i);
        i += word.length;
        matchedWord = true;
        break;
      }
    }
    if (matchedWord) continue;

    const char = lower[i];
    // O veya o harfi bazen 0 yerine kullanılır (örn: O532...)
    if ((char === 'o' || char === 'O') && (i + 1 < lower.length && lower[i + 1] === '5')) {
      normalized += '0';
      mapping.push(i);
    } else if (/[0-9]/.test(char)) {
      normalized += char;
      mapping.push(i);
    } else if (/[\s+._()-]/.test(char)) {
      // Ayrıştırıcı karakterleri koru
      normalized += char;
      mapping.push(i);
    } else {
      normalized += ' ';
      mapping.push(i);
    }
    i++;
  }

  return { normalized, mapping };
}

/**
 * Merkezi Güvenli İçerik Tarayıcı (Sunucu ve İstemci tek fonksiyondan beslenir)
 */
export function sanitizeContent(
  text: string,
  options: MaskOptions = {}
): MaskResult {
  if (!text || typeof text !== 'string') {
    return { isMasked: false, sanitizedText: text || '', maskedText: text || '', detectedTypes: [] };
  }

  if (options.allowContact) {
    return { isMasked: false, sanitizedText: text, maskedText: text, detectedTypes: [] };
  }

  const detectedTypes: MaskDetectedType[] = [];
  const MASK_LABEL = '[iletişim bilgisi gizlendi]';

  // Orijinal metin üzerinde değişiklik yapacağız
  let result = text;

  // 1. IBAN TESPİTİ
  // Kural: "TR" + 2 kontrol rakamı + 22 rakam (toplam 24 rakam). Boşluklu veya boşluksuz olabilir.
  // Tek başına "TR" kelimesini ASLA maskeleme!
  const ibanRegex = /\bTR\s*(?:[0-9]\s*){24}\b/gi;
  if (ibanRegex.test(result)) {
    if (!detectedTypes.includes('iban')) detectedTypes.push('iban');
    result = result.replace(ibanRegex, MASK_LABEL);
  }

  // 2. E-POSTA TESPİTİ
  // Standart @ domain, veya "isim [at] gmail [dot] com" tarzı gizleme denemeleri
  const emailRegex = /\b[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[at\]\s*|\s*\(at\)\s*)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*\[dot\]\s*|\s*\(dot\)\s*)[a-zA-Z]{2,}\b/gi;
  if (emailRegex.test(result)) {
    if (!detectedTypes.includes('email')) detectedTypes.push('email');
    result = result.replace(emailRegex, MASK_LABEL);
  }

  // Popüler mail domainleri doğrudan geçtiğinde (örn: ahmet gmail com veya ahmet@gmail)
  const emailPlainRegex = /\b[a-zA-Z0-9._%+-]+\s*(?:@|at)\s*(?:gmail|hotmail|yahoo|outlook|yandex|icloud)\s*(?:\.|\s*dot\s*|\s+)(?:com|net|org)\b/gi;
  if (emailPlainRegex.test(result)) {
    if (!detectedTypes.includes('email')) detectedTypes.push('email');
    result = result.replace(emailPlainRegex, MASK_LABEL);
  }

  // 3. WEB LINKI VE ALAN ADI TESPİTİ
  // http, https, www, bit.ly veya .com / .com.tr ile biten alan adları
  const urlRegex = /(?:https?:\/\/|www\.)[^\s/$.?#].[^\s]*|bit\.ly\/[^\s]+|t\.me\/[^\s]+|(?:[a-zA-Z0-9-]+\.(?:com\.tr|com|net|org|gov\.tr|edu\.tr|xyz|me|info|biz)(?:\/[^\s]*)?)/gi;
  if (urlRegex.test(result)) {
    if (!detectedTypes.includes('url')) detectedTypes.push('url');
    result = result.replace(urlRegex, MASK_LABEL);
  }

  // 4. HARİCİ İLETİŞİM YÖNLENDİRME KELİMELERİ (Türkçe karakter uyumlu)
  const forbiddenPatterns = [
    /(?:whatsapp|watsap|w\.p|w\/p|\bwp\b)/gi,
    /[iİıI]nstagram|[iİıI]nsta\b/gi,
    /telegram|t\.me\b/gi,
    /(?:özelden|ozelden)\s*(?:yaz|ara|görüş|ulas|anlaş)[a-zçşğüıö]*/gi,
    /elden\s*(?:anlaş|anlas|öde|ode)[a-zçşğüıö]*/gi,
    /aradan\s*çıkalım|komisyonsuz\s*halledelim/gi,
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(result)) {
      if (!detectedTypes.includes('keyword')) detectedTypes.push('keyword');
      result = result.replace(pattern, MASK_LABEL);
    }
  }

  // Admin özel kelimeleri varsa kontrol et
  if (options.customKeywords && options.customKeywords.length > 0) {
    for (const kw of options.customKeywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const kwRegex = new RegExp(`(?<![a-zçşğüıöA-ZÇŞĞÜİÖ0-9])${escaped}(?![a-zçşğüıöA-ZÇŞĞÜİÖ0-9])`, 'gi');
      if (kwRegex.test(result)) {
        if (!detectedTypes.includes('keyword')) detectedTypes.push('keyword');
        result = result.replace(kwRegex, MASK_LABEL);
      }
    }
  }

  // 5. TÜRKÇE YAZI İLE YAZILMIŞ NUMARA KALIPLARI
  // Örn: "sıfır beş yüz..." veya "sıfır 5..."
  const spelledPhoneRegex = /(?:sıfır|sifir|0)\s*(?:beş|bes|5)\s*(?:yüz|yuz|[0-9a-zçşğüıö\s]){10,60}/gi;
  if (spelledPhoneRegex.test(result)) {
    const { normalized } = normalizeTextForPhoneDetection(result);
    const digitsOnly = normalized.replace(/[^0-9]/g, '');
    if (digitsOnly.length >= 10 && digitsOnly.startsWith('05')) {
      if (!detectedTypes.includes('phone')) detectedTypes.push('phone');
      result = result.replace(spelledPhoneRegex, MASK_LABEL);
    }
  }

  // 5. TELEFON NUMARASI TESPİTİ (En kritik aşama)
  // Yanlış alarm koruması kuralları:
  // - 15.000 ₺ (fiyat)
  // - 22 ton, 55 tonluk
  // - 120 m², 50 m3
  // - CAT 320D, JS220, PC200-8 (model kodları)
  // - 2026-11-05 (tarih)
  // - 8 saat, 3 gün, 15:30 (zaman/saat)
  // Bu yüzden Türkiye cep numaralarının net özellikleri aranır:
  // Başlangıç: +90, 0090, 05, veya doğrudan 5 (10 veya 11 hane)

  // A. Standart ve ayrıştırıcılı numaralar (05xx xxx xx xx, +90 5xx..., (05xx) xxx-xxxx)
  const phoneStandardRegex = /(?:\+?90\s*|0090\s*|0)?\s*(?:\(?\s*5[0-9]{2}\s*\)?)\s*[\s.-]*[0-9]{3}[\s.-]*[0-9]{2}[\s.-]*[0-9]{2}\b/gi;
  if (phoneStandardRegex.test(result)) {
    if (!detectedTypes.includes('phone')) detectedTypes.push('phone');
    result = result.replace(phoneStandardRegex, MASK_LABEL);
  }

  // B. Aralıklı yazılmış veya gizlenmiş numaralar (Örn: "0 5 3 2 1 2 3 4 5 6 7" veya "sıfır beş yüz...")
  // Normalizasyon üzerinden tarama
  const { normalized } = normalizeTextForPhoneDetection(result);
  const strippedPhoneRegex = /(?:\+?90|0090|0)?5[0-9]{9}\b/g;

  // Sadece rakamları ayıklayarak ardışık 10 veya 11 haneli 5 ile başlayan blokları bul
  const digitsOnly = normalized.replace(/[^0-9]/g, '');
  if (digitsOnly.length >= 10) {
    const match = digitsOnly.match(/(?:90|0)?(5[0-9]{9})/);
    if (match) {
      const targetPhone = match[1]; // 5321234567
      // Eğer bu 10 haneli telefon numarası orijinal metinde yer alıyorsa (aralarında karakter olsa bile)
      // İlk 3 hanesi 5xx ve sonraki 7 hanesi olan bloğu bulup maskele
      const phoneDigitsPattern = targetPhone.split('').join('[\\s._-]*');
      const flexibleRegex = new RegExp(`(?:\\+?90[\\s._-]*|0[\\s._-]*)?${phoneDigitsPattern}`, 'gi');
      if (flexibleRegex.test(result)) {
        if (!detectedTypes.includes('phone')) detectedTypes.push('phone');
        result = result.replace(flexibleRegex, MASK_LABEL);
      }
    }
  }

  // Yan yana gelen mükerrer maske etiketlerini temizle: "[iletişim bilgisi gizlendi] [iletişim bilgisi gizlendi]" -> "[iletişim bilgisi gizlendi]"
  result = result.replace(/(\[iletişim bilgisi gizlendi\]\s*)+/gi, '[iletişim bilgisi gizlendi] ');
  result = result.trim();

  const isMasked = detectedTypes.length > 0;
  return {
    isMasked,
    sanitizedText: result,
    maskedText: result,
    detectedTypes,
    infoNotice: isMasked
      ? 'İletişim bilgileri teklif/rezervasyon onaylandıktan sonra otomatik paylaşılır.'
      : undefined,
  };
}
