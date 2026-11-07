import { ShieldCheck, AlertTriangle, FileText, Lock } from 'lucide-react';

export default function KvkkPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
          <div className="w-12 h-12 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900">
              KVKK Aydınlatma Metni & Gizlilik Politikası
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında Bilgilendirme
            </p>
          </div>
        </div>

        {/* Legal Disclaimer Badge */}
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Hukuki İnceleme Notu:</span> Bu metin bilgilendirme amaçlı hazırlanmış bir taslak metindir. Şirket unvanı ve resmi veri sorumlusu sicil kaydı (VERBİS) detayları hukuki incelemeden geçirilerek güncellenecektir.
          </div>
        </div>

        <div className="space-y-4 text-sm text-slate-600 leading-relaxed">
          <p>
            <strong>ŞANTİYE GO</strong> olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu (&quot;KVKK&quot;) ve ilgili mevzuat hükümleri uyarınca veri sorumlusu sıfatıyla, kullanıcılarımızın kişisel verilerinin gizliliğini ve güvenliğini en üst düzeyde korumayı taahhüt ediyoruz.
          </p>

          <h2 className="text-lg font-bold text-navy-900 pt-2">1. Kişisel Verilerin İşlenme Amacı</h2>
          <p>
            Platformumuz üzerinden sunulan iş makineleri kiralama, yapı malzemeleri tedariği ve ağır nakliyat hizmetlerinin etkin şekilde yürütülmesi, alıcı ve satıcı firma arasındaki koordinasyonun sağlanması, şantiye lokasyonuna göre mesafe ve rota optimizasyonu yapılması, işlem güvenliğinin ve sahtekarlıkla mücadelenin temini amaçlarıyla verileriniz işlenmektedir.
          </p>

          <h2 className="text-lg font-bold text-navy-900 pt-2">2. Toplanan Kişisel Veriler ve Veri Minimizasyonu</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, firma unvanı, vergi dairesi ve vergi kimlik numarası.</li>
            <li><strong>İletişim Bilgileri:</strong> E-posta adresi, cep telefonu numarası, kurumsal WhatsApp iletişim numarası, çalışma ve fatura adresi.</li>
            <li><strong>Lokasyon Bilgileri:</strong> İlanın ve şantiyenin bulunduğu il, ilçe ve WGS84 coğrafi koordinatları.</li>
            <li><strong>İşlem Güvenliği:</strong> IP adresleri, oturum bilgileri, güvenlik tarama olay sayaçları.</li>
          </ul>

          <h2 className="text-lg font-bold text-navy-900 pt-2 flex items-center gap-2">
            <Lock className="w-5 h-5 text-emerald-600" />
            3. Güvenlik, Dolandırıcılık Önleme ve Mesaj İçeriklerinin Otomatik Taranması
          </h2>
          <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <p>
              Kullanıcıların dolandırıcılık, kaparo mağduriyetleri ve kural dışı işlemlerden korunması amacıyla, platform üzerinde gönderilen metin girişleri (mesajlar, teklif notları, talep detayları, ilan açıklamaları) merkezi bir sunucu güvenlik algoritması tarafından taranmaktadır.
            </p>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong>Veri Minimizasyonu:</strong> Güvenlik taraması sırasında yakalanan telefon numarası, e-posta veya IBAN gibi hassas verilerin ham metin halleri <u>asla denetim kayıtlarında veya log tablolarında saklanmaz</u>. Yalnızca ihlalin türü (örn. telefon, IBAN) ve zaman damgası kaydedilir.
              </li>
              <li>
                <strong>İletişim Bilgilerinin Gizliliği:</strong> Kullanıcıların telefon numaraları kayıt ve doğrulama süreçleri için toplanır, ancak üçüncü şahıslara veya herkese açık sayfalara sunulmaz. İletişim bilgileri yalnızca teklif veya rezervasyon karşılıklı onaylandığında sadece ilgili iki tarafa açılır.
              </li>
              <li>
                <strong>Hatalı Tespitlere İtiraz Hakkı:</strong> Metniniz güvenlik algoritması tarafından yanlışlıkla maskelenirse (fiyat, model kodu vb.), mesaj balonundaki &quot;Bu bir iletişim bilgisi değil&quot; butonuyla itirazda bulunabilirsiniz. İtirazınız veri koruma ve moderasyon ekibimizce ivedilikle incelenir.
              </li>
            </ul>
          </div>

          <h2 className="text-lg font-bold text-navy-900 pt-2">4. Teklif Verme Kredisi Kapsamında İletişim Bilgisi Aktarımı ve Alıcı Açık Rızası</h2>
          <p>
            Alıcıların ücretsiz olarak açtığı iş makinesi ve malzeme taleplerine teklif sunmak isteyen doğrulanmış tedarikçiler, platform üzerinden teklif kredisi kullanmaktadır. Talep açılırken alıcı tarafından verilen açık rıza doğrultusunda, alıcının doğrulanmış adı, telefonu ve şantiye açık adresi; yalnızca söz konusu talep için kontenjan ayıran onaylı tedarikçi firmalara (en fazla 4 firma kontenjanı ile sınırlı olmak üzere) güvenli iletişim kartı aracılığıyla aktarılmaktadır. İletişim bilgileri genel internete veya diğer kullanıcılara açık hale getirilmez.
          </p>

          <h2 className="text-lg font-bold text-navy-900 pt-2">5. Veri Güvenliği ve RLS (Row Level Security)</h2>
          <p>
            Veritabanımızda uygulanan Row Level Security mimarisi gereğince, açılan iletişim kartları ve özel mesajlaşmalar yalnızca ilgili alıcı ve onaylı tedarikçi tarafından görüntülenebilir. Üçüncü şahısların bu verilere erişimi kriptografik ve yetkilendirme düzeyinde engellenmiştir.
          </p>

          <h2 className="text-lg font-bold text-navy-900 pt-2">6. Sözleşme Verilerinin İşlenmesi ve 10 Yıllık Saklama Süresi</h2>
          <p>
            Onaylanan rezervasyon ve teklifler neticesinde üretilen sözleşmelerdeki taraf bilgileri (unvan, vergi no, şantiye adresi) Türk Borçlar Kanunu ve Türk Ticaret Kanunu zamanaşımı hükümleri uyarınca en az 10 yıl süreyle dondurulmuş arşivde saklanmaktadır. Bireysel müşterilerden T.C. Kimlik Numarası talep edilmez ve işlenmez.
          </p>

          <h2 className="text-lg font-bold text-navy-900 pt-2">7. Haklarınız</h2>
          <p>
            KVKK 11. maddesi uyarınca dilediğiniz zaman destek@santiyego.com adresi üzerinden verilerinizin durumunu sorgulayabilir, yanlış verilerin düzeltilmesini veya sistemden tamamen silinmesini talep edebilirsiniz.
          </p>
        </div>
      </div>
    </div>
  );
}
