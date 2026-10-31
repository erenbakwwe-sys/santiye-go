import Link from 'next/link';
import { ArrowLeft, ShieldAlert, Award, FileCheck, DollarSign, Building } from 'lucide-react';

export default function MembershipAgreementPage() {
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
              İşbu Pazaryeri Üyelik ve Alt Üye İşyeri Sözleşmesi taslağı, 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun ve BDDK/TCMB Ödeme Kuruluşları Mevzuatı uyarınca hazırlanmıştır. Canlıya alınmadan önce firmanızın kurumsal avukatları tarafından son kontrolleri yapılmalıdır.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="border-b pb-4">
            <h1 className="text-2xl font-black text-navy-900">
              Pazaryeri Satıcı & Tedarikçi Üyelik Sözleşmesi (Taslak)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Son Güncelleme: 31 Ekim 2026 | Sürüm: 1.0 (Alt Üye İşyeri & Komisyon Modeli)
            </p>
          </div>

          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-900 text-xs">
                <Building className="w-4 h-4 text-orange-500" />
                Resmi Firma Doğrulaması
              </div>
              <p className="text-[11px] text-slate-600">
                Vergi Levhası, İmza Sirküleri ve VKN doğrulanmadan ilan yayını yapılamaz.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-900 text-xs">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                iyzico Alt Üye İşyeri
              </div>
              <p className="text-[11px] text-slate-600">
                Hakedişler vergi numarasıyla eşleşen resmi şirket IBAN hesabına aktarılır.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-900 text-xs">
                <FileCheck className="w-4 h-4 text-blue-600" />
                Şeffaf Komisyon Modeli
              </div>
              <p className="text-[11px] text-slate-600">
                Platform komisyonu (%5-10) rezervasyon onayında şeffafça düşülür, üyelik indirimi uygulanır.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 1 – TARAFLAR VE TANIMLAR</h2>
            <p>
              İşbu Sözleşme; bir tarafta dijital pazar yeri altyapısını işleten <strong>Şantiye GO Dijital Pazaryeri Platformu</strong> (&quot;PLATFORM&quot;) ile diğer tarafta platforma üye olarak iş makinesi kiralayan, inşaat malzemesi satan veya lojistik/nakliye hizmeti sunan tüzel kişi veya şahıs şirketi (&quot;ÜYE FİRMA / ALT ÜYE İŞYERİ&quot;) arasında akdedilmiştir.
            </p>
            <p>
              PLATFORM, 6563 sayılı Kanun kapsamında &quot;Aracı Hizmet Sağlayıcı&quot; olup, ALICI (Müşteri) ile ÜYE FİRMA arasındaki ticari akitlerin kurulmasına elektronik ortam sağlamaktadır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 2 – ÜYELİK VE BELGE DOĞRULAMA ZORUNLULUĞU</h2>
            <p>
              2.1. ÜYE FİRMA, platformda ilan yayınlayabilmek ve teklif verebilmek için aşağıdaki resmi belgeleri sisteme yüklemekle yükümlüdür:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Güncel Vergi Levhası fotokopisi</li>
              <li>İmza Sirküleri / İmza Beyannamesi</li>
              <li>Ticaret Sicil Gazetesi (Tüzel kişiler için) veya Esnaf Odası Kayıt Belgesi</li>
              <li>Şirket resmi unvanına kayıtlı TR ile başlayan 26 haneli IBAN numarası</li>
            </ul>
            <p>
              2.2. PLATFORM moderatörleri tarafından belgeler incelenip onaylanana kadar firmanın ilanları yayına alınmaz. Sahte veya geçersiz evrak ibraz eden üyelerin hesapları süresiz askıya alınır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 3 – İLAN VE HİZMET STANDARTLARI</h2>
            <p>
              3.1. ÜYE FİRMA; ilan ettiği iş makinelerinin periyodik teknik muayenelerinin yapıldığını, operatörlerin G sınıfı ehliyete ve gerekli mesleki yeterlilik belgelerine sahip olduğunu taahhüt eder.
            </p>
            <p>
              3.2. İş makinesi kiralama ve nakliye hizmetleri esnasında 6331 sayılı İş Sağlığı ve Güvenliği Kanunu&apos;na riayet edilmesi tamamen ÜYE FİRMA&apos;nın ve sahada yetkili ALICI&apos;nın sorumluluğundadır. PLATFORM iş kazaları, makine hasarları ve üçüncü şahıs tazminat taleplerinden sorumlu tutulamaz.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 4 – ÖDEME, KOMİSYON VE HAKEDİŞ AKTARIMI</h2>
            <p>
              4.1. ALICI tarafından yapılan ödemeler, ödeme kuruluşu iyzico havuz hesabında bloke edilir.
            </p>
            <p>
              4.2. Hizmetin sahada tamamlanması veya malzemenin teslim edilmesiyle birlikte hakediş, PLATFORM tarafından belirlenen komisyon oranı (varsa aktif üyelik planı indirimi uygulanmış net oran) ve yasal vergiler tenzil edildikten sonra ÜYE FİRMA&apos;nın resmi IBAN hesabına aktarılır.
            </p>
            <p>
              4.3. ÜYE FİRMA, satış bedelinin tamamı üzerinden ALICI adına resmi faturayı / e-arşivi düzenlemek ve iletmekle yükümlüdür. PLATFORM ise yalnızca tahsil ettiği komisyon tutarı için ÜYE FİRMA&apos;ya komisyon faturası tanzim eder.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 5 – ABONELİK PLANLARI VE KULLANIM LİMİTLERİ</h2>
            <p>
              5.1. Ücretsiz üyelik paketi sınırlı sayıda ilan ve teklif hakkı sunar. ÜYE FİRMA dilerse aylık veya yıllık abonelikle &quot;Profesyonel&quot; veya &quot;Premium&quot; paketlere geçebilir.
            </p>
            <p>
              5.2. Abonelik süresi sona erdiğinde ve yenileme yapılmadığında hesap otomatik olarak Ücretsiz plana düşürülür; limit fazlası ilanlar silinmez, yalnızca pasife (&apos;inactive&apos;) alınır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">MADDE 6 – SÖZLEŞMENİN FESHİ VE YASAKLI EYLEMLER</h2>
            <p>
              Platform dışına yönlendirerek hileli işlem yapma, komisyon kaçırma, tekliflerde spekülatif fiyat verme veya müşteri şikayetlerine konu olma hallerinde PLATFORM üyeliği tek taraflı feshetme ve havuzdaki bekleyen ödemeleri ihtilaf çözülene kadar bloke etme hakkına sahiptir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
