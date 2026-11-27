'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Crosshair, Loader2, X, Search, ChevronDown } from 'lucide-react';
import { CITIES, DISTRICTS, NEIGHBORHOODS } from '@/lib/mock-data';
import { searchLocationAutocomplete, lookupPostalCode, LocationSuggestion } from '@/lib/services/location-service';
import { formatPostalCode } from '@/lib/turkish';

interface LocationAutocompleteProps {
  valueLabel?: string;
  onSelectLocation: (coords: {
    lat: number;
    lng: number;
    cityId?: number;
    districtId?: number;
    neighborhoodId?: number;
    postalCode?: string;
    label: string;
  } | null) => void;
  className?: string;
  /** Etiket satırını gizler; "konumumu kullan" giriş kutusunun içinde ikon olarak gösterilir. */
  compact?: boolean;
  inputClassName?: string;
}

export default function LocationAutocomplete({
  valueLabel = '',
  onSelectLocation,
  className = '',
  compact = false,
  inputClassName,
}: LocationAutocompleteProps) {
  const [query, setQuery] = useState(valueLabel);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(''), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  // Manual Cascading State
  const [selectedCityId, setSelectedCityId] = useState<number | ''>('');
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | ''>('');
  const [selectedNeighborhoodId, setSelectedNeighborhoodId] = useState<number | ''>('');

  const wrapperRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Update query when valueLabel changes from outside
  useEffect(() => {
    if (valueLabel) setQuery(valueLabel);
  }, [valueLabel]);

  // Autocomplete typing trigger
  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setQuery(text);

    // If 5-digit postal code, do instant lookup
    const cleanPostal = formatPostalCode(text);
    if (cleanPostal.length === 5) {
      setIsSearching(true);
      const match = await lookupPostalCode(cleanPostal);
      setIsSearching(false);
      if (match) {
        setSuggestions([match]);
        setDropdownOpen(true);
        return;
      }
    }

    if (text.trim().length >= 2) {
      setIsSearching(true);
      const res = await searchLocationAutocomplete(text);
      setSuggestions(res);
      setIsSearching(false);
      setDropdownOpen(true);
    } else {
      setSuggestions([]);
      setDropdownOpen(false);
    }
  };

  const handleSelectSuggestion = (s: LocationSuggestion) => {
    setQuery(s.label);
    setDropdownOpen(false);
    onSelectLocation({
      lat: s.lat,
      lng: s.lng,
      cityId: s.cityId,
      districtId: s.districtId,
      neighborhoodId: s.neighborhoodId,
      postalCode: s.postalCode,
      label: s.label,
    });
  };

  // Browser Geolocation
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setNotice('Tarayıcınız konum servisini desteklemiyor.');
      return;
    }

    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setQuery('Mevcut Konumum');
        setDropdownOpen(false);
        setGeoLoading(false);
        onSelectLocation({
          lat: latitude,
          lng: longitude,
          label: 'Mevcut Konumum',
        });
      },
      (err) => {
        console.error('Konum hatası:', err);
        setNotice('Konumunuza erişilemedi. Lütfen tarayıcı izinlerini açın veya listeden il/ilçe seçin.');
        setGeoLoading(false);
        setManualMode(true);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleClear = () => {
    setQuery('');
    setSuggestions([]);
    setDropdownOpen(false);
    setSelectedCityId('');
    setSelectedDistrictId('');
    setSelectedNeighborhoodId('');
    onSelectLocation(null);
  };

  // Cascading Dropdown Selectors
  const handleCityChange = (cId: string) => {
    const id = cId ? Number(cId) : '';
    setSelectedCityId(id);
    setSelectedDistrictId('');
    setSelectedNeighborhoodId('');

    if (id) {
      const cityObj = CITIES.find((c) => c.id === id);
      if (cityObj) {
        setQuery(cityObj.name);
        onSelectLocation({
          lat: cityObj.lat,
          lng: cityObj.lng,
          cityId: cityObj.id,
          label: cityObj.name,
        });
      }
    }
  };

  const handleDistrictChange = (dId: string) => {
    const id = dId ? Number(dId) : '';
    setSelectedDistrictId(id);
    setSelectedNeighborhoodId('');

    if (id) {
      const distObj = DISTRICTS.find((d) => d.id === id);
      const cityObj = CITIES.find((c) => c.id === selectedCityId);
      if (distObj) {
        const label = `${cityObj?.name || ''}, ${distObj.name}`;
        setQuery(label);
        onSelectLocation({
          lat: distObj.lat,
          lng: distObj.lng,
          cityId: Number(selectedCityId),
          districtId: distObj.id,
          label,
        });
      }
    }
  };

  const handleNeighborhoodChange = (nId: string) => {
    const id = nId ? Number(nId) : '';
    setSelectedNeighborhoodId(id);

    if (id) {
      const neighObj = NEIGHBORHOODS.find((n) => n.id === id);
      if (neighObj) {
        const label = `${neighObj.city_name}, ${neighObj.district_name} - ${neighObj.name} (${neighObj.postal_code})`;
        setQuery(label);
        onSelectLocation({
          lat: neighObj.lat,
          lng: neighObj.lng,
          cityId: neighObj.city_id,
          districtId: neighObj.district_id,
          neighborhoodId: neighObj.id,
          postalCode: neighObj.postal_code,
          label,
        });
      }
    }
  };

  const availableDistricts = selectedCityId
    ? DISTRICTS.filter((d) => d.city_id === selectedCityId)
    : [];

  const availableNeighborhoods = selectedDistrictId
    ? NEIGHBORHOODS.filter((n) => n.district_id === selectedDistrictId)
    : [];

  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      {!compact && (
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-xs font-medium text-slate-600">Konum</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setManualMode(!manualMode)}
              className="text-xs text-slate-500 hover:text-navy-900 transition-colors"
            >
              {manualMode ? 'Arama ile seç' : 'Listeden seç'}
            </button>
            <button
              type="button"
              onClick={handleUseMyLocation}
              disabled={geoLoading}
              className="text-xs font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1 transition-colors"
            >
              {geoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crosshair className="w-3 h-3" />}
              <span>Konumumu kullan</span>
            </button>
          </div>
        </div>
      )}

      {!manualMode ? (
        /* Autocomplete Search Input */
        <div className="relative flex items-center">
          <MapPin className="w-[18px] h-[18px] text-slate-400 absolute left-3 pointer-events-none" strokeWidth={1.75} />
          <input
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={() => query.trim().length >= 2 && setDropdownOpen(true)}
            placeholder="İl, ilçe, mahalle veya posta kodu"
            aria-label="Konum"
            className={
              inputClassName ||
              'w-full pl-10 pr-16 py-2.5 bg-white text-navy-900 placeholder:text-slate-400 rounded-md text-sm border border-slate-300 focus:border-navy-900 focus:ring-1 focus:ring-navy-900 focus:outline-none transition-colors'
            }
          />
          <div className="absolute right-2 flex items-center gap-0.5">
            {query && (
              <button
                type="button"
                onClick={handleClear}
                className="p-1 text-slate-400 hover:text-slate-700"
                aria-label="Konumu temizle"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {compact && (
              <button
                type="button"
                onClick={handleUseMyLocation}
                disabled={geoLoading}
                className="p-1 text-slate-500 hover:text-orange-600"
                title="Konumumu kullan"
                aria-label="Konumumu kullan"
              >
                {geoLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
              </button>
            )}
          </div>

          {/* Autocomplete Dropdown List */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-md shadow-xl border border-slate-200 py-1 z-50 max-h-64 overflow-y-auto text-left">
              {isSearching ? (
                <div className="p-3 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
                  <span>Konum aranıyor...</span>
                </div>
              ) : suggestions.length === 0 ? (
                <div className="p-3 text-center text-xs text-slate-400">
                  Eşleşen konum bulunamadı. İl/ilçe adını veya 5 haneli posta kodunu kontrol edebilirsiniz.
                </div>
              ) : (
                suggestions.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(item)}
                    className="w-full px-3 py-2 text-left hover:bg-slate-50 transition-colors flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-navy-900 truncate">{item.label}</div>
                      <div className="text-xs text-slate-500 truncate">{item.subLabel}</div>
                    </div>
                    <span className="text-[11px] text-slate-500 shrink-0">
                      {item.type === 'postal_code' ? 'Posta Kodu' : item.type === 'neighborhood' ? 'Mahalle' : item.type === 'district' ? 'İlçe' : 'İl'}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        /* Cascading İl -> İlçe -> Mahalle Dropdown Selectors */
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {/* İl */}
          <select
            value={selectedCityId}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-navy-900 focus:border-navy-900 focus:outline-none"
          >
            <option value="">İl Seçiniz</option>
            {CITIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.plate_code.toString().padStart(2, '0')} - {c.name}
              </option>
            ))}
          </select>

          {/* İlçe */}
          <select
            disabled={!selectedCityId}
            value={selectedDistrictId}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-navy-900 focus:border-navy-900 focus:outline-none disabled:opacity-50"
          >
            <option value="">İlçe Seçiniz</option>
            {availableDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Mahalle */}
          <select
            disabled={!selectedDistrictId}
            value={selectedNeighborhoodId}
            onChange={(e) => handleNeighborhoodChange(e.target.value)}
            className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm text-navy-900 focus:border-navy-900 focus:outline-none disabled:opacity-50"
          >
            <option value="">Mahalle Seçiniz</option>
            {availableNeighborhoods.map((n) => (
              <option key={n.id} value={n.id}>
                {n.name} ({n.postal_code})
              </option>
            ))}
          </select>
        </div>
      )}
      {notice && (
        <p role="status" className="mt-1.5 text-xs font-medium text-slate-700">
          {notice}
        </p>
      )}
    </div>
  );
}
