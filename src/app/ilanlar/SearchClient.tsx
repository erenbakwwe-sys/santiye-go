'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Search,
  MapPin,
  Crosshair,
  SlidersHorizontal,
  Map,
  List,
  Columns,
  TableProperties,
  ArrowUpDown,
  Filter,
  X,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  AlertCircle,
  Zap,
} from 'lucide-react';
import ListingCard from '@/components/listings/ListingCard';
import ListingMap from '@/components/map/ListingMap';
import ComparisonTable from '@/components/comparison/ComparisonTable';
import CompareDrawer from '@/components/comparison/CompareDrawer';
import LocationAutocomplete from '@/components/search/LocationAutocomplete';
import { CATEGORIES, CITIES, DISTRICTS } from '@/lib/mock-data';
import { searchListings } from '@/lib/services/listing-service';
import { getCategoryAttributes } from '@/lib/services/attribute-service';
import { CategoryAttribute, Listing, SearchResult } from '@/types/database';
import { getActiveAdsForSlot } from '@/lib/services/ad-service';
import { recordAnalyticsEvent } from '@/lib/services/analytics-service';
import { Sparkles } from 'lucide-react';

export default function SearchClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read URL State
  const qParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const subcategoryParam = searchParams.get('subcategory') || '';
  const cityParam = searchParams.get('city') || '';
  const districtParam = searchParams.get('district') || '';
  const neighborhoodParam = searchParams.get('neighborhood') || '';
  const postalCodeParam = searchParams.get('postal_code') || '';
  const locationLabelParam = searchParams.get('location_label') || '';
  const radiusParam = searchParams.get('radius') || '25'; // Prompt 2: Varsayılan 25 km
  const latParam = searchParams.get('lat') || '';
  const lngParam = searchParams.get('lng') || '';
  const minPriceParam = searchParams.get('min_price') || '';
  const maxPriceParam = searchParams.get('max_price') || '';
  const listingTypeParam = searchParams.get('listing_type') || '';
  const operatorParam = searchParams.get('operator') || '';
  const fuelParam = searchParams.get('fuel') || '';
  const transportParam = searchParams.get('transport') || '';
  const sortParam = (searchParams.get('sort') as 'distance' | 'price_asc' | 'newest') || 'distance';
  const viewParam = (searchParams.get('view') as 'list' | 'map' | 'split' | 'compare') || 'list';
  const pageParam = parseInt(searchParams.get('page') || '1', 10);

  // Local Filter State
  const [keyword, setKeyword] = useState(qParam);
  const [selectedCategory, setSelectedCategory] = useState(categoryParam);
  const [selectedSubcategory, setSelectedSubcategory] = useState(subcategoryParam);
  const [selectedCity, setSelectedCity] = useState(cityParam);
  const [selectedDistrict, setSelectedDistrict] = useState(districtParam);
  const [radius, setRadius] = useState(radiusParam);
  const [minPrice, setMinPrice] = useState(minPriceParam);
  const [maxPrice, setMaxPrice] = useState(maxPriceParam);
  const [listingType, setListingType] = useState(listingTypeParam);
  const [operatorIncluded, setOperatorIncluded] = useState(operatorParam === 'true');
  const [fuelIncluded, setFuelIncluded] = useState(fuelParam === 'true');
  const [transportIncluded, setTransportIncluded] = useState(transportParam === 'true');
  const [dynamicFilters, setDynamicFilters] = useState<Record<string, any>>({});
  const [sort, setSort] = useState(sortParam);
  const [view, setView] = useState<'list' | 'map' | 'split' | 'compare'>(viewParam);

  const [activeCategoryAttributes, setActiveCategoryAttributes] = useState<CategoryAttribute[]>([]);

  useEffect(() => {
    const targetSlug = subcategoryParam || selectedSubcategory || categoryParam || selectedCategory;
    if (targetSlug) {
      getCategoryAttributes(targetSlug).then((attrs) => {
        setActiveCategoryAttributes(attrs || []);
      });
    } else {
      setActiveCategoryAttributes([]);
    }
  }, [categoryParam, selectedCategory, subcategoryParam, selectedSubcategory]);

  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    latParam && lngParam ? { lat: Number(latParam), lng: Number(lngParam) } : null
  );
  const [locationLabel, setLocationLabel] = useState(locationLabelParam);

  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [searchResult, setSearchResult] = useState<SearchResult>({
    listings: [],
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  });
  const [sponsoredListings, setSponsoredListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Compare Selected State (Max 3)
  const [compareIds, setCompareIds] = useState<string[]>([]);

  // Sync with searchParams
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      // Fetch active sponsored listings according to strict geo/category filters
      const { listings: sponsored } = getActiveAdsForSlot({
        productId: 'sponsored_listing',
        categoryId: categoryParam || undefined,
        cityId: cityParam ? Number(cityParam) : undefined,
        limit: 2,
      });
      setSponsoredListings(sponsored);

      const res = await searchListings({
        q: qParam || undefined,
        category: categoryParam || undefined,
        subcategory: subcategoryParam || undefined,
        city: cityParam ? Number(cityParam) : undefined,
        district: districtParam ? Number(districtParam) : undefined,
        neighborhood: neighborhoodParam ? Number(neighborhoodParam) : undefined,
        postal_code: postalCodeParam || undefined,
        radius: radiusParam && radiusParam !== 'all' ? Number(radiusParam) : undefined,
        lat: latParam ? Number(latParam) : undefined,
        lng: lngParam ? Number(lngParam) : undefined,
        min_price: minPriceParam ? Number(minPriceParam) : undefined,
        max_price: maxPriceParam ? Number(maxPriceParam) : undefined,
        listing_type: (listingTypeParam as any) || undefined,
        operator_included: operatorParam ? operatorParam === 'true' : undefined,
        fuel_included: fuelParam ? fuelParam === 'true' : undefined,
        transport_included: transportParam ? transportParam === 'true' : undefined,
        dynamic_filters: Object.keys(dynamicFilters).length > 0 ? dynamicFilters : undefined,
        sort: sortParam,
        page: pageParam,
        limit: view === 'split' ? 8 : 12,
      });

      // Deduplicate: ensure sponsored listings are NOT repeated in organic results
      const sponsoredIds = sponsored.map((s) => s.id);
      const deduplicatedOrganic = res.listings.filter((l) => !sponsoredIds.includes(l.id));

      setSearchResult({
        ...res,
        listings: deduplicatedOrganic,
      });

      // Record search query in analytics
      if (qParam) {
        recordAnalyticsEvent({
          event_type: 'search_query',
          target_type: 'search',
          search_keyword: qParam,
          search_results_count: res.total,
          city_id: cityParam ? Number(cityParam) : undefined,
        });
      }

      setLoading(false);
    }
    loadData();
  }, [
    qParam,
    categoryParam,
    subcategoryParam,
    cityParam,
    districtParam,
    neighborhoodParam,
    postalCodeParam,
    radiusParam,
    latParam,
    lngParam,
    minPriceParam,
    maxPriceParam,
    listingTypeParam,
    operatorParam,
    fuelParam,
    transportParam,
    sortParam,
    pageParam,
    view,
    dynamicFilters,
  ]);

  // Apply filters into URL
  const applyFilters = (overrides: Record<string, string | undefined> = {}) => {
    const params = new URLSearchParams();

    const qVal = overrides.q !== undefined ? overrides.q : keyword;
    const catVal = overrides.category !== undefined ? overrides.category : selectedCategory;
    const subVal = overrides.subcategory !== undefined ? overrides.subcategory : selectedSubcategory;
    const cityVal = overrides.city !== undefined ? overrides.city : selectedCity;
    const distVal = overrides.district !== undefined ? overrides.district : selectedDistrict;
    const radVal = overrides.radius !== undefined ? overrides.radius : radius;
    const sortVal = overrides.sort !== undefined ? overrides.sort : sort;
    const viewVal = overrides.view !== undefined ? overrides.view : view;
    const minPVal = overrides.min_price !== undefined ? overrides.min_price : minPrice;
    const maxPVal = overrides.max_price !== undefined ? overrides.max_price : maxPrice;
    const lTypeVal = overrides.listing_type !== undefined ? overrides.listing_type : listingType;
    const pageVal = overrides.page !== undefined ? overrides.page : '1';

    if (qVal) params.set('q', qVal);
    if (catVal) params.set('category', catVal);
    if (subVal) params.set('subcategory', subVal);
    if (cityVal) params.set('city', cityVal);
    if (distVal) params.set('district', distVal);
    if (radVal) params.set('radius', radVal);
    if (sortVal) params.set('sort', sortVal);
    if (viewVal) params.set('view', viewVal);
    if (minPVal) params.set('min_price', minPVal);
    if (maxPVal) params.set('max_price', maxPVal);
    if (lTypeVal) params.set('listing_type', lTypeVal);

    if (operatorIncluded) params.set('operator', 'true');
    if (fuelIncluded) params.set('fuel', 'true');
    if (transportIncluded) params.set('transport', 'true');

    if (pageVal && pageVal !== '1') params.set('page', pageVal);

    if (coords) {
      params.set('lat', coords.lat.toFixed(5));
      params.set('lng', coords.lng.toFixed(5));
      if (locationLabel) params.set('location_label', locationLabel);
    }

    router.push(`/ilanlar?${params.toString()}`);
  };

  const handleLocationSelect = (data: {
    lat: number;
    lng: number;
    cityId?: number;
    districtId?: number;
    neighborhoodId?: number;
    postalCode?: string;
    label: string;
  } | null) => {
    if (!data) {
      setCoords(null);
      setLocationLabel('');
      setSelectedCity('');
      setSelectedDistrict('');
      return;
    }

    setCoords({ lat: data.lat, lng: data.lng });
    setLocationLabel(data.label);
    if (data.cityId) setSelectedCity(String(data.cityId));
    if (data.districtId) setSelectedDistrict(String(data.districtId));

    const params = new URLSearchParams(searchParams.toString());
    params.set('lat', data.lat.toFixed(5));
    params.set('lng', data.lng.toFixed(5));
    params.set('location_label', data.label);
    if (data.cityId) params.set('city', String(data.cityId));
    if (data.districtId) params.set('district', String(data.districtId));
    if (data.neighborhoodId) params.set('neighborhood', String(data.neighborhoodId));
    if (data.postalCode) params.set('postal_code', data.postalCode);
    params.set('radius', radius || '25');
    params.set('sort', 'distance');
    params.set('page', '1');
    router.push(`/ilanlar?${params.toString()}`);
  };

  const handleSearchCurrentMapArea = (newCenter: { lat: number; lng: number }) => {
    setCoords(newCenter);
    setLocationLabel('Haritada Seçilen Bölge');
    const params = new URLSearchParams(searchParams.toString());
    params.set('lat', newCenter.lat.toFixed(5));
    params.set('lng', newCenter.lng.toFixed(5));
    params.set('location_label', 'Haritada Seçilen Bölge');
    params.set('radius', radius || '25');
    params.set('page', '1');
    router.push(`/ilanlar?${params.toString()}`);
  };

  const clearFilters = () => {
    setKeyword('');
    setSelectedCategory('');
    setSelectedSubcategory('');
    setSelectedCity('');
    setSelectedDistrict('');
    setRadius('25');
    setMinPrice('');
    setMaxPrice('');
    setListingType('');
    setOperatorIncluded(false);
    setFuelIncluded(false);
    setTransportIncluded(false);
    setCoords(null);
    setLocationLabel('');
    setCompareIds([]);
    router.push('/ilanlar');
  };

  // Compare Toggle handler (Max 3)
  const handleToggleCompare = (id: string) => {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((item) => item !== id));
    } else {
      if (compareIds.length >= 3) {
        alert('En fazla 3 ilanı aynı anda karşılaştırabilirsiniz.');
        return;
      }
      setCompareIds([...compareIds, id]);
    }
  };

  const selectedCompareListings = searchResult.listings.filter((l) => compareIds.includes(l.id));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Top Search Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-sm space-y-3">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-end">
          {/* Keyword Search Input */}
          <div className="lg:col-span-4 relative">
            <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
              Ne arıyorsunuz?
            </label>
            <div className="relative flex items-center">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 pointer-events-none" />
              <input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
                placeholder="Ekskavatör, JCB, Çimento, Lowbed..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* Location Autocomplete with Postal Code */}
          <div className="lg:col-span-5">
            <LocationAutocomplete
              valueLabel={locationLabel}
              onSelectLocation={handleLocationSelect}
            />
          </div>

          {/* Filter & Action Buttons */}
          <div className="lg:col-span-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => applyFilters()}
              className="flex-1 py-2.5 px-4 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs sm:text-sm rounded-xl shadow-md transition active:scale-95"
            >
              Filtrele
            </button>
            <button
              type="button"
              onClick={() => setMobileFilterOpen(true)}
              className="lg:hidden p-2.5 border border-slate-300 rounded-xl text-slate-700 bg-slate-50 flex items-center justify-center"
              title="Filtreler"
            >
              <Filter className="w-4 h-4 text-orange-500" />
            </button>
          </div>
        </div>

        {/* Quick Distance Radius Pills */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-2">
          <div className="flex items-center gap-1.5 font-bold text-navy-900">
            <SlidersHorizontal className="w-3.5 h-3.5 text-orange-500" />
            <span>Mesafe Yarıçapı:</span>
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
                onClick={() => {
                  setRadius(item.val);
                  applyFilters({ radius: item.val });
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  radius === item.val
                    ? 'bg-orange-500 text-white font-bold shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 2. Main Search Body Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Desktop Sidebar Filters */}
        <aside className="hidden lg:block space-y-5">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy-900 text-sm flex items-center gap-2">
                <Filter className="w-4 h-4 text-orange-500" />
                Filtre Seçenekleri
              </h3>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-bold text-slate-400 hover:text-red-500 transition"
              >
                Temizle
              </button>
            </div>

            {/* İlan Türü (Tümü / Kiralık / Satılık / Hizmet) */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
                İlan Türü
              </label>
              <div className="grid grid-cols-4 gap-1 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => {
                    setListingType('');
                    applyFilters({ listing_type: '' });
                  }}
                  className={`py-1.5 rounded-lg border text-center transition ${
                    !listingType ? 'bg-navy-900 text-white border-navy-900' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Tümü
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListingType('rental');
                    applyFilters({ listing_type: 'rental' });
                  }}
                  className={`py-1.5 rounded-lg border text-center transition ${
                    listingType === 'rental' ? 'bg-navy-900 text-white border-navy-900' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Kiralık
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListingType('sale');
                    applyFilters({ listing_type: 'sale' });
                  }}
                  className={`py-1.5 rounded-lg border text-center transition ${
                    listingType === 'sale' ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Satılık
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setListingType('service');
                    applyFilters({ listing_type: 'service' });
                  }}
                  className={`py-1.5 rounded-lg border text-center transition ${
                    listingType === 'service' ? 'bg-purple-700 text-white border-purple-700' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Hizmet
                </button>
              </div>
            </div>

            {/* Fiyat Aralığı (Min - Max) */}
            <div>
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
                Fiyat Aralığı (₺)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  onBlur={() => applyFilters()}
                  placeholder="Min ₺"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-orange-500"
                />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  onBlur={() => applyFilters()}
                  placeholder="Max ₺"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-orange-500"
                />
              </div>
            </div>

            {/* Dahil Hizmetler Switch/Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-1">
                Dahil Olan Hizmetler
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={operatorIncluded}
                  onChange={(e) => {
                    setOperatorIncluded(e.target.checked);
                    applyFilters({ operator: e.target.checked ? 'true' : undefined });
                  }}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                />
                <span>Operatör Dahil Olanlar</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={fuelIncluded}
                  onChange={(e) => {
                    setFuelIncluded(e.target.checked);
                    applyFilters({ fuel: e.target.checked ? 'true' : undefined });
                  }}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                />
                <span>Yakıt Dahil Olanlar</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={transportIncluded}
                  onChange={(e) => {
                    setTransportIncluded(e.target.checked);
                    applyFilters({ transport: e.target.checked ? 'true' : undefined });
                  }}
                  className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                />
                <span>Nakliye Dahil Olanlar</span>
              </label>
            </div>

            {/* Dinamik Kategori Özellik Filtreleri */}
            {activeCategoryAttributes.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Özellik Filtreleri
                  </label>
                  {Object.keys(dynamicFilters).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDynamicFilters({})}
                      className="text-[10px] text-orange-600 font-bold hover:underline"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {activeCategoryAttributes.map((attr) => (
                    <div key={attr.slug}>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {attr.name} {attr.unit ? `(${attr.unit})` : ''}
                      </label>
                      {attr.attribute_type === 'select' && attr.options ? (
                        <select
                          value={dynamicFilters[attr.slug] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDynamicFilters((prev) => {
                              const updated = { ...prev };
                              if (val) updated[attr.slug] = val;
                              else delete updated[attr.slug];
                              return updated;
                            });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-orange-500"
                        >
                          <option value="">Tümü</option>
                          {attr.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : attr.attribute_type === 'boolean' ? (
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!dynamicFilters[attr.slug]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setDynamicFilters((prev) => {
                                const updated = { ...prev };
                                if (checked) updated[attr.slug] = true;
                                else delete updated[attr.slug];
                                return updated;
                              });
                            }}
                            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                          />
                          <span>{attr.name}</span>
                        </label>
                      ) : attr.attribute_type === 'number' ? (
                        <input
                          type="number"
                          value={dynamicFilters[attr.slug] || ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            setDynamicFilters((prev) => {
                              const updated = { ...prev };
                              if (val !== undefined) updated[attr.slug] = val;
                              else delete updated[attr.slug];
                              return updated;
                            });
                          }}
                          placeholder={`Min ${attr.unit || ''}`}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-orange-500"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Kategori Ağacı */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider mb-2">
                Kategori Seçimi
              </label>
              <div className="space-y-1.5 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('');
                    setSelectedSubcategory('');
                    applyFilters({ category: '', subcategory: '' });
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded-lg font-semibold transition ${
                    !selectedCategory && !selectedSubcategory
                      ? 'bg-orange-50 text-orange-700 font-bold'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  Tüm Kategoriler
                </button>
                {CATEGORIES.map((cat) => (
                  <div key={cat.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCategory(cat.slug);
                        setSelectedSubcategory('');
                        applyFilters({ category: cat.slug, subcategory: '' });
                      }}
                      className={`w-full text-left px-2 py-1.5 rounded-lg font-bold flex items-center justify-between transition ${
                        selectedCategory === cat.slug && !selectedSubcategory
                          ? 'bg-navy-900 text-white'
                          : 'text-navy-900 hover:bg-slate-100'
                      }`}
                    >
                      <span>{cat.name}</span>
                    </button>
                    {/* Subcategories */}
                    <div className="pl-2.5 space-y-0.5">
                      {cat.subcategories?.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat.slug);
                            setSelectedSubcategory(sub.slug);
                            applyFilters({ category: cat.slug, subcategory: sub.slug });
                          }}
                          className={`w-full text-left px-2 py-1 rounded text-[11px] font-medium transition ${
                            selectedSubcategory === sub.slug
                              ? 'bg-orange-500 text-white font-bold'
                              : 'text-slate-500 hover:text-navy-900 hover:bg-slate-50'
                          }`}
                        >
                          • {sub.name}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* Results Column */}
        <div className="lg:col-span-3 space-y-4">
          {/* Controls Bar: Count, Sort, View Modes */}
          <div className="bg-white rounded-2xl border border-slate-200 p-3.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs sm:text-sm font-bold text-navy-900">
              Bulunan İlan:{' '}
              <span className="text-orange-600 font-extrabold text-base">
                {searchResult.total}
              </span>
              {coords && (
                <span className="text-xs text-slate-500 font-normal ml-2">
                  (📍 {radius && radius !== 'all' ? `${radius} km çevresi` : 'Tüm TR'})
                </span>
              )}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
              {/* Sort Dropdown */}
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
                <select
                  value={sort}
                  onChange={(e) => {
                    const s = e.target.value as any;
                    setSort(s);
                    applyFilters({ sort: s });
                  }}
                  className="bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-navy-900 focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="distance">En Yakın (Mesafe)</option>
                  <option value="price_asc">En Ucuz Fiyat</option>
                  <option value="newest">En Yeni İlanlar</option>
                </select>
              </div>

              {/* View Switcher: Liste, Harita, Yan Yana (Split), Karşılaştırma */}
              <div className="flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setView('list');
                    applyFilters({ view: 'list' });
                  }}
                  className={`p-1.5 rounded-md transition ${
                    view === 'list' ? 'bg-white text-navy-900 shadow-sm font-bold' : 'text-slate-500 hover:text-navy-900'
                  }`}
                  title="Liste Görünümü"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('map');
                    applyFilters({ view: 'map' });
                  }}
                  className={`p-1.5 rounded-md transition ${
                    view === 'map' ? 'bg-white text-navy-900 shadow-sm font-bold' : 'text-slate-500 hover:text-navy-900'
                  }`}
                  title="Harita Görünümü"
                >
                  <Map className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('split');
                    applyFilters({ view: 'split' });
                  }}
                  className={`hidden md:block p-1.5 rounded-md transition ${
                    view === 'split' ? 'bg-white text-navy-900 shadow-sm font-bold' : 'text-slate-500 hover:text-navy-900'
                  }`}
                  title="Yan Yana (Split View)"
                >
                  <Columns className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setView('compare');
                    applyFilters({ view: 'compare' });
                  }}
                  className={`p-1.5 rounded-md transition ${
                    view === 'compare' ? 'bg-white text-orange-600 shadow-sm font-bold' : 'text-slate-500 hover:text-navy-900'
                  }`}
                  title="Fiyat Karşılaştırma Tablosu"
                >
                  <TableProperties className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 3. Radius Expansion Suggestion (When 0 results found) */}
          {searchResult.total === 0 && !loading && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center space-y-3">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-navy-900 text-base">
                  Seçili {radius && radius !== 'all' ? `${radius} km` : ''} çevrede ilan bulunamadı
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                  Şantiyenize yakın bölgedeki alternatif makine ve malzemeleri görmek için arama yarıçapını genişletebilirsiniz:
                </p>
              </div>

              {/* Automatic Radius Expansion Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                {searchResult.countsByRadius?.radius50 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRadius('50');
                      applyFilters({ radius: '50' });
                    }}
                    className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                  >
                    50 km&apos;ye Genişlet ({searchResult.countsByRadius.radius50} ilan)
                  </button>
                ) : null}

                {searchResult.countsByRadius?.radius100 ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRadius('100');
                      applyFilters({ radius: '100' });
                    }}
                    className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs rounded-xl shadow-md transition"
                  >
                    100 km&apos;ye Genişlet ({searchResult.countsByRadius.radius100} ilan)
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    setRadius('all');
                    applyFilters({ radius: 'all' });
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-navy-900 font-bold text-xs rounded-xl transition"
                >
                  Tüm Türkiye&apos;de Ara
                </button>
              </div>
            </div>
          )}

          {/* 4. Results View Modes */}
          {loading ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin mx-auto" />
              <p className="text-sm font-semibold text-slate-600">İlanlar taranıyor...</p>
            </div>
          ) : view === 'map' ? (
            /* Full Map View */
            <ListingMap
              listings={searchResult.listings}
              userCoords={coords}
              radiusKm={radius && radius !== 'all' ? Number(radius) : undefined}
              onSearchArea={handleSearchCurrentMapArea}
              height="650px"
            />
          ) : view === 'split' ? (
            /* Desktop Split View: Left List, Right Map */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
              <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
                {searchResult.listings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    isCompareSelected={compareIds.includes(item.id)}
                    onCompareToggle={handleToggleCompare}
                  />
                ))}
              </div>
              <div className="sticky top-24">
                <ListingMap
                  listings={searchResult.listings}
                  userCoords={coords}
                  radiusKm={radius && radius !== 'all' ? Number(radius) : undefined}
                  onSearchArea={handleSearchCurrentMapArea}
                  height="700px"
                />
              </div>
            </div>
          ) : view === 'compare' ? (
            /* Comparison Table View */
            <ComparisonTable
              listings={searchResult.listings}
              selectedCompareIds={compareIds}
              onToggleCompare={handleToggleCompare}
            />
          ) : (
            /* Standard Grid List View */
            <div className="space-y-6">
              {pageParam === 1 && sponsoredListings.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-50/70 via-amber-50/40 to-white border border-amber-200/90 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      Sponsorlu Sonuçlar
                    </span>
                    <span className="text-[11px] text-amber-800 font-medium">Bölgesel Öne Çıkan İlanlar</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {sponsoredListings.map((item) => (
                      <ListingCard
                        key={`sponsored-${item.id}`}
                        listing={item}
                        isCompareSelected={compareIds.includes(item.id)}
                        onCompareToggle={handleToggleCompare}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {searchResult.listings.map((item) => (
                  <ListingCard
                    key={item.id}
                    listing={item}
                    isCompareSelected={compareIds.includes(item.id)}
                    onCompareToggle={handleToggleCompare}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 5. Pagination Controls */}
          {searchResult.totalPages > 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center justify-between text-xs font-bold text-slate-700">
              <button
                type="button"
                disabled={searchResult.page <= 1}
                onClick={() => applyFilters({ page: String(searchResult.page - 1) })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Önceki
              </button>

              <span>
                Sayfa {searchResult.page} / {searchResult.totalPages}
              </span>

              <button
                type="button"
                disabled={searchResult.page >= searchResult.totalPages}
                onClick={() => applyFilters({ page: String(searchResult.page + 1) })}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 transition flex items-center gap-1"
              >
                Sonraki
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Floating Compare Drawer (when 1-3 listings are selected) */}
      <CompareDrawer
        selectedListings={selectedCompareListings}
        onRemove={handleToggleCompare}
        onClear={() => setCompareIds([])}
      />

      {/* Mobile Drawer Filter Modal */}
      {mobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-navy-950/70 backdrop-blur-sm lg:hidden">
          <div className="bg-white rounded-t-3xl p-6 max-h-[85vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-navy-900 text-base">Filtreler</h3>
              <button
                type="button"
                onClick={() => setMobileFilterOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-navy-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* İlan Türü */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">İlan Türü</label>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-bold">
                {['', 'rental', 'sale', 'service'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setListingType(t)}
                    className={`py-2 rounded-lg border text-center ${
                      listingType === t
                        ? t === 'service'
                          ? 'bg-purple-700 text-white'
                          : t === 'sale'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-navy-900 text-white'
                        : 'bg-slate-50 text-slate-700'
                    }`}
                  >
                    {!t ? 'Tümü' : t === 'rental' ? 'Kiralık' : t === 'service' ? 'Hizmet' : 'Satılık'}
                  </button>
                ))}
              </div>
            </div>

            {/* Fiyat Aralığı */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">Fiyat Aralığı (₺)</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={minPrice}
                  onChange={(e) => setMinPrice(e.target.value)}
                  placeholder="Min ₺"
                  className="px-3 py-2 bg-slate-50 border rounded-lg text-xs"
                />
                <input
                  type="number"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  placeholder="Max ₺"
                  className="px-3 py-2 bg-slate-50 border rounded-lg text-xs"
                />
              </div>
            </div>

            {/* Dahil Hizmetler */}
            <div className="space-y-2 pt-2 border-t">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={operatorIncluded}
                  onChange={(e) => setOperatorIncluded(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>Operatör Dahil Olanlar</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={fuelIncluded}
                  onChange={(e) => setFuelIncluded(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>Yakıt Dahil Olanlar</span>
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={transportIncluded}
                  onChange={(e) => setTransportIncluded(e.target.checked)}
                  className="rounded text-orange-500"
                />
                <span>Nakliye Dahil Olanlar</span>
              </label>
            </div>

            {/* Dinamik Kategori Özellik Filtreleri */}
            {activeCategoryAttributes.length > 0 && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-black text-slate-500 uppercase tracking-wider">
                    Özellik Filtreleri
                  </label>
                  {Object.keys(dynamicFilters).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDynamicFilters({})}
                      className="text-[10px] text-orange-600 font-bold hover:underline"
                    >
                      Sıfırla
                    </button>
                  )}
                </div>
                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {activeCategoryAttributes.map((attr) => (
                    <div key={attr.slug}>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {attr.name} {attr.unit ? `(${attr.unit})` : ''}
                      </label>
                      {attr.attribute_type === 'select' && attr.options ? (
                        <select
                          value={dynamicFilters[attr.slug] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setDynamicFilters((prev) => {
                              const updated = { ...prev };
                              if (val) updated[attr.slug] = val;
                              else delete updated[attr.slug];
                              return updated;
                            });
                          }}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-orange-500"
                        >
                          <option value="">Tümü</option>
                          {attr.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : attr.attribute_type === 'boolean' ? (
                        <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!dynamicFilters[attr.slug]}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setDynamicFilters((prev) => {
                                const updated = { ...prev };
                                if (checked) updated[attr.slug] = true;
                                else delete updated[attr.slug];
                                return updated;
                              });
                            }}
                            className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500"
                          />
                          <span>{attr.name}</span>
                        </label>
                      ) : attr.attribute_type === 'number' ? (
                        <input
                          type="number"
                          value={dynamicFilters[attr.slug] || ''}
                          onChange={(e) => {
                            const val = e.target.value ? Number(e.target.value) : undefined;
                            setDynamicFilters((prev) => {
                              const updated = { ...prev };
                              if (val !== undefined) updated[attr.slug] = val;
                              else delete updated[attr.slug];
                              return updated;
                            });
                          }}
                          placeholder={`Min ${attr.unit || ''}`}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:border-orange-500"
                        />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  clearFilters();
                  setMobileFilterOpen(false);
                }}
                className="w-1/3 py-3 rounded-xl border text-slate-700 font-bold text-xs"
              >
                Temizle
              </button>
              <button
                type="button"
                onClick={() => {
                  applyFilters();
                  setMobileFilterOpen(false);
                }}
                className="w-2/3 py-3 rounded-xl bg-orange-500 text-white font-extrabold text-sm shadow-md"
              >
                Uygula
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
