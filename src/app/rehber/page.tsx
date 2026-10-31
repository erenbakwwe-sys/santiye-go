import { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, Calendar, ArrowRight, Tag } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Şantiye & İnşaat Rehberi | Şantiye GO',
  description: 'İş makinesi kiralama, iskele mevzuatı, hakediş ve şantiye yönetim rehberleri.',
  alternates: {
    canonical: 'https://santiyego.com/rehber',
  },
};

// Guide articles placeholder array (infrastructure only, no fake content produced)
const SAMPLE_GUIDES: Array<{
  slug: string;
  title: string;
  summary: string;
  category: string;
  readTimeMin: number;
  date: string;
}> = [
  {
    slug: 'is-makinesi-kiralarken-dikkat-edilmesi-gerekenler',
    title: 'Şantiyede İş Makinesi Kiralarken Dikkat Edilmesi Gereken 7 Yasal Kural',
    summary: 'Operatör belgeleri, periyodik muayene raporları, nakliye sorumluluğu ve kira sözleşmesi maddeleri hakkında kapsamlı rehber.',
    category: 'Mevzuat & Güvenlik',
    readTimeMin: 6,
    date: '2026-10-15',
  },
  {
    slug: 'guvenlikli-cephe-iskelesi-tse-normlari',
    title: 'TSE EN 12810 Güvenlikli Dış Cephe İskelesi Standartları ve Kurulum Kriterleri',
    summary: 'İş sağlığı ve güvenliği tebliğine göre flanşlı ve kamalı iskele sistemlerinde montaj ve söküm esasları.',
    category: 'İskele & Platform',
    readTimeMin: 8,
    date: '2026-10-20',
  },
];

export default function GuideIndexPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-black uppercase tracking-wider">
            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
            <span>Şantiye GO Akademi & Rehber</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-navy-900 tracking-tight">
            Şantiye Yönetimi ve Ekipman Rehberi
          </h1>
          <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
            Müteahhitler, şantiye şefleri ve makine parkı sahipleri için yasal mevzuat, teknik karşılaştırmalar ve verimlilik kılavuzları.
          </p>
        </div>

        {/* Guides List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {SAMPLE_GUIDES.map((guide) => (
            <article
              key={guide.slug}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                    {guide.category}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {guide.date}
                  </span>
                </div>
                <h2 className="text-lg font-black text-navy-900 hover:text-orange-600 transition leading-snug">
                  <Link href={`/rehber/${guide.slug}`}>{guide.title}</Link>
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {guide.summary}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold">
                <span className="text-slate-400">{guide.readTimeMin} dk okuma</span>
                <Link
                  href={`/rehber/${guide.slug}`}
                  className="text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <span>Rehberi Oku</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
