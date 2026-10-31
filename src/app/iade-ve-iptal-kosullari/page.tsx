import Link from 'next/link';
import { ArrowLeft, ShieldAlert, RotateCcw, AlertTriangle, CheckCircle2 } from 'lucide-react';

export default function CancellationAndRefundPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        {/* Legal Disclaimer Box */}
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-3 shadow-sm">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Yasal Uyarı & Taslak Bildirimi:</strong>
            <p className="text-slate-600 mt-0.5">
              İşbu İptal ve İade Koşulları metni Şantiye GO pazaryeri mimarisi için hazırlanmış taslak hukuki çerçevedir. Şirketinizin resmi unvanı, MERSİS numarası ve lojistik/operasyonel sözleşmeleriyle harmonize edilerek canlıya alınmadan önce mutlaka hukuk müşaviriniz tarafından onaylanmalıdır.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="border-b pb-4">
            <h1 className="text-2xl font-black text-navy-900">
              İptal, Cayma ve İade Koşulları (Taslak)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Son Güncelleme: 31 Ekim 2026 | Sürüm: 1.0 (Pazaryeri & Emanet Havuz Modeli)
            </p>
          </div>

          {/* Quick Rules Highlight */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-emerald-800 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                24 Saatten Önce İptal
              </div>
              <p className="text-[11px] text-slate-600">
                Rezervasyon veya teslimat başlangıcından 24 saat öncesine kadar %100 kesintisiz tam iade yapılır.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Son 24 Saat İçinde İptal
              </div>
              <p className="text-[11px] text-slate-600">
                Lojistik ve makine rezervasyon hazırlığı yapılmışsa nakliye masrafı düşülerek kalan tutar iade edilir.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-800 text-xs">
                <RotateCcw className="w-4 h-4 text-navy-600" />
                Emanet Havuz Koruması
              </div>
              <p className="text-[11px] text-slate-600">
                Ödeme iyzico güvenli havuzunda tutulur; iş sahada teslim edilip onaylanmadan satıcıya aktarılmaz.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">1. GENEL PRENSİP VE EMANET (ESCROW) HAVUZ SİSTEMİ</h2>
            <p>
              Şantiye GO üzerinden yapılan tüm kiralama ve satın alma ödemeleri, 6563 sayılı Kanun ve BDDK/TCMB lisanslı ödeme kuruluşu (iyzico) nezdindeki güvenli havuz hesabında bloke edilir.
            </p>
            <p>
              Alıcı ödemeyi yaptığı anda tutar doğrudan satıcının hesabına geçmez; iş makinesinin sahada faaliyete geçmesi, yapı malzemesinin sevk irsaliyesiyle şantiyede eksiksiz teslim alınması veya nakliye hizmetinin ifa edilmesi sonrasında alıcı onayı veya platform doğrulama süresi neticesinde tedarikçiye aktarılır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">2. İŞ MAKİNESİ KİRALAMA İPTAL VE İADE KOŞULLARI</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Erken İptal (24 Saat Öncesi):</strong> Kiralama başlangıç tarih ve saatinden en az 24 saat önce platform üzerinden yapılan iptal bildirimlerinde, hiçbir kesinti olmaksızın tahsil edilen bedelin %100&apos;ü Alıcı&apos;nın kredi kartına/hesabına iade edilir.
              </li>
              <li>
                <strong>Geç İptal (Son 24 Saat):</strong> Kiralama başlangıcına 24 saatten az süre kala yapılan iptallerde; tedarikçi firma tarafından makine lojistiği (lowbed/çekici sevkıyatı) başlatılmamışsa rezervasyon bedeli iade edilir. Ancak makine yola çıkarılmışsa, gidiş-dönüş nakliye bedeli Alıcı&apos;dan mahsup edilerek kalan bakiye iade edilir.
              </li>
              <li>
                <strong>Sahada Ayıplı / Taahhüde Uymayan Makine:</strong> Sahaya sevk edilen iş makinesinin ilanda belirtilen tonaj, model, ataşman veya operatör yeterliliklerine (G sınıfı ehliyet, operatörlük belgesi, periyodik kontrol raporu) haiz olmaması durumunda Alıcı teslimatı kabul etmeme hakkına sahiptir. Durumun 2 saat içinde destek@santiyego.com veya platform çağrı merkezine fotoğraflı/tutanaklı bildirilmesiyle rezervasyon iptal edilir ve Alıcı&apos;ya tam iade yapılır. Nakliye maliyeti kusurlu tedarikçi firmaya rücu edilir.
              </li>
              <li>
                <strong>İş Sırasında Arıza ve İş Durması:</strong> Kiralanan makinenin kullanım esnasında kullanıcı hatası olmaksızın arızalanması halinde, tedarikçi 24 saat içinde ikame makine temin etmekle veya çalışılmayan süreye isabet eden bedeli Alıcı&apos;ya iade etmekle yükümlüdür.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">3. YAPI MALZEMELERİ SİPARİŞLERİNDE İPTAL VE İADE</h2>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Standart Ambalajlı Malzemeler:</strong> Seramik, boya, alçı, yalıtım levhası ve torba çimento gibi ambalajı açılmamış, hasar görmemiş ve tekrar satılabilirliği bozulmamış standart malzemelerde teslim tarihinden itibaren 14 gün içinde cayma ve iade hakkı mevcuttur. İade kargo/nakliye gideri cayma hakkını kullanan Alıcı&apos;ya aittir.
              </li>
              <li>
                <strong>Özel Sipariş & Döküm Malzemeleri (Cayma İstisnası):</strong> Mesafeli Sözleşmeler Yönetmeliği m.15/1 uyarınca; hazır beton (santralden çıkan ve mikserde priz alma süresi bulunan ürünler), projeye göre kesilip bükülen inşaat demirleri ve Alıcı&apos;nın talebine özel renklendirilen boyalarda döküm/üretim başladıktan sonra cayma ve iade hakkı bulunmamaktadır.
              </li>
              <li>
                <strong>Eksik / Hasarlı Teslimat:</strong> Şantiyeye indirilen malzemeler irsaliye kontrol edilerek teslim alınmalıdır. Hasarlı, donmuş çimento veya çatlak/kırık ürünler teslim fişine şerh düşülerek derhal fotoğraflanmalı ve iade işlemi başlatılmalıdır.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">4. NAKLİYE VE HAFRİYAT HİZMETLERİNDE İPTAL</h2>
            <p>
              Nakliye araçlarının (hafriyat kamyonu, lowbed dorse vb.) şantiye adresine intikalinden önce yapılan iptallerde sefer organizasyon masrafı mahsup edilmez. Araç şantiye adresine gelmiş ancak sahada çalışma izni, yol kapanması veya Alıcı kaynaklı ruhsat eksiklikleri sebebiyle yükleme yapılamamışsa asgari bekleme/sefer taban ücreti tedarikçiye ödenir, kalan tutar iade edilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">5. İADE TUTARININ HESABA YANSIMA SÜRESİ</h2>
            <p>
              Şantiye GO tarafından onaylanan iadeler, anlaşmalı ödeme kuruluşu iyzico altyapısı üzerinden aynı gün bankaya iletilir. Bankaların işlem prosedürlerine bağlı olarak tutarın kredi kartı ekstresine veya banka kartı hesabına yansıması ortalama 1 ila 7 iş günü sürebilmektedir.
            </p>
          </section>

          <section className="space-y-2 border-t pt-4">
            <h2 className="text-base font-extrabold text-navy-900">6. İTİRAZ VE UYUŞMAZLIK ÇÖZÜMÜ</h2>
            <p>
              Alıcı ve Tedarikçi arasındaki saha teslimat ve performans uyuşmazlıklarında Şantiye GO arabulucu rolü üstlenerek platform üzerindeki konum logları, fotoğraf ekleri, mesajlaşma geçmişi ve iş teslim tutanakları üzerinden değerlendirme yapar. Çözülemeyen ihtilaflarda Tüketici Hakem Heyetleri ve T.C. Ticaret Mahkemeleri yetkilidir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
