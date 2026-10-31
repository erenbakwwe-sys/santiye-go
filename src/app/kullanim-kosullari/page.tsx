export default function TermsPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="bg-white rounded-2xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6 text-sm text-slate-600 leading-relaxed">
        <h1 className="text-2xl sm:text-3xl font-black text-navy-900 border-b border-slate-100 pb-4">
          Kullanım Koşulları
        </h1>
        <p>
          <strong>ŞANTİYE GO</strong> platformuna erişerek ve platformu kullanarak aşağıdaki kullanım şartlarını kabul etmiş sayılırsınız.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">1. Hizmetin Niteliği</h2>
        <p>
          ŞANTİYE GO, iş makineleri kiralama, yapı malzemeleri ve nakliye hizmeti sunan firmalar ile bu hizmetlere ihtiyaç duyan müteahhit ve şantiye yöneticilerini bir araya getiren bağımsız bir dijital pazaryeridir.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">2. İlan Verme Kuralları</h2>
        <p>
          Firma kullanıcıları verdikleri ilanlardaki makine durumu, fiyat, teknik özellik ve konum bilgilerinin doğruluğundan sorumludur. Yanıltıcı veya telif hakkı ihlali içeren ilanlar platformdan kaldırılabilir.
        </p>

        <h2 className="text-lg font-bold text-navy-900 pt-2">3. Sorumluluk Sınırı</h2>
        <p>
          Alıcı ve satıcı firma arasında mutabık kalınan kiralama sözleşmeleri, ödeme koşulları ve saha operasyonları doğrudan tarafların kendi aralarındaki hukuki sorumluluğundadır.
        </p>
      </div>
    </div>
  );
}
