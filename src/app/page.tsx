import Link from 'next/link';
import { shouldShowNearbySection } from '@/lib/utils/listing-display';
import {
  Wrench,
  Boxes,
  Truck,
  Layers,
  ChevronsUp,
  HardHat,
  Hammer,
  ArrowRight,
  Calculator,
  FileSpreadsheet,
  Repeat,
} from 'lucide-react';
import HeroSearch from '@/components/search/HeroSearch';
import ListingCard from '@/components/listings/ListingCard';
import { CATEGORIES } from '@/lib/mock-data';
import { getActiveAdsForSlot } from '@/lib/services/ad-service';
import { searchListings } from '@/lib/services/listing-service';
import type { Listing } from '@/types/database';

const categoryIcons: Record<string, React.ComponentType<{ className?: string; strokeWidth?: number }>> = {
  'is-makineleri': Wrench,
  'yapi-malzemeleri': Boxes,
  nakliye: Truck,
  'iskele-kalip': Layers,
  'asansor-platform': ChevronsUp,
  'santiye-ekipmanlari': HardHat,
  'insaat-hizmetleri': Hammer,
};

function SectionHeader({
  title,
  description,
  href,
  linkLabel,
}: {
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-5">
      <div>
        <h2 className="section-title">{title}</h2>
        {description && <p className="section-sub">{description}</p>}
      </div>
      {href && linkLabel && (
        <Link
          href={href}
          className="shrink-0 text-sm font-medium text-navy-900 hover:text-orange-600 inline-flex items-center gap-1 transition-colors"
        >
          {linkLabel}
          <ArrowRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

function ListingGrid({ listings }: { listings: Listing[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {listings.map((item) => (
        <ListingCard key={item.id} listing={item} />
      ))}
    </div>
  );
}

function EmptyListings({ title, text }: { title: string; text: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md px-6 py-10 sm:flex items-center justify-between gap-6">
      <div>
        <h3 className="font-semibold text-navy-900">{title}</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xl">{text}</p>
      </div>
      <div className="mt-4 sm:mt-0 flex gap-2 shrink-0">
        <Link href="/teklif-iste" className="btn-primary">
          Teklif iste
        </Link>
        <Link href="/kayit?role=company" className="btn-secondary">
          Firma olarak ilan ver
        </Link>
      </div>
    </div>
  );
}

export default async function HomePage() {
  const { listings: showcaseListings } = getActiveAdsForSlot({
    productId: 'showcase_home',
    limit: 3,
  });

  const nearbyRes = await searchListings({ sort: 'distance', limit: 3 });
  const newestRes = await searchListings({ sort: 'newest', limit: 6 });

  const nearbyListings = nearbyRes.listings;
  const newestListings = newestRes.listings;
  const showNearby = shouldShowNearbySection(nearbyListings, newestListings);

  return (
    <div className="pb-16">
      <HeroSearch />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 mt-12">
        {/* Kategoriler */}
        <section>
          <SectionHeader title="Kategoriler" href="/ilanlar" linkLabel="Tüm ilanlar" />
          <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-l border-slate-200 bg-white">
            {CATEGORIES.map((cat) => {
              const Icon = categoryIcons[cat.slug] || Wrench;
              return (
                <div key={cat.id} className="border-r border-b border-slate-200 p-4 sm:p-5 group">
                  <Link
                    href={`/ilanlar?category=${cat.slug}`}
                    className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3"
                  >
                    <Icon className="w-5 h-5 text-orange-500 shrink-0" strokeWidth={1.75} />
                    <h3 className="text-sm sm:text-base font-semibold text-navy-900 leading-snug group-hover:text-orange-600 transition-colors">
                      {cat.name}
                    </h3>
                  </Link>
                  <ul className="hidden sm:block mt-3 space-y-1.5 text-sm">
                    {cat.subcategories?.slice(0, 4).map((sub) => (
                      <li key={sub.id}>
                        <Link
                          href={`/ilanlar?category=${sub.slug}`}
                          className="text-slate-600 hover:text-navy-900 hover:underline underline-offset-2"
                        >
                          {sub.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  {(cat.subcategories?.length || 0) > 4 && (
                    <Link
                      href={`/ilanlar?category=${cat.slug}`}
                      className="hidden sm:inline-block mt-3 text-sm font-medium text-orange-600 hover:text-orange-700"
                    >
                      +{(cat.subcategories?.length || 0) - 4} alt kategori
                    </Link>
                  )}
                </div>
              );
            })}
            <Link
              href="/teklif-iste"
              className="col-span-2 lg:col-span-1 border-r border-b border-slate-200 p-4 sm:p-5 bg-slate-50 hover:bg-slate-100 transition-colors flex flex-col justify-between"
            >
              <div>
                <h3 className="font-semibold text-navy-900">Aradığınızı bulamadınız mı?</h3>
                <p className="text-sm text-slate-600 mt-2">
                  İhtiyacınızı yazın, bölgenizdeki firmalar size fiyat göndersin.
                </p>
              </div>
              <span className="mt-4 text-sm font-medium text-orange-600 inline-flex items-center gap-1">
                Teklif iste <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>
        </section>

        {showcaseListings.length > 0 && (
          <section>
            <SectionHeader title="Öne çıkan ilanlar" description="Sponsorlu" />
            <ListingGrid listings={showcaseListings} />
          </section>
        )}

        {/* Yakındaki ilanlar: yalnız son eklenenlerden farklıysa gösterilir */}
        {showNearby && (
          <section>
            <SectionHeader
              title="Size yakın ilanlar"
              description="Konumunuza göre en yakın firmalar"
              href="/ilanlar?sort=distance"
              linkLabel="Tümünü gör"
            />
            <ListingGrid listings={nearbyListings} />
          </section>
        )}

        {/* Teklif akışı */}
        <section className="bg-white border border-slate-200 rounded-md">
          <div className="grid lg:grid-cols-[1fr_1.4fr]">
            <div className="p-6 sm:p-8 lg:border-r border-slate-200">
              <h2 className="section-title">Tek talep, birden fazla teklif</h2>
              <p className="text-slate-600 mt-3 leading-relaxed">
                Makine, malzeme ya da nakliye ihtiyacınızı bir kez yazın. Talebiniz bölgenizde ilgili
                kategoride hizmet veren firmalara iletilir; gelen teklifleri tek ekranda karşılaştırırsınız.
              </p>
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/teklif-iste" className="btn-primary">
                  Teklif talebi oluştur
                </Link>
                <Link href="/kesif-yukle" className="btn-secondary">
                  Keşif listesi yükle
                </Link>
              </div>
            </div>
            <ol className="grid sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-t lg:border-t-0 border-slate-200">
              {[
                ['Talebinizi yazın', 'Ne lazım, ne zaman, nerede? Birkaç dakikanızı alır, ücret alınmaz.'],
                ['Firmalar fiyat versin', 'Talep, yakınınızdaki uygun firmalara iletilir ve teklifler gelir.'],
                ['Karşılaştırıp seçin', 'Fiyatları ve şartları karşılaştırın, uygun teklifi kabul edin.'],
              ].map(([title, text], i) => (
                <li key={title} className="p-6 sm:p-8">
                  <span className="font-mono text-sm text-orange-600">0{i + 1}</span>
                  <h3 className="mt-2 font-semibold text-navy-900">{title}</h3>
                  <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Yeni ilanlar */}
        <section>
          <SectionHeader title="Son eklenen ilanlar" href="/ilanlar?sort=newest" linkLabel="Tümünü gör" />
          {newestListings.length === 0 ? (
            <EmptyListings
              title="Henüz yayında ilan yok"
              text="İlk ilanı siz yayınlayın; bölgenizdeki müteahhit ve şantiyelere ulaşın."
            />
          ) : (
            <ListingGrid listings={newestListings} />
          )}
        </section>

        {/* Araçlar */}
        <section>
          <SectionHeader title="Şantiye araçları" />
          <div className="grid md:grid-cols-3 gap-5">
            {[
              {
                href: '/hesaplayici',
                icon: Calculator,
                title: 'Metraj hesaplayıcı',
                text: 'Beton, demir, duvar ve iskele metrajını hesaplayın; sonucu doğrudan teklif talebine aktarın.',
              },
              {
                href: '/kesif-yukle',
                icon: FileSpreadsheet,
                title: 'Keşif listesi yükleme',
                text: 'Excel veya PDF keşif listenizi yükleyin; kalemler kategorilere göre ilgili tedarikçilere dağıtılır.',
              },
              {
                href: '/santiyeden-santiyeye',
                icon: Repeat,
                title: 'Şantiyeden şantiyeye',
                text: 'Artan malzemenizi satın, boş dönen kamyonlar için yük bulun ya da ilan verin.',
              },
            ].map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group bg-white border border-slate-200 rounded-md p-6 hover:border-slate-400 transition-colors"
              >
                <tool.icon className="w-5 h-5 text-navy-900" strokeWidth={1.75} />
                <h3 className="mt-4 font-semibold text-navy-900 group-hover:text-orange-600 transition-colors">
                  {tool.title}
                </h3>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed">{tool.text}</p>
              </Link>
            ))}
          </div>
        </section>

        {/* Firmalar için */}
        <section className="bg-navy-900 text-white rounded-md px-6 py-8 sm:px-10 sm:py-10 md:flex items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">
              Makinenizi, ürününüzü ya da aracınızı şantiyelere ulaştırın
            </h2>
            <p className="text-slate-300 mt-2 leading-relaxed">
              Firma hesabı açmak ücretsizdir. İlanlarınızı yayınlayın, bölgenizdeki teklif taleplerini görün
              ve doğrudan müşteriyle anlaşın.
            </p>
          </div>
          <div className="mt-6 md:mt-0 flex gap-2 shrink-0">
            <Link href="/kayit?role=company" className="btn-primary">
              Firma hesabı aç
            </Link>
            <Link
              href="/giris?redirect=/firma-paneli/yeni-ilan"
              className="inline-flex items-center justify-center px-4 py-2.5 rounded-md text-sm font-semibold border border-navy-600 text-white hover:bg-navy-800 transition-colors"
            >
              İlan ver
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
