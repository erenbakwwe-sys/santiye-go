export default function PrivacyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6 text-sm text-slate-600 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-navy-900 border-b border-slate-100 pb-4">
          Gizlilik ve Çerez Politikası
        </h1>
        <p>
          Bu Gizlilik Politikası, <strong>ŞANTİYE GO</strong> platformunu ziyaret eden ve hizmetlerimizi kullanan tüm kullanıcıların gizlilik haklarını korumak amacıyla hazırlanmıştır.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">1. Çerezlerin (Cookies) Kullanımı</h2>
        <p>
          Sitemizin güvenli oturum yönetimi (Supabase Auth oturumları), tercihlerin hatırlanması ve harita/konum filtreleme performansının optimize edilmesi için zorunlu ve analitik çerezler kullanılmaktadır.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">2. Konum Bilgilerinin Korunması</h2>
        <p>
          &quot;Konumumu Kullan&quot; özelliği kullanıldığında tarayıcınızdan alınan coğrafi koordinatlar (enlem/boylam) yalnızca anlık mesafe hesaplamasında ve şantiyenize en yakın makinelerin sıralanmasında kullanılır. Bu koordinatlar ticari profilleme veya reklam hedefleme amacıyla üçüncü kişilerle paylaşılmaz.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">3. İletişim</h2>
        <p>
          Gizlilik politikamıza ilişkin tüm soru ve talepleriniz için{' '}
          <a href="mailto:destek@santiyego.com" className="text-orange-600 font-bold underline">
            destek@santiyego.com
          </a>{' '}
          adresi üzerinden bize ulaşabilirsiniz.
        </p>
      </div>
    </div>
  );
}
