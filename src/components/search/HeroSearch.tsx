'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';

export default function HeroSearch() {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [radius, setRadius] = useState('25'); // Default 25 km as requested in Prompt 2
  const [locationData, setLocationData] = useState<{
    lat: number;
    lng: number;
    cityId?: number;
    districtId?: number;
    neighborhoodId?: number;
    postalCode?: string;
    label: string;
  } | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const params = new URLSearchParams();
    if (keyword.trim()) params.set('q', keyword.trim());

    if (locationData) {
      params.set('lat', locationData.lat.toFixed(5));
      params.set('lng', locationData.lng.toFixed(5));
      if (radius && radius !== 'all') {
        params.set('radius', radius);
      }
      if (locationData.cityId) params.set('city', String(locationData.cityId));
      if (locationData.districtId) params.set('district', String(locationData.districtId));
      if (locationData.neighborhoodId) params.set('neighborhood', String(locationData.neighborhoodId));
      if (locationData.postalCode) params.set('postal_code', locationData.postalCode);
      if (locationData.label) params.set('location_label', locationData.label);
    }

    router.push(`/ilanlar?${params.toString()}`);
  };

  const radiusOptions = [
    { label: '10 km', val: '10' },
    { label: '25 km', val: '25' },
    { label: '50 km', val: '50' },
    { label: '100 km', val: '100' },
    { label: 'Tüm Türkiye', val: 'all' },
  ];

  const popular = ['Ekskavatör', 'Beko loder', 'Mobil vinç', 'Hazır beton', 'Nervürlü demir', 'Lowbed', 'Cephe iskelesi'];

  return (
    <section className="bg-navy-900 text-white border-b-4 border-orange-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-7 pb-8 md:pt-16 md:pb-16">
        <div className="max-w-3xl">
          <h1 className="text-2xl leading-tight sm:text-4xl md:text-[44px] md:leading-[1.1] font-semibold tracking-tight">
            İş makinesi, yapı malzemesi ve nakliye için Türkiye&apos;nin şantiye pazaryeri
          </h1>
          <p className="hidden sm:block mt-4 text-base md:text-lg text-slate-300 max-w-2xl leading-relaxed">
            Size en yakın firmaların ilanlarını inceleyin ya da tek bir taleple birden fazla firmadan fiyat alın.
          </p>
        </div>

        <form onSubmit={handleSearch} className="mt-5 sm:mt-8 bg-white rounded-md p-2 text-navy-900 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-[1.3fr_1fr_auto_auto] gap-2">
            <div className="relative flex items-center">
              <Search
                className="w-[18px] h-[18px] text-slate-400 absolute left-3 pointer-events-none"
                strokeWidth={1.75}
              />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Ne arıyorsunuz? Örn. ekskavatör, hazır beton"
                aria-label="Ne arıyorsunuz?"
                className="w-full h-12 pl-10 pr-3 bg-white text-navy-900 placeholder:text-slate-400 rounded-md text-base border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 focus:outline-none transition-colors"
              />
            </div>

            <LocationAutocomplete
              compact
              valueLabel={locationData?.label || ''}
              onSelectLocation={(data) => setLocationData(data)}
              inputClassName="w-full h-12 pl-10 pr-16 bg-white text-navy-900 placeholder:text-slate-400 rounded-md text-base border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 focus:outline-none transition-colors"
            />

            <select
              value={radius}
              onChange={(e) => setRadius(e.target.value)}
              aria-label="Mesafe"
              className="h-12 px-3 pr-8 bg-white text-navy-900 rounded-md text-base border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 focus:outline-none"
            >
              {radiusOptions.map((o) => (
                <option key={o.val} value={o.val}>
                  {o.val === 'all' ? o.label : `${o.label} içinde`}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="h-12 px-7 rounded-md bg-orange-500 hover:bg-orange-600 text-white font-semibold text-base transition-colors flex items-center justify-center gap-2"
            >
              <Search className="w-[18px] h-[18px]" strokeWidth={2} />
              İlan ara
            </button>
          </div>
        </form>

        <div className="hidden sm:flex mt-5 flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-slate-400">Sık arananlar:</span>
          {popular.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                setKeyword(tag);
                router.push(`/ilanlar?q=${encodeURIComponent(tag)}`);
              }}
              className="text-slate-200 hover:text-white underline-offset-4 hover:underline"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
