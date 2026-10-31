'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, SlidersHorizontal } from 'lucide-react';
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

  return (
    <div className="relative bg-gradient-to-b from-navy-900 via-navy-900 to-navy-950 text-white py-12 md:py-20 px-4 overflow-hidden border-b border-navy-800">
      {/* Background Architectural Grid */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(#F97316 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="relative max-w-5xl mx-auto text-center space-y-6">
        {/* Badges / Slogan */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-navy-800 border border-slate-700/80 text-xs font-semibold text-orange-400 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
          Akıllı şantiye ve yapı marketiniz
        </div>

        {/* Main Title Required */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-none">
          Şantiyeniz için ihtiyacınız olan <br className="hidden sm:inline" />
          <span className="text-orange-500">her şey tek yerde!</span>
        </h1>

        {/* Promise */}
        <p className="text-slate-300 text-sm sm:text-base md:text-lg max-w-2xl mx-auto font-normal">
          &quot;Aradığın her şey, sana en yakın yerde, en iyi tekliflerle!&quot;
        </p>

        {/* Big Search Form Box */}
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow-2xl p-3.5 sm:p-5 text-navy-900 max-w-4xl mx-auto border-2 border-slate-200/80"
        >
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            {/* Input 1: "Ne arıyorsunuz?" */}
            <div className="md:col-span-5 relative text-left">
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1 pl-1">
                Ne arıyorsunuz?
              </label>
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Ekskavatör, Çimento, Lowbed, JCB, Demir..."
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-navy-900 placeholder:text-slate-400 rounded-xl text-sm font-medium border border-slate-200 focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 focus:outline-none transition"
                />
              </div>
            </div>

            {/* Input 2: Location Autocomplete */}
            <div className="md:col-span-4 text-left">
              <LocationAutocomplete
                valueLabel={locationData?.label || ''}
                onSelectLocation={(data) => setLocationData(data)}
              />
            </div>

            {/* Button: "HEMEN ARA" */}
            <div className="md:col-span-3">
              <button
                type="submit"
                className="w-full py-3.5 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-base tracking-wide shadow-lg shadow-orange-500/30 active:scale-[0.98] transition flex items-center justify-center gap-2 uppercase"
              >
                <Search className="w-5 h-5" />
                <span>HEMEN ARA</span>
              </button>
            </div>
          </div>

          {/* Distance Radius Selector */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600 gap-2 px-1">
            <div className="flex items-center gap-1.5 font-bold text-navy-900">
              <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
              <span>Arama Yarıçapı (PostGIS):</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { label: '5 km', val: '5' },
                { label: '10 km', val: '10' },
                { label: '25 km (Varsayılan)', val: '25' },
                { label: '50 km', val: '50' },
                { label: '100 km', val: '100' },
                { label: 'Tüm Türkiye', val: 'all' },
              ].map((item) => (
                <button
                  key={item.val}
                  type="button"
                  onClick={() => setRadius(item.val)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                    radius === item.val
                      ? 'bg-orange-500 text-white shadow-sm font-bold'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </form>

        {/* Quick Popular Tags */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-medium text-slate-400">
          <span className="text-slate-300">Popüler Şantiye Aramaları:</span>
          {[
            'Ekskavatör',
            'Samsun OSB',
            'Ostim Kepçe',
            'Tuzla Vinç',
            'Hazır Beton',
            'Lowbed Nakliye',
            'Nervürlü Demir',
          ].map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setKeyword(tag);
                router.push(`/ilanlar?q=${encodeURIComponent(tag)}`);
              }}
              className="px-2.5 py-1 rounded-full bg-navy-800/80 hover:bg-navy-700 border border-slate-700 text-slate-300 hover:text-white transition"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
