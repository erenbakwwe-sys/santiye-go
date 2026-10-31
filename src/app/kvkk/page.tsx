import { ShieldCheck } from 'lucide-react';

export default function KvkkPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900">
              KVKK Aydınlatma Metni
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında Bilgilendirme
            </p>
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            <strong>ŞANTİYE GO</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) ve ilgili mevzuat hükümleri uyarınca veri sorumlusu sıfatıyla, kullanıcılarımızın kişisel verilerinin gizliliğini ve güvenliğini en üst düzeyde korumayı taahhüt ediyoruz.
          </p>

          <h2 className="text-lg font-bold text-navy-900 pt-2">1. Kişisel Verilerin İşlenme Amacı</h2>
          <p>
            Platformumuz üzerinden sunulan iş makineleri kiralama, yapı malzemeleri tedariği ve ağır nakliyat hizmetlerinin etkin şekilde yürütülmesi, alıcı ve satıcı firma arasındaki koordinasyonun sağlanması, şantiye lokasyonuna göre mesafe ve rota optimizasyonu yapılması amaçlarıyla verileriniz işlenmektedir.
          </p>

          <h2 className="text-lg font-bold text-navy-900 pt-2">2. Toplanan Kişisel Veriler</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Kimlik Bilgileri: Ad, soyad, firma unvanı, vergi dairesi/numarası.</li>
            <li>İletişim Bilgileri: E-posta adresi, telefon numarası, WhatsApp iletişim hattı, fiziki adres.</li>
            <li>Lokasyon Bilgileri: İlanın ve şantiyenin bulunduğu il, ilçe ve WGS84 coğrafi koordinatları.</li>
            <li>İşlem Güvenliği: IP adresleri, oturum kayıtları ve şifreleme anahtarları.</li>
          </ul>

          <h2 className="text-lg font-bold text-navy-900 pt-2">3. Veri Güvenliği ve RLS (Row Level Security)</h2>
          <p>
            Veritabanımızda uygulanan Row Level Security mimarisi gereğince, firma ve kullanıcı verileri katı izolasyon kurallarına tabidir. Bir firma yalnızca kendi adına kayıtlı ilanları ve kurumsal verileri yönetebilir.
          </p>

          <h2 className="text-lg font-bold text-navy-900 pt-2">4. Haklarınız</h2>
          <p>
            KVKK 11. maddesi uyarınca dilediğiniz zaman destek@santiyego.com adresi üzerinden verilerinizin durumunu sorgulayabilir, güncellenmesini veya sistemden tamamen silinmesini talep edebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
