'use client';

import { useState, useMemo } from 'react';
import { formatDistance, isCompanyVerified, listingCompanyName } from '@/lib/utils/listing-display';
import { comparablePrices, cheapestId, unitRatePrice } from '@/lib/utils/listing-price';
import Link from 'next/link';
import { Listing } from '@/types/database';
import { ArrowUpDown, Check, X, ShieldCheck, MapPin, ExternalLink, Zap } from 'lucide-react';

interface ComparisonTableProps {
  listings: Listing[];
  selectedCompareIds: string[];
  onToggleCompare: (id: string) => void;
}

type SortField = 'price_daily' | 'price_sale' | 'distance' | 'title';

export default function ComparisonTable({
  listings,
  selectedCompareIds,
  onToggleCompare,
}: ComparisonTableProps) {
  const [sortField, setSortField] = useState<SortField>('distance');
  const [sortAsc, setSortAsc] = useState(true);

  // Identify cheapest and closest listings for visual badge highlights
  const { cheapestDailyId, cheapestSaleId, closestId } = useMemo(() => {
    let minDistance = Infinity;
    let minDistanceId: string | null = null;

    listings.forEach((l) => {
      if (typeof l.distance_km === 'number' && l.distance_km < minDistance) {
        minDistance = l.distance_km;
        minDistanceId = l.id;
      }
    });

    return {
      cheapestDailyId: cheapestId(listings, 'daily'),
      cheapestSaleId: cheapestId(listings, 'sale'),
      closestId: minDistanceId,
    };
  }, [listings]);

  // Sort rows
  const sortedListings = useMemo(() => {
    const list = [...listings];
    list.sort((a, b) => {
      let valA: number | string = 0;
      let valB: number | string = 0;

      if (sortField === 'distance') {
        valA = a.distance_km ?? 999999;
        valB = b.distance_km ?? 999999;
      } else if (sortField === 'price_daily') {
        valA = comparablePrices(a).daily ?? 99999999;
        valB = comparablePrices(b).daily ?? 99999999;
      } else if (sortField === 'price_sale') {
        valA = comparablePrices(a).sale ?? 99999999;
        valB = comparablePrices(b).sale ?? 99999999;
      } else {
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
      }

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });
    return list;
  }, [listings, sortField, sortAsc]);

  const handleHeaderClick = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  if (listings.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 text-sm">
        Karşılaştırılacak ilan bulunamadı.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
        <div>
          <h3 className="font-extrabold text-navy-900 text-base flex items-center gap-2">
            <Zap className="w-4 h-4 text-orange-500" />
            Fiyat & Hizmet Karşılaştırma Tablosu
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Makinelerin günlük/aylık fiyatlarını, operatör ve nakliye dahil opsiyonlarını doğrudan kıyaslayın
          </p>
        </div>
        <div className="text-xs font-semibold text-slate-500 flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            En ucuz teklif
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 inline-block" />
            En yakın mesafe
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-navy-900 text-white font-bold text-xs">
              <th className="py-3 px-3 text-center w-12">Seç</th>
              <th
                onClick={() => handleHeaderClick('title')}
                className="py-3 px-4 cursor-pointer hover:text-orange-400 select-none transition"
              >
                <div className="flex items-center gap-1">
                  <span>İlan & Firma</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('distance')}
                className="py-3 px-4 cursor-pointer hover:text-orange-400 select-none transition"
              >
                <div className="flex items-center gap-1">
                  <span>Konum & Mesafe</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => handleHeaderClick('price_daily')}
                className="py-3 px-4 cursor-pointer hover:text-orange-400 select-none transition"
              >
                <div className="flex items-center gap-1">
                  <span>Günlük Fiyat</span>
                  <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th className="py-3 px-4">Haftalık / Aylık</th>
              <th className="py-3 px-4">Satış Fiyatı</th>
              <th className="py-3 px-3 text-center">Operatör</th>
              <th className="py-3 px-3 text-center">Yakıt</th>
              <th className="py-3 px-3 text-center">Nakliye</th>
              <th className="py-3 px-3 text-center">Müsaitlik</th>
              <th className="py-3 px-4 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedListings.map((l) => {
              const isSelected = selectedCompareIds.includes(l.id);
              const prices = comparablePrices(l);
              const unitRate = unitRatePrice(l);
              const isCheapestDaily = l.id === cheapestDailyId || l.id === cheapestSaleId;
              const isClosest = l.id === closestId;

              return (
                <tr
                  key={l.id}
                  className={`hover:bg-slate-50 transition ${
                    isSelected ? 'bg-orange-50/60' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleCompare(l.id)}
                      className="w-4 h-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
                      title="Karşılaştırmaya Ekle / Çıkar"
                    />
                  </td>

                  {/* Title & Company */}
                  <td className="py-3 px-4 max-w-xs">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      {isCheapestDaily && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-black bg-emerald-600 text-white shadow-sm">
                          En ucuz
                        </span>
                      )}
                      {isClosest && (
                        <span className="px-1.5 py-0.5 rounded text-xs font-black bg-orange-500 text-white shadow-sm">
                          En yakın
                        </span>
                      )}
                    </div>
                    <Link
                      href={`/ilan/${l.slug || l.id}`}
                      className="font-bold text-navy-900 hover:text-orange-600 line-clamp-1 leading-snug"
                    >
                      {l.title}
                    </Link>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                      {isCompanyVerified(l) && (
                        <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                      )}
                      <span className="truncate">{listingCompanyName(l)}</span>
                    </div>
                  </td>

                  {/* Location & Distance */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-700 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-orange-500 shrink-0" />
                      <span>{l.city_name || '—'}{l.city_name && l.district_name ? `, ${l.district_name}` : ''}</span>
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatDistance(l.distance_km) ? (
                        <strong className="text-orange-600">{formatDistance(l.distance_km)}</strong>
                      ) : (
                        'Mesafe hesapsız'
                      )}
                    </div>
                  </td>

                  {/* Daily Price */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {unitRate ? (
                      <span className="font-black text-navy-900 text-sm">
                        {unitRate.amount.toLocaleString('tr-TR')} ₺
                        <span className="text-xs font-semibold text-slate-500"> / {unitRate.unit}</span>
                      </span>
                    ) : l.pricing_type === 'custom_quote' || (prices.daily === null && prices.sale === null && l.listing_type === 'service') ? (
                      <span className="font-bold text-navy-900 text-xs px-2 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                        Teklife Göre
                      </span>
                    ) : prices.daily !== null ? (
                      <span className="font-black text-navy-900 text-sm">
                        {prices.daily.toLocaleString('tr-TR')} ₺
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Weekly / Monthly */}
                  <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600">
                    <div>
                      Haftalık: {prices.weekly !== null ? `${prices.weekly.toLocaleString('tr-TR')} ₺` : '—'}
                    </div>
                    <div>
                      Aylık: {prices.monthly !== null ? `${prices.monthly.toLocaleString('tr-TR')} ₺` : '—'}
                    </div>
                  </td>

                  {/* Sale Price */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {prices.sale !== null ? (
                      <span className="font-black text-navy-900 text-sm">
                        {prices.sale.toLocaleString('tr-TR')} ₺
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>

                  {/* Operator Included */}
                  <td className="py-3 px-3 text-center">
                    {l.is_operator_included ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-100 text-emerald-700 font-bold" title="Operatör Dahil">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400" title="Hariç">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>

                  {/* Fuel Included */}
                  <td className="py-3 px-3 text-center">
                    {l.is_fuel_included ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-100 text-emerald-700 font-bold" title="Yakıt Dahil">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400" title="Hariç">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>

                  {/* Transport Included */}
                  <td className="py-3 px-3 text-center">
                    {l.is_transport_included ? (
                      <span className="inline-flex p-1 rounded-full bg-emerald-100 text-emerald-700 font-bold" title="Nakliye Dahil">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    ) : (
                      <span className="inline-flex p-1 rounded-full bg-slate-100 text-slate-400" title="Hariç">
                        <X className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </td>

                  {/* Status / Availability */}
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      l.status === 'active'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {l.status === 'active' ? 'Müsait' : 'Meşgul'}
                    </span>
                  </td>

                  {/* Action */}
                  <td className="py-3 px-4 text-right">
                    <Link
                      href={`/ilan/${l.slug || l.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-navy-900 hover:bg-orange-500 text-white font-bold text-xs transition"
                    >
                      <span>İncele</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
