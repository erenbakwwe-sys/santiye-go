import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, Clock, Share2, BookOpen } from 'lucide-react';
import { getBreadcrumbSchema } from '@/lib/seo/jsonld';
import { getGuide } from '../articles';
import { formatRehberDate } from '@/lib/utils/rehber-format';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: 'Rehber bulunamadı | ŞantiyeGO' };
  return {
    title: `${guide.title} | ŞantiyeGO Rehber`,
    description: guide.summary,
    alternates: {
      canonical: `https://santiyego.com/rehber/${slug}`,
    },
  };
}

export default async function GuideDetailPage({ params }: Props) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const breadcrumbItems = [
    { name: 'Ana Sayfa', url: '/' },
    { name: 'Rehber', url: '/rehber' },
    { name: guide.title, url: `/rehber/${slug}` },
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
            <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 text-xs font-black">
              {guide.category}
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight leading-snug">
              {guide.title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatRehberDate(guide.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {guide.readTimeMin} dk okuma
              </span>
            </div>
          </header>

          <div className="prose prose-slate max-w-none text-xs sm:text-sm leading-relaxed space-y-4 text-slate-700">
            {guide.body}
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
