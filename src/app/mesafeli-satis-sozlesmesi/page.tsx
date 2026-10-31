import Link from 'next/link';
import { ArrowLeft, ShieldAlert } from 'lucide-react';

export default function DistanceSalesAgreementPage() {
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
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong>Yasal Uyarı & Taslak Bildirimi:</strong>
            <p className="text-slate-600 mt-0.5">
              Bu sözleşme metni bir taslaktır. Şirketinizin unvanı, MERSİS numarası ve resmi iletişim bilgileriyle doldurularak platform canlıya alınmadan önce mutlaka hukuk müşaviriniz tarafından incelenmeli ve onaylanmalıdır.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <h1 className="text-2xl font-black text-navy-900 border-b pb-4">
            Mesafeli Satış ve Hizmet Sözleşmesi (Taslak)
          </h1>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 1 – TARAFLAR</h2>
            <p>
              <strong>1.1. ARACI HİZMET SAĞLAYICI (Platform):</strong><br />
              Ünvan: [Şirket Resmi Ünvanı]<br />
              Adres: [Şirket Yasal Adresi]<br />
              Vergi Dairesi & No: [Vergi Dairesi / VKN]<br />
              Mersis No: [Mersis Numarası]<br />
              E-posta: destek@santiyego.com
            </p>
            <p>
              <strong>1.2. HİZMET SAĞLAYICI (Satıcı / Kiralayan Tedarikçi):</strong><br />
              Şantiye GO platformu üzerinden ilan veren, vergi levhası doğrulanmış gerçek veya tüzel kişi alt üye işyeridir.
            </p>
            <p>
              <strong>1.3. ALICI (Müşteri / Müteahhit):</strong><br />
              Platform üzerinden iş makinesi kiralayan, yapı malzemesi siparişi veren veya nakliye hizmeti satın alan gerçek veya tüzel kişidir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 2 – SÖZLEŞMENİN KONUSU</h2>
            <p>
              İşbu sözleşmenin konusu, ALICI&apos;nın Şantiye GO dijital pazaryeri platformu üzerinden elektronik ortamda rezervasyonunu veya siparişini oluşturduğu iş makinesi kiralama, yapı malzemesi satışı veya nakliye hizmetinin sunumu, bedelinin iyzico güvenli havuz hesabı üzerinden tahsili ve tarafların 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği hükümleri uyarınca hak ve yükümlülüklerinin belirlenmesidir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 3 – GÜVENLİ PAZARYERİ VE ÖDEME MODELİ</h2>
            <p>
              3.1. Şantiye GO, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun kapsamında &quot;Aracı Hizmet Sağlayıcı&quot; sıfatına haizdir.
            </p>
            <p>
              3.2. ALICI tarafından yapılan ödemeler, ödeme sağlayıcısı (iyzico) nezdindeki havuz hesabında bloke edilir. İş makinesi veya malzemenin şantiye sahasına ulaşıp teslim alınmasıyla birlikte onaylanan tutar tedarikçiye aktarılır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 4 – CAYMA HAKKI VE İADE KOŞULLARI</h2>
            <p>
              Kiralama başlangıç saatinden 24 saat öncesine kadar yapılan iptallerde ödeme ALICI&apos;ya kesintisiz olarak iade edilir. Şantiye sahasında fiziki teslimi gerçekleşen ve çalıştırılan iş makinelerinde Mesafeli Sözleşmeler Yönetmeliği m.15/1-g uyarınca cayma hakkı istisnası uygulanır.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
