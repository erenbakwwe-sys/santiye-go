import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Share2, BookOpen } from 'lucide-react';
import { getBreadcrumbSchema } from '@/lib/seo/jsonld';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const title = `${slug.replace(/-/g, ' ').toUpperCase()} | Şantiye GO Rehber`;
  return {
    title,
    description: 'Şantiye ekipman kiralama ve mevzuat bilgilendirme rehberi.',
    alternates: {
      canonical: `https://santiyego.com/rehber/${slug}`,
    },
  };
}

export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params;

  const breadcrumbItems = [
    { name: 'Ana Sayfa', url: '/' },
    { name: 'Rehber', url: '/rehber' },
    { name: slug, url: `/rehber/${slug}` },
  ];
  const breadcrumbSchema = getBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
        <article className="max-w-3xl mx-auto space-y-8 bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-sm">
          {/* Back link */}
          <Link
            href="/rehber"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tüm Rehberlere Dön</span>
          </Link>

          <header className="space-y-4 border-b border-slate-100 pb-6">
            <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-black uppercase tracking-wider">
              Mevzuat & Standartlar
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight leading-snug">
              Şantiye Ekipmanı ve Makine Kiralama Rehberi
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                2026-10-20
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                6 dk okuma
              </span>
            </div>
          </header>

          <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-4 text-slate-700">
            <p>
              İnşaat projelerinde doğru makine ve ekipmanın seçilmesi, şantiye bütçesinin ve iş programının korunmasındaki en kritik faktördür. Operatörlü kiralamalarda G sınıfı ehliyet ve SRC belgesi zorunluluğu, akaryakıt anlaşması ve şantiyeye nakliye organizasyonu kira başlangıcında netleştirilmelidir.
            </p>
            <h2 className="text-base sm:text-lg font-black text-navy-900 mt-6 mb-2">
              1. Periyodik Kontrol ve Muayene Raporları
            </h2>
            <p>
              İş Ekipmanlarının Kullanımında Sağlık ve Güvenlik Şartları Yönetmeliği uyarınca vinç, platform, ekskavatör ve kaldırma iletme araçlarının yılda en az bir kez akredite mühendislerce kontrol edilmiş olması ve geçerli raporunun bulunması kanuni zorunluluktur.
            </p>
          </div>

          <footer className="pt-6 border-t border-slate-100 flex items-center justify-between">
            <Link
              href="/teklif-iste"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition"
            >
              Hemen İhtiyacınız İçin Teklif İsteyin
            </Link>
          </footer>
        </article>
      </div>
    </>
  );
}
