import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Sparkles, AlertOctagon, RotateCcw, CheckCircle2 } from 'lucide-react';

export default function AdvertisingTermsPage() {
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
              İşbu Reklam ve Öne Çıkarma Şartları metni Şantiye GO platformunun reklam yayın prensiplerini düzenleyen taslak hukuki metindir. Şirketinizin unvanı ve kurumsal avukatlarınızın incelemesiyle nihai hale getirilmelidir.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="border-b pb-4">
            <h1 className="text-2xl font-black text-navy-900">
              Reklam ve Öne Çıkarma Şartları (Taslak)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Son Güncelleme: 31 Ekim 2026 | Sürüm: 1.0 (Sabit Süreli Paket & Adil Rotasyon Modeli)
            </p>
          </div>

          {/* Quick Summary Highlights */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-900 text-xs">
                <Sparkles className="w-4 h-4 text-orange-500" />
                Şeffaf Sponsorlu Etiketi
              </div>
              <p className="text-[11px] text-slate-600">
                Tüm reklam ve vitrin ilanları arama sonuçlarında açıkça &quot;Sponsorlu&quot; etiketiyle gösterilir.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-900 text-xs">
                <AlertOctagon className="w-4 h-4 text-red-500" />
                Moderasyon Denetimi
              </div>
              <p className="text-[11px] text-slate-600">
                Belgesiz operatör, yanıltıcı fiyat veya sahte makine ilanı içeren reklamlar onaylanmaz.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-900 text-xs">
                <RotateCcw className="w-4 h-4 text-emerald-600" />
                Reddedilende %100 İade
              </div>
              <p className="text-[11px] text-slate-600">
                Admin tarafından yayına alınmadan reddedilen reklamların ücreti eksiksiz geri ödenir.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">1. GENEL PRENSİPLER VE KAPSAM</h2>
            <p>
              Şantiye GO platformu üzerinden satın alınan tüm reklam ve öne çıkarma hizmetleri (Ana Sayfa Vitrini, Kategori Vitrini, Sponsorlu Arama Sonucu, Bölgesel Hedefli Reklam ve Öne Çıkan Firma Profili), inşaat ve şantiye sektörünün güvenliğini ve şeffaflığını koruma amacıyla işbu kurallara tabidir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">2. YASAKLI İÇERİKLER VE REKLAM STANDARTLARI</h2>
            <p>Aşağıdaki unsurları içeren reklam başvuruları derhal reddedilir:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>Mülkiyeti veya yasal kiralama hakkı bulunmayan sahte iş makineleri veya yanıltıcı stok bilgileri.</li>
              <li>Periyodik teknik kontrol muayenesi eksik olan veya G sınıfı operatörlük sertifikası ibraz edilemeyen makineler.</li>
              <li>Piyasa rayicinin çok altında veya çok üstünde aldatıcı/spekülatif fiyat gösterimi.</li>
              <li>Firma doğrulaması (Vergi Levhası ve İmza Sirküleri) tamamlanmamış veya askıya alınmış üyelik hesapları.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">3. SLOT YÖNETİMİ VE ADİL ROTASYON KURALI</h2>
            <p>
              Arama sonuçlarında ve ana sayfa vitrininde kullanıcı deneyimini bozmamak adına slot kapasiteleri sınırlıdır (Arama sonuçlarında en fazla 2 slot). Aynı kategori ve bölgede slot kapasitesinden fazla aktif reklam bulunması halinde platform <strong>Ağırlıklı Adil Paylaşımlı Rotasyon (Weighted Fair-Share Round-Robin)</strong> uygular. Her firma satın aldığı süre boyunca hedeflenen gösterim dengesine göre eşit şansa sahip olur.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">4. ARAMA FİLTRELERİNİN ÜSTÜNLÜĞÜ VE DEDUPİNG</h2>
            <p>
              Reklamlar kullanıcıların konum ve kategori filtrelerini asla bypass edemez. Örneğin bir kullanıcı Samsun&apos;da 25 km yarıçap arıyorsa, İstanbul merkezli bir reklam bu arama sonucunda gösterilmez. Ayrıca üst sponsorlu slotta çıkan bir ilan, alt organik listeden otomatik olarak çıkarılarak aynı sayfada mükerrer gösterilmesi engellenir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">5. ÜCRET VE İADE KOŞULLARI</h2>
            <p>
              5.1. Reklam ücretleri satın alma anında kredi kartı / iyzico altyapısı ile tahsil edilir.
            </p>
            <p>
              5.2. Admin moderatörleri tarafından reklam kurallarına aykırılık gerekçesiyle onaylanmayan ve hiç yayına girmeyen reklamlar için tahsil edilen tutarın <strong>%100&apos;ü kesintisiz olarak</strong> firmanın kartına iade edilir.
            </p>
            <p>
              5.3. Yayına girmiş ve gösterim almaya başlamış reklamlarda süre dolmadan yapılan iptallerde orantılı iade yapılmaz.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
