'use client';

import { useState } from 'react';
import { formatDistance, isCompanyVerified, listingCompanyName } from '@/lib/utils/listing-display';
import Image from 'next/image';
import Link from 'next/link';
import { Listing } from '@/types/database';
import { visibleSpecs } from '@/lib/utils/listing-specs';
import { comparablePrices, unitRatePrice } from '@/lib/utils/listing-price';
import { X, ArrowRight, ShieldCheck, Trash2 } from 'lucide-react';

interface CompareDrawerProps {
  selectedListings: Listing[];
  onRemove: (id: string) => void;
  onClear: () => void;
}

export default function CompareDrawer({
  selectedListings,
  onRemove,
  onClear,
}: CompareDrawerProps) {
  const [modalOpen, setModalOpen] = useState(false);

  if (selectedListings.length === 0) return null;

  // Teknik özellikler: iki üç ilanın etiketlerinin birleşimi (ilk görülme sırasıyla)
  const specsPerListing = selectedListings.map((l) => visibleSpecs(l.technical_specs));
  const specLabels: string[] = [];
  specsPerListing.forEach((specs) =>
    specs.forEach((sp) => {
      if (!specLabels.includes(sp.label)) specLabels.push(sp.label);
    }),
  );

  return (
    <>
      {/* Fixed Bottom Floating Bar */}
      <div className="fixed bottom-14 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-navy-900 text-white rounded-2xl shadow-2xl border-2 border-orange-500/80 px-4 py-3 flex items-center gap-4 max-w-xl w-[92%] sm:w-auto">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-black text-xs">
            {selectedListings.length}/3
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-bold leading-tight">İlan Karşılaştırma</div>
            <div className="text-xs text-slate-300">En fazla 3 ilan yan yana</div>
          </div>
        </div>

        {/* Selected Thumbnails */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {selectedListings.map((l) => (
            <div
              key={l.id}
              className="relative w-10 h-10 rounded-lg overflow-hidden border border-slate-700 shrink-0 group"
            >
              <Image
                src={l.images?.[0] || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=100&q=80'}
                alt={l.title}
                fill
                className="object-cover"
              />
              <button
                type="button"
                onClick={() => onRemove(l.id)}
                className="absolute inset-0 bg-red-600/80 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs font-black transition-opacity"
                title="Kaldır"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={onClear}
            className="p-1.5 text-slate-400 hover:text-white text-xs transition"
            title="Tümünü Temizle"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs rounded-xl shadow-md transition flex items-center gap-1 whitespace-nowrap"
          >
            <span>Karşılaştır</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Comparison Modal (Side-by-Side 3 Listings) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-navy-950/80 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-black text-navy-900 text-base sm:text-lg">
                  Seçili İlanları Yan Yana Karşılaştır
                </h3>
                <p className="text-xs text-slate-500">
                  Fiyat, dahil hizmetler ve teknik parametreleri doğrudan kıyaslayın
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-navy-900 hover:bg-slate-200 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Side-by-Side Grid */}
            <div className="p-4 sm:p-6 overflow-y-auto">
              <div
                className={`grid gap-4 ${
                  selectedListings.length === 1
                    ? 'grid-cols-1'
                    : selectedListings.length === 2
                    ? 'grid-cols-1 sm:grid-cols-2'
                    : 'grid-cols-1 sm:grid-cols-3'
                }`}
              >
                {selectedListings.map((l) => {
                  const prices = comparablePrices(l);
                  const unitRate = unitRatePrice(l);
                  const noPrice = unitRate === null && prices.daily === null && prices.sale === null && prices.weekly === null && prices.monthly === null;
                  return (
                  <div
                    key={l.id}
                    className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 flex flex-col justify-between space-y-4 shadow-sm"
                  >
                    <div>
                      {/* Photo */}
                      <div className="relative aspect-[16/10] rounded-lg overflow-hidden bg-slate-200 mb-3">
                        <Image
                          src={l.images?.[0] || 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=400&q=80'}
                          alt={l.title}
                          fill
                          className="object-cover"
                        />
                        <div
                          className={`absolute top-2 left-2 text-white text-xs font-extrabold px-2 py-0.5 rounded shadow-sm ${
                            l.listing_type === 'rental'
                              ? 'bg-navy-900'
                              : l.listing_type === 'service'
                              ? 'bg-purple-700'
                              : 'bg-emerald-700'
                          }`}
                        >
                          {l.listing_type === 'rental' ? 'Kiralık' : l.listing_type === 'service' ? 'Hizmet' : 'Satılık'}
                        </div>
                      </div>

                      {/* Title & Company */}
                      <h4 className="font-extrabold text-navy-900 text-sm line-clamp-2 mb-1">
                        {l.title}
                      </h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mb-3">
                        {isCompanyVerified(l) && (
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        )}
                        <span>{listingCompanyName(l)}</span>
                      </p>

                      {/* Pricing Box */}
                      <div className="bg-white p-3 rounded-lg border border-slate-200 mb-3 space-y-1">
                        <div className="text-xs font-bold text-slate-500">Fiyat Tarifesi</div>
                        {l.pricing_type === 'custom_quote' || noPrice ? (
                          <div>
                            <div className="text-base font-black text-navy-900">Teklife Göre</div>
                            <div className="text-xs text-slate-500 font-semibold">Keşif & Proje Bazlı</div>
                          </div>
                        ) : unitRate ? (
                          <div className="text-lg font-black text-orange-600">
                            {unitRate.amount.toLocaleString('tr-TR')} ₺ <span className="text-xs font-semibold text-slate-500">/ {unitRate.unit}</span>
                          </div>
                        ) : (
                          <>
                            {l.listing_type === 'sale' ? (
                              <div className="text-lg font-black text-navy-900">
                                {prices.sale !== null ? (
                                  <>
                                    {prices.sale.toLocaleString('tr-TR')} ₺ <span className="text-xs font-semibold text-slate-500">Satış</span>
                                  </>
                                ) : (
                                  '—'
                                )}
                              </div>
                            ) : (
                              <>
                                <div className="text-lg font-black text-orange-600">
                                  {prices.daily !== null ? (
                                    <>
                                      {prices.daily.toLocaleString('tr-TR')} ₺ <span className="text-xs font-semibold text-slate-500">/ gün</span>
                                    </>
                                  ) : (
                                    '—'
                                  )}
                                </div>
                                {prices.weekly !== null && (
                                  <div className="text-xs text-slate-600">
                                    Haftalık: <strong>{prices.weekly.toLocaleString('tr-TR')} ₺</strong>
                                  </div>
                                )}
                                {prices.monthly !== null && (
                                  <div className="text-xs text-slate-600">
                                    Aylık: <strong>{prices.monthly.toLocaleString('tr-TR')} ₺</strong>
                                  </div>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>

                      {/* Distance */}
                      <div className="text-xs text-slate-600 mb-3 py-1.5 px-2.5 rounded bg-slate-100 flex items-center justify-between">
                        <span>Konum & Mesafe:</span>
                        <strong className="text-navy-900">
                          {l.city_name || '—'} {formatDistance(l.distance_km) ? `(${formatDistance(l.distance_km)})` : ''}
                        </strong>
                      </div>

                      {/* Inclusions */}
                      <div className="space-y-1.5 text-xs text-slate-700 mb-3 border-t border-slate-200 pt-2">
                        <div className="flex items-center justify-between">
                          <span>Operatör Dahil:</span>
                          <strong>{l.is_operator_included ? 'Evet' : 'Hayır'}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Yakıt Dahil:</span>
                          <strong>{l.is_fuel_included ? 'Evet' : 'Hayır'}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>Nakliye Dahil:</span>
                          <strong>{l.is_transport_included ? 'Evet' : 'Hayır'}</strong>
                        </div>
                      </div>

                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-slate-200 space-y-2">
                      <Link
                        href={`/ilan/${l.slug || l.id}`}
                        className="w-full py-2 bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs rounded-lg text-center block transition"
                      >
                        İlan Detayına Git
                      </Link>
                    </div>
                  </div>
                  );
                })}
              </div>

              {/* Technical Specs: iki ilandan gelen etiketlerin birleşimi */}
              {specLabels.length > 0 && (
                <div className="mt-5 border-t border-slate-200 pt-3">
                  <div className="text-xs font-bold text-slate-400 mb-2">Teknik Parametreler</div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="text-xs text-slate-500">
                          <th className="py-1.5 pr-3 font-semibold" />
                          {selectedListings.map((l) => (
                            <th key={l.id} className="py-1.5 px-2 font-bold text-navy-900 max-w-[10rem] truncate">
                              {l.title}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {specLabels.map((label) => (
                          <tr key={label}>
                            <td className="py-1.5 pr-3 text-slate-500">{label}</td>
                            {specsPerListing.map((specs, i) => (
                              <td key={selectedListings[i].id} className="py-1.5 px-2 font-semibold text-navy-900">
                                {specs.find((sp) => sp.label === label)?.value ?? '—'}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
