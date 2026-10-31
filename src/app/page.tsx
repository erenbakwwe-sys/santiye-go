import Link from 'next/link';
import {
  Wrench,
  Boxes,
  Truck,
  Layers,
  ChevronsUp,
  HardHat,
  Hammer,
  ArrowRight,
  Sparkles,
  MapPin,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import HeroSearch from '@/components/search/HeroSearch';
import ListingCard from '@/components/listings/ListingCard';
import { CATEGORIES, DEMO_LISTINGS } from '@/lib/mock-data';
import { getActiveAdsForSlot } from '@/lib/services/ad-service';

export default function HomePage() {
  const { listings: showcaseListings } = getActiveAdsForSlot({
    productId: 'showcase_home',
    limit: 3,
  });

  const nearbyListings = DEMO_LISTINGS.slice(0, 3);
  const newestListings = [...DEMO_LISTINGS].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  ).slice(0, 3);

  const categoryIcons: Record<string, React.ReactNode> = {
    'is-makineleri': <Wrench className="w-8 h-8 text-orange-500" />,
    'yapi-malzemeleri': <Boxes className="w-8 h-8 text-orange-500" />,
    'nakliye': <Truck className="w-8 h-8 text-orange-500" />,
    'iskele-kalip': <Layers className="w-8 h-8 text-orange-500" />,
    'asansor-platform': <ChevronsUp className="w-8 h-8 text-orange-500" />,
    'santiye-ekipmanlari': <HardHat className="w-8 h-8 text-orange-500" />,
    'insaat-hizmetleri': <Hammer className="w-8 h-8 text-orange-500" />,
  };

  const categoryDescriptions: Record<string, string> = {
    'is-makineleri': 'Ekskavatör, JCB, dozer, vinç ve operatörlü kiralama',
    'yapi-malzemeleri': 'Çimento, hazır beton, inşaat demiri, tuğla ve yalıtım',
    'nakliye': 'Hafriyat kamyonu, lowbed ağır nakliye ve vinç taşımacılığı',
    'iskele-kalip': 'Güvenlikli cephe iskelesi, kule iskele, endüstriyel kalıp ve montaj',
    'asansor-platform': 'İnşaat cephe asansörleri, manlift, makaslı ve eklemli platformlar',
    'santiye-ekipmanlari': 'Şantiye konteynerleri, dizel jeneratörler, aydınlatma ve İSG',
    'insaat-hizmetleri': 'Hafriyat, temel kazısı, beton dökümü, mantolama ve mühendislik',
  };

  return (
    <div className="space-y-12 sm:space-y-16 pb-16">
      {/* 1. Hero Search Banner */}
      <HeroSearch />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-14 sm:space-y-18">
        {/* 2. Popüler Kategoriler */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <span className="text-xs font-black text-orange-600 uppercase tracking-wider">
                Geniş Tedarik Ağı
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                Popüler Kategoriler
              </h2>
            </div>
            <Link
              href="/ilanlar"
              className="text-xs font-extrabold text-navy-900 hover:text-orange-600 flex items-center gap-1 group transition"
            >
              <span>Tüm Kategorileri İncele</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {CATEGORIES.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="w-14 h-14 rounded-xl bg-orange-50 flex items-center justify-center border border-orange-100 group-hover:scale-110 transition-transform">
                    {categoryIcons[cat.slug] || <Wrench className="w-8 h-8 text-orange-500" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-navy-900 group-hover:text-orange-600 transition">
                      {cat.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      {categoryDescriptions[cat.slug] || 'Şantiye ekipmanı, malzeme ve inşaat hizmetleri'}
                    </p>
                  </div>

                  {/* Subcategory Pills */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {cat.subcategories?.slice(0, 4).map((sub) => (
                      <Link
                        key={sub.id}
                        href={`/ilanlar?category=${sub.slug}`}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-orange-100 hover:text-orange-700 text-slate-600 text-[11px] font-semibold transition"
                      >
                        {sub.name}
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/ilanlar?category=${cat.slug}`}
                  className="pt-3 border-t border-slate-100 text-xs font-bold text-navy-900 hover:text-orange-600 flex items-center justify-between"
                >
                  <span>İlanları Gör</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* 2.5. Vitrin İlanları (Öne Çıkanlar) */}
        {showcaseListings.length > 0 && (
          <section className="space-y-6 p-6 rounded-3xl bg-gradient-to-r from-amber-50/60 via-orange-50/30 to-slate-50 border border-amber-200/80 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-amber-200/60 pb-4">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-black text-amber-950 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  <span>Şantiye Vitrini • Sponsorlu</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                  Haftanın Öne Çıkan Makineleri & Tedarikçileri
                </h2>
              </div>
              <Link
                href="/ilanlar"
                className="text-xs font-extrabold text-navy-900 hover:text-orange-600 flex items-center gap-1 group transition"
              >
                <span>Tüm Vitrin İlanları</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {showcaseListings.map((item) => (
                <ListingCard key={`showcase-${item.id}`} listing={item} />
              ))}
            </div>
          </section>
        )}

        {/* 3. Yakınımdaki İlanlar */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-orange-600 uppercase tracking-wider">
                <MapPin className="w-4 h-4" />
                <span>Gerçek PostGIS Konum Algoritması</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                Yakınımdaki İlanlar
              </h2>
            </div>
            <Link
              href="/ilanlar?sort=distance"
              className="text-xs font-extrabold text-navy-900 hover:text-orange-600 flex items-center gap-1 group transition"
            >
              <span>Tüm Yakındaki İlanlar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {nearbyListings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>

        {/* 4. Yeni Eklenen İlanlar */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-slate-200 pb-4">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-black text-orange-600 uppercase tracking-wider">
                <Sparkles className="w-4 h-4" />
                <span>Güncel Pazar Fırsatları</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
                Yeni Eklenen İlanlar
              </h2>
            </div>
            <Link
              href="/ilanlar?sort=newest"
              className="text-xs font-extrabold text-navy-900 hover:text-orange-600 flex items-center gap-1 group transition"
            >
              <span>Tüm Yeni İlanlar</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {newestListings.map((item) => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
