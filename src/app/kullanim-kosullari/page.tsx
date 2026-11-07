import { AlertTriangle, ShieldCheck } from 'lucide-react';

export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6 text-sm text-slate-600 leading-relaxed">
        {/* Legal Disclaimer Badge */}
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Önemli Not:</span> Bu kullanım koşulları metni bir ön taslak olup, resmi yürürlüğe girmeden önce şirket hukuk danışmanlığı tarafından detaylı incelemeden geçirilmelidir.
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-navy-900 border-b border-slate-100 pb-4">
          Kullanım Koşulları ve Üyelik Şartları
        </h1>
        <p>
          <strong>ŞANTİYE GO</strong> platformuna erişerek ve platformu kullanarak aşağıdaki kullanım şartlarını ve kurallarını peşinen kabul etmiş sayılırsınız.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">1. Hizmetin Niteliği</h2>
        <p>
          ŞANTİYE GO, iş makineleri kiralama, yapı malzemeleri ve nakliye hizmeti sunan firmalar ile bu hizmetlere ihtiyaç duyan müteahhit ve şantiye yöneticilerini bir araya getiren bağımsız bir dijital pazaryeri ve sektörel koordinasyon platformudur.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">2. İlan Verme Kuralları ve Doğruluk</h2>
        <p>
          Firma kullanıcıları verdikleri ilanlardaki makine durumu, fiyat, teknik özellik ve konum bilgilerinin doğruluğundan sorumludur. Yanıltıcı, gerçeğe aykırı veya telif hakkı ihlali içeren ilanlar moderasyon ekibi tarafından platformdan kaldırılabilir. İlan başlığı ve açıklamalarında doğrudan harici iletişim bilgisi (telefon, e-posta, IBAN vb.) paylaşılamaz.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-orange-500" />
          3. Platform Dışı Yönlendirme Yasağı ve İletişim Güvencesi
        </h2>
        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <p>
            Platform üzerindeki işlemlerin güvenliğini sağlamak, dolandırıcılık ve kaparo mağduriyetlerini önlemek amacıyla alıcı ve tedarikçi arasındaki tüm ön görüşmeler platform mesajlaşma ve teklif sistemi üzerinden gerçekleştirilir.
          </p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Harici İletişim Kısıtlaması:</strong> Teklif veya rezervasyon karşılıklı olarak onaylanmadan önce tarafların mesajlar, teklif notları veya ilanlar aracılığıyla telefon numarası, e-posta, IBAN veya sosyal medya hesapları (WhatsApp, Telegram vb.) paylaşması ve platform dışına yönlendirme yapması kesinlikle yasaktır.
            </li>
            <li>
              <strong>Otomatik Güvenlik Maskelemesi:</strong> Platform sunucuları, güvenlik ve dolandırıcılık önleme amacıyla metin girişlerini tarar ve yetkisiz harici iletişim girişimlerini otomatik olarak maskeler. Ham iletişim bilgileri veritabanında saklanmaz.
            </li>
            <li>
              <strong>Kontrollü İletişim Açılışı:</strong> Bir talep veya rezervasyon için teklif verildiğinde ve taraflar bu teklifi karşılıklı onayladığında, sistem her iki tarafın doğrulanmış kurumsal iletişim bilgilerini (ad, unvan, telefon, tam şantiye/firma adresi) otomatik ve güvenli şekilde taraflara açar.
            </li>
            <li>
              <strong>Yaptırımlar:</strong> Platform dışına yönlendirme girişimlerinin ve kasıtlı atlatma çabalarının tekrarlanması halinde, kullanıcının ilan verme ve mesajlaşma yetkileri askıya alınabilir veya üyelik feshedilebilir.
            </li>
          </ul>
        </div>

        <h2 className="text-lg font-bold text-navy-900 pt-2">4. Sorumluluk Sınırı</h2>
        <p>
          Alıcı ve satıcı firma arasında mutabık kalınan saha operasyonları, makine teslim tutanakları ve saha güvenlik önlemleri tarafların kendi aralarındaki hukuki ve cezai sorumluluğundadır. ŞANTİYE GO, tarafların platform kurallarına uygun işlem yapmasını gözetir.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">5. Uyuşmazlıkların Çözümü</h2>
        <p>
          Taraflar arasındaki uyuşmazlıklarda platform üzerinden kayıt altına alınan onaylı teklifler, onay zaman damgaları ve sistem kayıtları delil niteliği taşır.
        </p>
      </div>
    </div>
  );
}
