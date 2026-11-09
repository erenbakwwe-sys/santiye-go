# ŞANTİYE GO – ÖDEME GÜVENCESİ, İADE, İPTAL VE İTİRAZ KOŞULLARI SÖZLEŞMESİ (TASLAK)

> **ÖNEMLİ HUKUKİ UYARI:**
> İşbu metin bir taslaktır ve yürürlüğe alınmadan önce şirket hukuk müşaviri / avukat tarafından incelenerek onaylanmalıdır. Platformun 6493 sayılı Kanun ve ilgili mevzuat kapsamındaki hukuki statüsü ile sözleşmesel sorumluluk sınırları kesinleştirilmeden canlı ortama aktarılamaz.

---

## 1. TARAFLAR VE STATÜLER

**Aracı Hizmet Sağlayıcı (Platform):**
- **Unvan:** [ŞİRKET_UNVANI]
- **Hukuki Statü:** [PLATFORM_HUKUKİ_STATÜSÜ] (Örn: 6563 sayılı Kanun kapsamında Elektronik Ticaret Aracı Hizmet Sağlayıcı)
- **Mersis No:** [MERSİS_NO]
- **Vergi Dairesi ve No:** [VERGİ_DAİRESİ_VE_NO]
- **Tebligat Adresi:** [TEBLİGAT_ADRESİ]
- **E-posta / Kep:** [KEP_VEYA_EPOSTA]

**Ödeme Hizmeti Sağlayıcısı (Lisanslı Kuruluş):**
- **Unvan:** [ÖDEME_KURULUŞU_UNVANI] (Örn: İyzi Ödeme ve Menkul Kıymetler A.Ş. – iyzico)
- **Statü:** Türkiye Cumhuriyet Merkez Bankası (TCMB) lisanslı Ödeme ve Menkul Kıymet Mutabakat Sistemleri Kuruluşu.

**Alıcı (Kiralayan / Hizmet Alan):**
Platform üzerinden iş makinesi kiralama, yapı malzemesi alımı veya şantiye hizmeti talebinde bulunan ve ödemeyi gerçekleştiren gerçek veya tüzel kişi.

**Tedarikçi Firma (Kiraya Veren / Hizmet Veren):**
Platformda ilan açan, teklif veren ve alt üye işyeri sözleşmesi kapsamında hakedişi tahsil eden onaylı vergi mükellefi işletme.

---

## 2. EMANET VE FON TUTMAMA BEYANI (ESCROW PRENSİBİ)

1. **[PLATFORM_FON_TUTMAZ_BEYANI]:** Platform ([ŞİRKET_UNVANI]), 6493 sayılı Kanun uyarınca bir banka, ödeme kuruluşu veya elektronik para kuruluşu değildir. Platform hiçbir koşul ve surette alıcı veya tedarikçiye ait fonları kendi mülkiyetinde, emanetinde veya kendi banka hesaplarında tutmaz.
2. Alıcı tarafından kredi kartı, banka kartı veya diğer elektronik ödeme yöntemleriyle yapılan ödemeler doğrudan **[ÖDEME_KURULUŞU_UNVANI] nezdindeki lisanslı ve güvenceli havuz hesabına** intikal eder.
3. Platform sadece Alıcı, Tedarikçi ve Lisanslı Ödeme Kuruluşu arasında teknolojik entegrasyonu, teslimat teyidini ve itiraz orkestrasyonunu sağlayan teknik aracı konumundadır.

---

## 3. ÖDEME MODLARI VE KAPSAMI

1. **Platform Dışı Doğrudan Ödeme Modu (Varsayılan - External):**
   - Taraflar kiralama veya satın alma bedelini platform altyapısını kullanmaksızın kendi aralarında doğrudan (şantiyede nakit, banka havalesi vb.) mutabık kalarak ifa ederler.
   - Bu modda "Platform Ödeme Güvencesi" hükümleri uygulanmaz; platformun hiçbir mali sorumluluğu bulunmaz.
2. **Platform Ödeme Güvencesi Modu (Platform - Escrow):**
   - Alıcının platform üzerindeki 3D Secure güvenli ödeme adımını kullanarak bedeli ödediği işlemlerdir.
   - Ödenen bedel iş teslim edilip onaylanana kadar lisanslı havuz hesabında bloke tutulur.

---

## 4. TESLİMAT, İTİRAZ PENCERESİ VE OTOMATİK AKTARIM

1. **Teslimat Bildirimi:** Tedarikçi firma taahhüt ettiği makine, ekipman veya hizmeti şantiyede teslim ettiğinde platform üzerinden **"İşi Teslim Ettim"** bildiriminde bulunur.
2. **72 Saatlik İtiraz Penceresi:**
   - Teslimat bildiriminin yapıldığı andan itibaren Alıcı için **72 saatlik (3 iş günü)** kontrol ve itiraz süresi başlar.
   - Bu süre alıcının şantiye sahasında makineyi, operatörü veya hizmeti test etmesi, kusur veya eksiklik olup olmadığını incelemesi içindir.
3. **Erken Onay:** Alıcı 72 saatlik süreyi beklemeden panelinden **"İşi Onayla ve Ödemeyi Serbest Bırak"** butonuna basarak bedelin tedarikçinin IBAN'ına aktarılmasını derhal onaylayabilir.
4. **Zaman Aşımı ve Otomatik Onay:** Alıcı 72 saat içinde hiçbir itiraz bildiriminde bulunmazsa, sistem bedeli otomatik olarak serbest bırakılabilir (`releasable`) statüsüne geçirir ve Lisanslı Ödeme Kuruluşuna aktarım emri iletilir.

---

## 5. İTİRAZ (UYUŞMAZLIK) SÜRECİ VE İTİRAZ MASASI

1. **İtiraz Bildirimi:** Alıcı, 72 saatlik süre içinde panelindeki **"Sorun Bildir"** adımından gerekçesini ve varsa fotoğraf/tutanak delillerini sunarak ödemeyi askıya alabilir (`disputed`).
2. **Blokenin Dondurulması:** İtiraz açıldığı anda geri sayım sayacı durdurulur; ödeme havuzda bloke kalmaya devam eder ve tedarikçiye aktarım durdurulur.
3. **İtiraz Masası İncelemesi:**
   - Platform İtiraz Masası, her iki taraftan şantiye teslim tutanağı, operatör puantajı ve servis raporlarını talep eder.
   - İnceleme azami [İNCELEME_SÜRESİ_GÜN] iş günü içinde tamamlanır.
4. **Karar ve İfa:**
   - **Alıcı Haklı Bulunursa:** Ödenen bedel Lisanslı Ödeme Kuruluşu üzerinden Alıcının kredi kartına/hesabına iade edilir (`refunded`).
   - **Tedarikçi Haklı Bulunursa:** Ödeme onaylanır ve Tedarikçinin kayıtlı IBAN hesabına aktarılır (`transferred`).

---

## 6. KOMİSYON VE HAKEDİŞ KESİNTİLERİ

1. Platform komisyon oranı ödeme anında geçerli olan kurallara göre dondurulur ve tahsilat anında ayrıştırılır.
2. İptal ve tam iade durumlarında platform komisyonu da alıcıya eksiksiz iade edilir.
3. Alıcı lehine sonuçlanan itirazlarda tedarikçinin platform güven skoru düşürülür; mükerrer kusurlarda hesabı askıya alınabilir.

---

*[PLATFORM_HUKUKİ_STATÜSÜ] olarak işbu sözleşme genel bilgilendirme amacıyla hazırlanmış olup, nihai metin Şantiye Go Hukuk Müşavirliği onayıyla yürürlüğe girecektir.*
