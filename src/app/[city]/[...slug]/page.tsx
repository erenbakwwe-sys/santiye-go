import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MapPin, Sparkles, PlusCircle, ArrowRight } from 'lucide-react';
import { searchListings } from '@/lib/services/listing-service';
import { findCityBySlug, findDistrictBySlug, findCategoryBySlug } from '@/lib/seo/slug';
import { getBreadcrumbSchema } from '@/lib/seo/jsonld';
import ListingCard from '@/components/listings/ListingCard';

interface Props {
  params: Promise<{
    city: string;
    slug: string[];
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { city: citySlug, slug } = await params;
  const city = findCityBySlug(citySlug);

  if (!city || !slug || (slug.length !== 1 && slug.length !== 2)) {
    return { title: 'Sayfa Bulunamadı | Şantiye GO' };
  }

  // 1-segment: /[city]/[category]
  if (slug.length === 1) {
    const catSlug = slug[0];
    const category = findCategoryBySlug(catSlug);
    if (!category) return { title: 'Sayfa Bulunamadı | Şantiye GO' };

    const res = await searchListings({
      city: city.id,
      category: category.slug,
      limit: 1,
    });

    const hasListings = res.total > 0;
    const title = `${city.name} ${category.name} Kiralama ve Fiyatları | Şantiye GO`;
    const description = `${city.name} genelinde uygun fiyatlı ve garantili ${category.name} ilanlarını karşılaştırın, doğrudan firmalardan teklif alın.`;
    const canonicalUrl = `https://santiyego.com/${citySlug}/${catSlug}`;

    return {
      title,
      description,
      alternates: { canonical: canonicalUrl },
      robots: hasListings ? { index: true, follow: true } : { index: false, follow: true },
      openGraph: {
        title,
        description,
        url: canonicalUrl,
        type: 'website',
        siteName: 'Şantiye GO',
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    };
  }

  // 2-segment: /[city]/[district]/[category]
  const distSlug = slug[0];
  const catSlug = slug[1];
  const district = findDistrictBySlug(distSlug, city.id);
  const category = findCategoryBySlug(catSlug);

  if (!district || !category) {
    return { title: 'Sayfa Bulunamadı | Şantiye GO' };
  }

  const res = await searchListings({
    city: city.id,
    district: district.id,
    category: category.slug,
    limit: 1,
  });

  const hasListings = res.total > 0;
  const title = `${city.name} ${district.name} ${category.name} Kiralık & Satılık | Şantiye GO`;
  const description = `${city.name} ${district.name} şantiyeleri için en yakın ${category.name} ilanlarını listeleyin, mesafeye göre kıyaslayın.`;
  const canonicalUrl = `https://santiyego.com/${citySlug}/${distSlug}/${catSlug}`;

  return {
    title,
    description,
    alternates: { canonical: canonicalUrl },
    robots: hasListings ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      type: 'website',
      siteName: 'Şantiye GO',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}

export default async function ProgrammaticCatchAllPage({ params }: Props) {
  const { city: citySlug, slug } = await params;
  const city = findCityBySlug(citySlug);

  if (!city || !slug || (slug.length !== 1 && slug.length !== 2)) {
    notFound();
  }

  // CASE 1: City + Category (1 segment: /[city]/[category])
  if (slug.length === 1) {
    const catSlug = slug[0];
    const category = findCategoryBySlug(catSlug);
    if (!category) notFound();

    const res = await searchListings({
      city: city.id,
      category: category.slug,
      limit: 24,
    });

    const listings = res.listings;
    const breadcrumbItems = [
      { name: 'Ana Sayfa', url: '/' },
      { name: city.name, url: `/ilanlar?city=${city.id}` },
      { name: category.name, url: `/${citySlug}/${catSlug}` },
    ];
    const breadcrumbSchema = getBreadcrumbSchema(breadcrumbItems);

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
        />

        <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <nav className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
              <Link href="/" className="hover:text-navy-900">Ana Sayfa</Link>
              <span>/</span>
              <Link href={`/ilanlar?city=${city.id}`} className="hover:text-navy-900">{city.name}</Link>
              <span>/</span>
              <span className="text-orange-600 font-bold">{category.name}</span>
            </nav>

            <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-3">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-black uppercase tracking-wider border border-orange-100">
                <MapPin className="w-3.5 h-3.5 text-orange-500" />
                <span>{city.name} Bölgesi</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-black text-navy-900 tracking-tight">
                {city.name} {category.name} İlanları & Fiyatları
              </h1>
              <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
                {city.name} ve çevre şantiye bölgelerinde hizmet veren onaylı tedarikçilerden günlük, haftalık ve aylık {category.name.toLowerCase()} seçeneklerini inceleyin veya ücretsiz çoklu teklif isteyin.
              </p>
            </div>

            {listings.length === 0 ? (
              <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-xl font-black text-navy-900">
                    {city.name} Bölgesinde Henüz Aktif {category.name} İlanı Yok
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                    Endişelenmeyin! İhtiyacınızı ve çalışma sürenizi belirtin, {city.name} ve çevre illerdeki uygun makine sahipleri ve taşeronlar size 24 saat içinde en iyi tekliflerini iletsin.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href={`/teklif-iste?city=${city.id}&category=${category.slug}`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 transition active:scale-95"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Ücretsiz Teklif Talebi Oluştur</span>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b pb-2">
                  <span>{city.name} içinde listelenen {listings.length} ilan bulundu</span>
                  <Link href={`/ilanlar?city=${city.id}&category=${category.slug}`} className="text-orange-600 hover:underline flex items-center gap-1">
                    <span>Filtreleri Geliştir</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {listings.map((listing) => (
                    <ListingCard key={listing.id} listing={listing} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  // CASE 2: City + District + Category (2 segments: /[city]/[district]/[category])
  const distSlug = slug[0];
  const catSlug = slug[1];
  const district = findDistrictBySlug(distSlug, city.id);
  const category = findCategoryBySlug(catSlug);

  if (!district || !category) {
    notFound();
  }

  const res = await searchListings({
    city: city.id,
    district: district.id,
    category: category.slug,
    limit: 24,
  });

  const listings = res.listings;
  const breadcrumbItems = [
    { name: 'Ana Sayfa', url: '/' },
    { name: city.name, url: `/ilanlar?city=${city.id}` },
    { name: district.name, url: `/ilanlar?city=${city.id}&district=${district.id}` },
    { name: category.name, url: `/${citySlug}/${distSlug}/${catSlug}` },
  ];
  const breadcrumbSchema = getBreadcrumbSchema(breadcrumbItems);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-6">
          <nav className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
            <Link href="/" className="hover:text-navy-900">Ana Sayfa</Link>
            <span>/</span>
            <Link href={`/${citySlug}/${catSlug}`} className="hover:text-navy-900">{city.name}</Link>
            <span>/</span>
            <span className="text-slate-700">{district.name}</span>
            <span>/</span>
            <span className="text-orange-600 font-bold">{category.name}</span>
          </nav>

          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-black uppercase tracking-wider border border-orange-100">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              <span>{city.name} • {district.name}</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-navy-900 tracking-tight">
              {city.name} {district.name} {category.name} İlanları
            </h1>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              {district.name} şantiyeleri ve projeleri için en yakın ve nakliye avantajlı {category.name.toLowerCase()} tedarikçilerini görüntüleyin.
            </p>
          </div>

          {listings.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-10 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto shadow-inner">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-black text-navy-900">
                  {district.name} İlçesinde Henüz Doğrudan İlan Bulunamadı
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
                  {city.name} geneli veya çevre ilçelerden {district.name} şantiyenize nakliye dahil makine ve malzeme yönlendirebiliriz. Hemen tek tıkla talep açın.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href={`/teklif-iste?city=${city.id}&district=${district.id}&category=${category.slug}`}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/20 transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>{district.name} İçin Teklif Talep Et</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b pb-2">
                <span>{district.name} içinde listelenen {listings.length} ilan bulundu</span>
                <Link href={`/ilanlar?city=${city.id}&district=${district.id}&category=${category.slug}`} className="text-orange-600 hover:underline flex items-center gap-1">
                  <span>Filtreleri Geliştir</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {listings.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
