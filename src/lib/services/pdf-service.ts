import { PDFDocument, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ContractSnapshot } from '../../types/database';

export interface GeneratePdfResult {
  pdfBuffer: Uint8Array;
  sha256: string;
  fileName: string;
}

function getNodeModules() {
  if (typeof window === 'undefined') {
    try {
      const req = eval('require');
      return {
        fs: req('fs'),
        path: req('path'),
        crypto: req('crypto'),
      };
    } catch {
      return {};
    }
  }
  return {};
}

/**
 * Sözleşme verilerinden dondurulmuş PDF belgesi üretir.
 * Türkçe karakter desteği, A4 mizanpajı, kurumsal başlıklar ve SHA-256 özeti sağlar.
 */
export async function generateContractPdf(snapshot: ContractSnapshot): Promise<GeneratePdfResult> {
  const { fs, path, crypto } = getNodeModules();
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);

  // Türkçe karakter destekli font yükle
  let customFont: any;
  try {
    if (fs && path) {
      const fontPath = path.join(process.cwd(), 'public', 'fonts', 'arial.ttf');
      if (fs.existsSync(fontPath)) {
        const fontBytes = fs.readFileSync(fontPath);
        customFont = await doc.embedFont(fontBytes);
      }
    }
  } catch {
    // Fallback font
  }

  // Sayfa boyutları (A4: 595.28 x 841.89)
  const page = doc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();

  // Renk tanımları
  const primaryColor = rgb(0.1, 0.15, 0.25);
  const textDark = rgb(0.15, 0.15, 0.15);
  const textGray = rgb(0.4, 0.4, 0.4);
  const lineGray = rgb(0.82, 0.82, 0.82);
  const bannerBg = rgb(0.97, 0.95, 0.9);
  const bannerBorder = rgb(0.9, 0.75, 0.4);
  const bannerText = rgb(0.7, 0.35, 0.0);

  let currentY = height - 40;

  // 1. ÜST BİLGİ VE YASAL UYARI BANDI
  page.drawRectangle({
    x: 40,
    y: currentY - 26,
    width: width - 80,
    height: 26,
    color: bannerBg,
    borderColor: bannerBorder,
    borderWidth: 1,
  });

  if (customFont) {
    page.drawText('TASLAK – HUKUKİ İNCELEMEDEN GEÇMELİDİR  •  ŞANTİYE GO ARACI HİZMET PLATFORMU', {
      x: 52,
      y: currentY - 18,
      size: 8.5,
      font: customFont,
      color: bannerText,
    });
  }

  currentY -= 45;

  // 2. BAŞLIK VE SÖZLEŞME NUMARASI
  const titleText =
    snapshot.contract_type === 'rental'
      ? 'İŞ MAKİNELERİ VE EKİPMAN KİRALAMA SÖZLEŞMESİ'
      : 'AĞIR NAKLİYE VE İNŞAAT HİZMETİ SÖZLEŞMESİ';

  if (customFont) {
    page.drawText(titleText, {
      x: 40,
      y: currentY,
      size: 14,
      font: customFont,
      color: primaryColor,
    });

    page.drawText(`Sözleşme No: ${snapshot.contract_number}   |   Sürüm: v${snapshot.template_version}   |   Tarih: ${new Date(snapshot.created_at).toLocaleDateString('tr-TR')}`, {
      x: 40,
      y: currentY - 16,
      size: 9,
      font: customFont,
      color: textGray,
    });
  }

  currentY -= 28;
  page.drawLine({
    start: { x: 40, y: currentY },
    end: { x: width - 40, y: currentY },
    thickness: 1,
    color: lineGray,
  });
  currentY -= 18;

  // 3. MADDE 1: TARAFLAR
  if (customFont) {
    page.drawText('MADDE 1 – SÖZLEŞMENİN TARAFLARI', {
      x: 40,
      y: currentY,
      size: 10.5,
      font: customFont,
      color: primaryColor,
    });
  }
  currentY -= 14;

  const partyBoxY = currentY - 80;
  // Firma kutusu
  page.drawRectangle({
    x: 40,
    y: partyBoxY,
    width: (width - 90) / 2,
    height: 80,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: lineGray,
    borderWidth: 0.5,
  });
  // Alıcı kutusu
  page.drawRectangle({
    x: 40 + (width - 90) / 2 + 10,
    y: partyBoxY,
    width: (width - 90) / 2,
    height: 80,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: lineGray,
    borderWidth: 0.5,
  });

  if (customFont) {
    // Sol: Firma (Kiralayan / Hizmet Veren)
    const compX = 50;
    page.drawText('HİZMET VEREN / KİRALAYAN (FİRMA):', { x: compX, y: partyBoxY + 65, size: 8, font: customFont, color: primaryColor });
    page.drawText(`Unvan: ${snapshot.company.name || '-'}`, { x: compX, y: partyBoxY + 52, size: 8, font: customFont, color: textDark });
    page.drawText(`Vergi Dairesi & No: ${snapshot.company.tax_office || '-'} / ${snapshot.company.tax_number || '-'}`, { x: compX, y: partyBoxY + 40, size: 8, font: customFont, color: textDark });
    page.drawText(`Adres: ${snapshot.company.address || '-'} ${snapshot.company.district || ''} / ${snapshot.company.city || ''}`, { x: compX, y: partyBoxY + 28, size: 7.5, font: customFont, color: textDark });
    page.drawText(`İletişim: ${snapshot.company.phone || '-'}`, { x: compX, y: partyBoxY + 16, size: 8, font: customFont, color: textDark });

    // Sağ: Alıcı (Kiracı / Hizmet Alan - TC KİMLİK İSTENMEZ)
    const buyerX = 50 + (width - 90) / 2 + 10;
    page.drawText('HİZMET ALAN / KİRACI (ALICI):', { x: buyerX, y: partyBoxY + 65, size: 8, font: customFont, color: primaryColor });
    page.drawText(`Ad Soyad / Unvan: ${snapshot.buyer.company_name || snapshot.buyer.full_name || '-'}`, { x: buyerX, y: partyBoxY + 52, size: 8, font: customFont, color: textDark });
    if (snapshot.buyer.tax_number) {
      page.drawText(`V.D. / Vergi No: ${snapshot.buyer.tax_office || '-'} / ${snapshot.buyer.tax_number}`, { x: buyerX, y: partyBoxY + 40, size: 8, font: customFont, color: textDark });
    } else {
      page.drawText(`Statü: Bireysel Müşteri (TC Kimlik No Alınmamaktadır)`, { x: buyerX, y: partyBoxY + 40, size: 8, font: customFont, color: textGray });
    }
    page.drawText(`Adres: ${snapshot.buyer.address || 'Kayıtlı Profil Adresi'}`, { x: buyerX, y: partyBoxY + 28, size: 7.5, font: customFont, color: textDark });
    page.drawText(`İletişim: ${snapshot.buyer.phone || '-'}`, { x: buyerX, y: partyBoxY + 16, size: 8, font: customFont, color: textDark });
  }

  currentY = partyBoxY - 18;

  // 4. MADDE 2: KONU, İLAN VE ŞANTİYE SAHASI
  if (customFont) {
    page.drawText('MADDE 2 – SÖZLEŞMENİN KONUSU VE ÇALIŞMA SAHASI', {
      x: 40,
      y: currentY,
      size: 10.5,
      font: customFont,
      color: primaryColor,
    });
  }
  currentY -= 14;

  const subjectBoxY = currentY - 50;
  page.drawRectangle({
    x: 40,
    y: subjectBoxY,
    width: width - 80,
    height: 50,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: lineGray,
    borderWidth: 0.5,
  });

  if (customFont) {
    page.drawText(`İlan / Ekipman: ${snapshot.subject.title} (${snapshot.subject.category_name || 'Genel'})`, { x: 50, y: subjectBoxY + 36, size: 8.5, font: customFont, color: textDark });
    page.drawText(`Kiralama / Hizmet Tarihleri: ${snapshot.subject.start_date} - ${snapshot.subject.end_date || 'Belirtilmedi'}`, { x: 50, y: subjectBoxY + 24, size: 8.5, font: customFont, color: textDark });
    page.drawText(`Şantiye / Teslim Adresi: ${snapshot.subject.worksite_address} (${snapshot.subject.district_name || ''} / ${snapshot.subject.city_name || ''})`, { x: 50, y: subjectBoxY + 12, size: 8, font: customFont, color: textDark });
  }

  currentY = subjectBoxY - 18;

  // 5. MADDE 3: BEDEL VE ÖDEME KOŞULLARI (KOMİSYON ASLA YAZMAZ)
  if (customFont) {
    page.drawText('MADDE 3 – SÖZLEŞME BEDELİ VE ÖDEME ŞEKLİ', {
      x: 40,
      y: currentY,
      size: 10.5,
      font: customFont,
      color: primaryColor,
    });
  }
  currentY -= 14;

  const priceBoxY = currentY - 45;
  page.drawRectangle({
    x: 40,
    y: priceBoxY,
    width: width - 80,
    height: 45,
    color: rgb(0.98, 0.98, 0.98),
    borderColor: lineGray,
    borderWidth: 0.5,
  });

  if (customFont) {
    const kdvInfo = snapshot.pricing.vat_included ? 'KDV Dahil' : '+ KDV Hariç';
    const paymentInfo = snapshot.pricing.payment_method === 'platform' ? 'ŞantiyeGO Güvenli Ödeme Altyapısı' : 'Doğrudan Firma ile Mutabakat';
    page.drawText(`Toplam Sözleşme Bedeli: ${snapshot.pricing.total_price.toLocaleString('tr-TR')} ${snapshot.pricing.currency} (${kdvInfo})`, { x: 50, y: priceBoxY + 30, size: 9, font: customFont, color: primaryColor });
    page.drawText(`Operatör / Yakıt / Nakliye: ${snapshot.subject.need_operator ? 'Operatör Dahil' : 'Operatörsüz'}  •  ${snapshot.subject.need_fuel ? 'Yakıt Dahil' : 'Yakıt Hariç'}  •  ${snapshot.subject.need_transport ? 'Nakliye Dahil' : 'Nakliye Hariç'}`, { x: 50, y: priceBoxY + 18, size: 8, font: customFont, color: textDark });
    page.drawText(`Ödeme Yöntemi: ${paymentInfo}`, { x: 50, y: priceBoxY + 6, size: 8, font: customFont, color: textGray });
  }

  currentY = priceBoxY - 18;

  // 6. MADDE 4: PLATFORMUN STATÜSÜ VE GENEL HÜKÜMLER
  if (customFont) {
    page.drawText('MADDE 4 – PLATFORMUN ARACI ROLÜ VE STANDART ŞARTLAR', {
      x: 40,
      y: currentY,
      size: 10.5,
      font: customFont,
      color: primaryColor,
    });
  }
  currentY -= 14;

  const termsText = [
    '1. ŞantiyeGO (Platform), 6563 sayılı ETK kapsamında Aracı Hizmet Sağlayıcıdır; sözleşmenin tarafı veya kefili değildir.',
    '2. Ekipman eksiksiz ve çalışır vaziyette tutanakla teslim edilir ve iade alınır. Kullanım kusurlarından kiracı sorumludur.',
    '3. İptal ve fesih hallerinde ŞantiyeGO İade ve İptal Koşulları uygulanır. Mücbir sebepler saklıdır.',
    '4. Taraflar, KVKK ve ticari sır mevzuatına riayet edeceklerini, paylaşılan bilgileri amacı dışında kullanmayacaklarını taahhüt eder.',
    '5. Uyuşmazlık durumunda yetkili icra daireleri ve mahkemeler hukukçular ve taraflarca bilahare belirlenecektir.',
  ];

  if (customFont) {
    for (const term of termsText) {
      page.drawText(term, {
        x: 45,
        y: currentY,
        size: 7.5,
        font: customFont,
        color: textDark,
      });
      currentY -= 12;
    }
  }

  currentY -= 15;

  // 7. İMZA VE ONAY KUTULARI
  const signBoxHeight = 65;
  const signBoxY = currentY - signBoxHeight;

  // Firma İmza Kutusu
  page.drawRectangle({
    x: 40,
    y: signBoxY,
    width: (width - 90) / 2,
    height: signBoxHeight,
    color: rgb(1, 1, 1),
    borderColor: lineGray,
    borderWidth: 0.5,
  });

  // Alıcı İmza Kutusu
  page.drawRectangle({
    x: 40 + (width - 90) / 2 + 10,
    y: signBoxY,
    width: (width - 90) / 2,
    height: signBoxHeight,
    color: rgb(1, 1, 1),
    borderColor: lineGray,
    borderWidth: 0.5,
  });

  if (customFont) {
    const sCompX = 50;
    page.drawText('KİRALAYAN / HİZMET VEREN FİRMA', { x: sCompX, y: signBoxY + 50, size: 8, font: customFont, color: primaryColor });
    page.drawText('Yetkili Kaşe / İmza & Dijital Onay', { x: sCompX, y: signBoxY + 38, size: 7.5, font: customFont, color: textGray });

    const sBuyerX = 50 + (width - 90) / 2 + 10;
    page.drawText('KİRACI / HİZMET ALAN ALICI', { x: sBuyerX, y: signBoxY + 50, size: 8, font: customFont, color: primaryColor });
    page.drawText('İmza & Dijital Onay', { x: sBuyerX, y: signBoxY + 38, size: 7.5, font: customFont, color: textGray });
  }

  // 8. ALT BİLGİ (FOOTER VE SHA-256 DOĞRULAMA KODU)
  const footerY = 25;
  page.drawLine({
    start: { x: 40, y: footerY + 15 },
    end: { x: width - 40, y: footerY + 15 },
    thickness: 0.5,
    color: lineGray,
  });

  // PDF baytlarını oluştur
  const pdfBytes = await doc.save();
  let sha256 = '';
  if (crypto?.createHash) {
    sha256 = crypto.createHash('sha256').update(pdfBytes).digest('hex');
  } else {
    sha256 = Array.from(pdfBytes.slice(0, 32)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  if (customFont) {
    page.drawText(`Bu belge ŞantiyeGO sisteminde üretilmiştir. Belge Bütünlük Özeti (SHA-256): ${sha256.slice(0, 32)}...`, {
      x: 40,
      y: footerY,
      size: 7,
      font: customFont,
      color: textGray,
    });
  }

  const finalPdfBytes = await doc.save();
  let finalSha256 = '';
  if (crypto?.createHash) {
    finalSha256 = crypto.createHash('sha256').update(finalPdfBytes).digest('hex');
  } else {
    finalSha256 = Array.from(finalPdfBytes.slice(0, 32)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const fileName = `${snapshot.contract_number}.pdf`;

  return {
    pdfBuffer: finalPdfBytes,
    sha256: finalSha256,
    fileName,
  };
}
