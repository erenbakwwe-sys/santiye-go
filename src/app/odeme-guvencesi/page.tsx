import Link from 'next/link';
import { ArrowLeft, ShieldAlert, ShieldCheck, Lock, RotateCcw, AlertTriangle } from 'lucide-react';

export default function PaymentGuaranteePage() {
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
              İşbu metin bir TASLAKTIR ve hukuki incelemeden geçirilmelidir. Platform, 6493 sayılı Kanun kapsamında bir ödeme veya elektronik para kuruluşu değildir.
            </p>
            <p className="text-slate-600 mt-1 font-mono text-[11px] bg-amber-100/60 p-2 rounded">
              [HUKUKİ YER TUTUCU: Platformun ödeme hizmeti sağlayıcısı olmadığı, 6563 sayılı Kanun kapsamında Aracı Hizmet Sağlayıcı olduğu ve ödemelerin TCMB lisanslı yetkili ödeme kuruluşu (iyzico) nezdindeki korumalı pazaryeri havuz hesabında tutulduğu yönündeki kesin yasal beyan platform hukukçusu tarafından belirlenecektir.]
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm space-y-6 text-xs sm:text-sm text-slate-700 leading-relaxed">
          <div className="border-b pb-4">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-xs font-black uppercase flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                Platform Ödeme Güvencesi
              </span>
            </div>
            <h1 className="text-2xl font-black text-navy-900 mt-2">
              Şantiye GO Ödeme Güvencesi (Emanet / Escrow Havuz Sistemi) Koşulları
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Sürüm: 1.0 (Pazaryeri & Alt Üye İşyeri Modeli) | Son Güncelleme: 9 Kasım 2026
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-800 text-xs">
                <Lock className="w-4 h-4 text-emerald-600" />
                1. Korumalı Havuzda Bekletme
              </div>
              <p className="text-[11px] text-slate-600">
                Alıcının ödediği tutar, lisanslı ödeme sağlayıcısının pazaryeri emanet havuzunda bloke edilir. Platform kendi hesabında başkasının parasını tutmaz.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-800 text-xs">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                2. Alıcı Onayıyla Aktarım
              </div>
              <p className="text-[11px] text-slate-600">
                İş makinesi sahaya ulaşıp iş teslim edilince alıcı &quot;İşi Onayla&quot; butonuna basar; para sağlayıcı tarafından firmanın IBAN&apos;ına aktarılır.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-navy-800 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                3. İtiraz ve Hakem Güvencesi
              </div>
              <p className="text-[11px] text-slate-600">
                İtiraz penceresi süresince alıcı sorun bildirirse aktarım derhal dondurulur; tarafların delilleri incelenerek hakem kararı verilir.
              </p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">1. SİSTEMİN ÇALIŞMA PRENSİBİ VE TARAFLAR</h2>
            <p>
              Platform Ödeme Güvencesi, Şantiye GO üzerinde anlaşmaya varılan iş makinesi kiralama, yapı malzemesi satışı veya şantiye lojistik hizmetlerinde alıcı ve satıcıyı korumak amacıyla tasarlanmış bir emanet (escrow) mekanizmasıdır.
            </p>
            <p>
              Ödeme, alıcı tarafından kredi kartı (3D Secure) veya banka kartı ile platform üzerinden gerçekleştirildiğinde; tutar satıcı firmanın hesabına doğrudan aktarılmaz. Tutar, BDDK ve TCMB lisanslı yetkili ödeme kuruluşu nezdinde açılmış korumalı pazaryeri havuz hesabında bloke edilir.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">2. HAKEDİŞİN SERBEST BIRAKILMASI TETİKLEYİCİLERİ</h2>
            <p>Korumalı havuzdaki tutarın satıcı firmaya aktarımı aşağıdaki üç şarttan birinin gerçekleşmesiyle icra edilir:</p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Alıcı Onayı:</strong> Alıcı, işin eksiksiz ve taahhüde uygun yapıldığını sistem üzerinden &quot;İşi Onayla ve Ödemeyi Serbest Bırak&quot; adımı ile teyit eder.
              </li>
              <li>
                <strong>İtiraz Penceresi Zaman Aşımı:</strong> İş bitim tarihinden itibaren platform ayarlarında tanımlı itiraz penceresi (standart 3 iş günü) boyunca alıcı tarafından herhangi bir uyuşmazlık bildirimi yapılmaması halinde sistem otomatik serbest bırakma talimatı verir.
              </li>
              <li>
                <strong>Yönetim Hakem Kararı:</strong> İtiraz açılmış dosyalarda platform yönetiminin delilleri inceleyerek verdiği karar doğrultusunda tutar firmaya aktarılır veya iade edilir.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">3. İTİRAZ, DONDURMA VE HAKEM SÜRECİ</h2>
            <p>
              İş sahasında makinenin gelmemesi, bozuk çıkması, operatörün yetersizliği veya sözleşmeye aykırı durumların varlığı halinde alıcı &quot;Sorun Bildir / İtiraz Et&quot; mekanizmasıyla süreci dondurabilir.
            </p>
            <p>
              İtiraz açıldığı anda tüm otomatik para transferleri derhal dondurulur. Satıcı firmaya cevap ve delil yükleme hakkı tanınır. Platform yöneticisi; tutanaklar, sevk irsaliyeleri ve fotoğrafları değerlendirerek: (a) Tam aktarım, (b) Alıcıya tam iade veya (c) Kusur oranına göre kısmi paylaşım kararı tesis eder.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">4. KOMİSYON VE İADE POLİTİKASI</h2>
            <p>
              Platform komisyonu işlem anında yürürlükteki tavan ve kademe kurallarına göre dondurulur. İşlemin alıcı haklılığı veya mücbir sebeple iptal edilmesi durumunda platform komisyonu da sıfırlanarak alıcıya tam (%100) kesintisiz iade uygulanır.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-base font-extrabold text-navy-900">5. VERGİ, FATURA VE KDV SORUMLULUĞU</h2>
            <p>
              Şantiye GO, verdiği aracılık hizmeti için yalnızca tahsil ettiği platform komisyonu tutarı kadar komisyon faturası düzenler. Kiralanan makine veya ifa edilen hizmetin asıl faturası, satıcı firma tarafından doğrudan alıcı adına tanzim edilir. Tüm işlem ve KDV dökümleri taraflarca panelden CSV formatında dışa aktarılabilir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
