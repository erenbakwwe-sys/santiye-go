import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  PhoneCall,
  MessageCircle,
  Calendar,
  Layers,
  Wrench,
  Truck,
  Fuel,
  ArrowLeft,
  Share2,
} from 'lucide-react';
import { getListingBySlugOrId } from '@/lib/services/listing-service';
import { getCompanyReviews } from '@/lib/services/review-service';
import ListingMap from '@/components/map/ListingMap';
import ListingActionBox from '@/components/listings/ListingActionBox';
import ReviewList from '@/components/reviews/ReviewList';

interface ListingPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = await getListingBySlugOrId(id);
  if (!listing) return { title: 'İlan Bulunamadı | ŞANTİYE GO' };

  return {
    title: `${listing.title} | ŞANTİYE GO`,
    description: listing.description.slice(0, 160),
  };
}

export default async function ListingDetailPage({ params }: ListingPageProps) {
  const { id } = await params;
  const listing = await getListingBySlugOrId(id);

  if (!listing) {
    notFound();
  }

  const reviews = await getCompanyReviews(listing.company_id || 'f0000000-0000-0000-0000-000000000001');

  const companyPhone = listing.company?.phone || '+905320000000';
  const whatsappNumber = (listing.company?.whatsapp || companyPhone).replace(/[^0-9]/g, '');

  const whatsappMessage = encodeURIComponent(
    `Merhaba, Şantiye GO üzerinden "${listing.title}" başlıklı ilanınız hakkında bilgi ve teklif almak istiyorum.`
  );

  return (
    <div className="bg-slate-50 min-h-screen py-6 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/ilanlar"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            İlan Listesine Geri Dön
          </Link>
          <div className="flex items-center gap-2">
            {listing.is_demo && (
              <span className="px-2.5 py-1 rounded bg-red-600 text-white text-xs font-black tracking-wider uppercase">
                DEMO İLAN
              </span>
            )}
            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wide text-white ${
                listing.listing_type === 'rental' ? 'bg-navy-900' : 'bg-emerald-700'
              }`}
            >
              {listing.listing_type === 'rental' ? 'Kiralık' : 'Satılık'}
            </span>
          </div>
        </div>

        {/* Title & Location Header */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-semibold">
            <span className="px-2.5 py-1 rounded-md bg-orange-50 text-orange-700 font-bold">
              {listing.category?.name || 'Genel'}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-slate-700">
              <MapPin className="w-3.5 h-3.5 text-orange-500" />
              {listing.city_name || 'Türkiye'}
              {listing.district_name ? `, ${listing.district_name}` : ''}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-navy-900 leading-tight">
            {listing.title}
          </h1>
        </div>

        {/* Main Content Grid: Left (Images & Details) vs Right (Pricing & Action Card) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Main Photo Gallery */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="relative aspect-[16/10] sm:aspect-[16/9] bg-slate-100">
                <Image
                  src={
                    listing.images?.[0] ||
                    'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=1200&q=80'
                  }
                  alt={listing.title}
                  fill
                  priority
                  className="object-cover"
                />
              </div>

              {listing.images && listing.images.length > 1 && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 flex gap-2 overflow-x-auto">
                  {listing.images.map((img, idx) => (
                    <div
                      key={idx}
                      className="relative w-20 h-14 rounded-lg overflow-hidden border-2 border-slate-300 shrink-0"
                    >
                      <Image
                        src={img}
                        alt={`${listing.title} ${idx + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Inclusions Strip */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
              <h2 className="text-xs font-black text-slate-500 uppercase tracking-wider mb-3">
                Hizmet & Fiyat Kapsamı
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div
                  className={`p-3 rounded-xl border flex items-center gap-3 ${
                    listing.is_operator_included
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <Wrench
                    className={`w-5 h-5 ${
                      listing.is_operator_included ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">Operatör</div>
                    <div className="text-[11px] font-semibold">
                      {listing.is_operator_included ? 'Fiyata Dahil' : 'Hariç'}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center gap-3 ${
                    listing.is_fuel_included
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <Fuel
                    className={`w-5 h-5 ${
                      listing.is_fuel_included ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">Yakıt</div>
                    <div className="text-[11px] font-semibold">
                      {listing.is_fuel_included ? 'Fiyata Dahil' : 'Hariç'}
                    </div>
                  </div>
                </div>

                <div
                  className={`p-3 rounded-xl border flex items-center gap-3 ${
                    listing.is_transport_included
                      ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-500'
                  }`}
                >
                  <Truck
                    className={`w-5 h-5 ${
                      listing.is_transport_included ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <div>
                    <div className="text-xs font-bold">Şantiye Nakliyesi</div>
                    <div className="text-[11px] font-semibold">
                      {listing.is_transport_included ? 'Fiyata Dahil' : 'Hariç'}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <h2 className="text-base font-extrabold text-navy-900 border-b border-slate-100 pb-2">
                İlan Açıklaması
              </h2>
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
                {listing.description}
              </div>
            </div>

            {/* Technical Specs Table */}
            {listing.technical_specs && Object.keys(listing.technical_specs).length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
                <h2 className="text-base font-extrabold text-navy-900 border-b border-slate-100 pb-2 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-orange-500" />
                  Teknik Özellikler
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  {Object.entries(listing.technical_specs).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between py-2 border-b border-slate-100 text-xs sm:text-sm"
                    >
                      <span className="font-semibold text-slate-500 capitalize">
                        {key.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-navy-900">{String(val)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Map Location */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  Şantiye / Makine Konumu
                </h2>
                <span className="text-xs text-slate-500 font-semibold">
                  {listing.city_name || ''} {listing.district_name ? `- ${listing.district_name}` : ''}
                </span>
              </div>
              <ListingMap
                listings={[listing]}
                center={[listing.lat, listing.lng]}
                zoom={13}
                height="320px"
              />
            </div>

            {/* Verified Reviews Section */}
            <ReviewList
              reviews={reviews}
              companyName={listing.company?.name || 'Onaylı Tedarikçi'}
            />
          </div>

          {/* Right Column (4 cols): Sticky Pricing, Booking & Direct Contact */}
          <div className="lg:col-span-4 space-y-5 lg:sticky lg:top-24">
            <ListingActionBox listing={listing} />

            {/* Company Profile Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-navy-900 text-orange-500 flex items-center justify-center font-black text-xl">
                  {listing.company?.name?.[0] || 'Ş'}
                </div>
                <div>
                  <h3 className="font-extrabold text-navy-900 text-sm sm:text-base leading-snug">
                    {listing.company?.name || 'Onaylı Şantiye GO Tedarikçisi'}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-emerald-600 font-bold mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                    Doğrulanmış Firma
                  </div>
                </div>
              </div>

              <div className="text-xs text-slate-500 space-y-1 pt-2 border-t border-slate-100">
                <div>
                  <strong>İlan No:</strong> #{listing.id.slice(0, 8)}
                </div>
                <div>
                  <strong>Yayın Tarihi:</strong>{' '}
                  {new Date(listing.created_at).toLocaleDateString('tr-TR')}
                </div>
                <div>
                  <strong>Konum:</strong> {listing.city_name || ''},{' '}
                  {listing.district_name || ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
