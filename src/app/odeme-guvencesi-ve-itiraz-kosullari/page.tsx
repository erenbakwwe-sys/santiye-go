import Link from 'next/link';
import { ArrowLeft, ShieldCheck, AlertTriangle, FileText, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Ödeme Güvencesi ve İtiraz Koşulları (Taslak) | Şantiye Go',
  description: 'iyzico lisanslı havuz hesabı güvencesi, 72 saatlik itiraz penceresi ve uyuşmazlık çözüm kuralları.',
};

export default function EscrowLegalTermsPage() {
  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        {/* Hukuki İnceleme Uyarısı */}
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-950">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <span className="font-black block uppercase tracking-wide">
              Hukuki İnceleme Uyarısı (Taslak Metin)
            </span>
            <p className="text-amber-900 leading-relaxed">
              İşbu metin bir taslaktır ve yürürlüğe alınmadan önce şirket hukuk müşaviri / avukat tarafından incelenerek onaylanmalıdır. Platformun 6493 sayılı Kanun ve ilgili mevzuat kapsamındaki hukuki statüsü ile sözleşmesel sorumluluk sınırları kesinleştirilmeden canlı ortama aktarılamaz.
            </p>
          </div>
        </div>

        {/* Contract Card */}
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8 text-slate-700 leading-relaxed">
          <div className="border-b border-slate-100 pb-5">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Güvenli Pazaryeri & Escrow Sözleşmesi</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900">
              Ödeme Güvencesi, İade, İptal ve İtiraz Koşulları
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Son Güncelleme: 09 Kasım 2026 • Versiyon 1.0 (Taslak)
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">1</span>
              Taraflar ve Hukuki Statü
            </h2>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-2 font-mono">
              <p><strong>Aracı Hizmet Sağlayıcı:</strong> [ŞİRKET_UNVANI] ([PLATFORM_HUKUKİ_STATÜSÜ])</p>
              <p><strong>Mersis No:</strong> [MERSİS_NO] • <strong>Vergi No:</strong> [VERGİ_DAİRESİ_VE_NO]</p>
              <p><strong>Tebligat Adresi:</strong> [TEBLİGAT_ADRESİ]</p>
              <p><strong>Lisanslı Ödeme Kuruluşu:</strong> [ÖDEME_KURULUŞU_UNVANI] (TCMB Lisanslı Havuz Hesabı)</p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">2</span>
              Emanet ve Fon Tutmama Beyanı (Escrow Prensibi)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              <strong>[PLATFORM_FON_TUTMAZ_BEYANI]:</strong> Platform ([ŞİRKET_UNVANI]), 6493 sayılı Kanun uyarınca bir banka, ödeme kuruluşu veya elektronik para kuruluşu değildir. Platform hiçbir koşul ve surette alıcı veya tedarikçiye ait fonları kendi mülkiyetinde, emanetinde veya kendi banka hesaplarında tutmaz. Alıcı tarafından ödenen tutarlar doğrudan <strong>[ÖDEME_KURULUŞU_UNVANI]</strong> nezdindeki lisanslı havuz hesabında bloke edilir.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">3</span>
              Ödeme Modları ve Kapsamı
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1.5">
                <span className="font-bold text-navy-900 block">1. Platform Dışı Doğrudan Ödeme (External - Varsayılan)</span>
                <p className="text-slate-500 leading-relaxed">
                  Taraflar iş bedelini platform altyapısını kullanmaksızın kendi aralarında doğrudan (havale, şantiyede nakit vb.) mutabık kalarak ifa ederler. Bu modda &quot;Platform Ödeme Güvencesi&quot; hükümleri uygulanmaz.
                </p>
              </div>
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1.5">
                <span className="font-bold text-emerald-900 block">2. Platform Ödeme Güvencesi (Platform - Escrow)</span>
                <p className="text-emerald-800 leading-relaxed">
                  Alıcının 3D Secure ile ödeme yaptığı modeldir. Bedel iş teslim edilip alıcı onaylayana veya 72 saatlik itiraz penceresi dolana kadar lisanslı havuzda tutulur.
                </p>
              </div>
            </div>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">4</span>
              72 Saatlik İtiraz Penceresi ve Otomatik Aktarım
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Tedarikçi firma işi/makineyi şantiyede teslim ettiğinde platform üzerinden <strong>&quot;İşi Teslim Ettim&quot;</strong> bildiriminde bulunur. Bildirim anından itibaren alıcı için <strong>72 saatlik (3 iş günü)</strong> kontrol süresi başlar. Alıcı bu sürede <strong>&quot;İşi Onayla&quot;</strong> butonuna basarak erken onay verebilir veya süre bittiğinde sistem ödemeyi otomatik olarak tedarikçinin IBAN&apos;ına aktarır.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-base font-black text-navy-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 text-xs flex items-center justify-center font-bold">5</span>
              İtiraz Masası ve Uyuşmazlık Çözümü
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Alıcı şantiyede eksik veya ayıplı ifa tespit ederse <strong>&quot;Sorun Bildir&quot;</strong> adımıyla itiraz açar. İtiraz açıldığı anda geri sayım sayacı durur ve para havuzda bloke kalmaya devam eder. Şantiye Go İtiraz Masası puantaj, servis formu ve fotoğrafları inceleyerek haklı tarafa aktarım veya iade kararı verir.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
