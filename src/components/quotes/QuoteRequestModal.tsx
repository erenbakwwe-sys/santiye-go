'use client';

import { useState } from 'react';
import { Listing } from '@/types/database';
import { createQuoteRequest } from '@/lib/services/quote-service';
import { X, Send, Calendar, MapPin, Wrench, Fuel, Truck, CheckCircle2, AlertCircle } from 'lucide-react';

interface QuoteRequestModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
}

export default function QuoteRequestModal({
  listing,
  isOpen,
  onClose,
}: QuoteRequestModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [addressDetail, setAddressDetail] = useState('');
  const [needOperator, setNeedOperator] = useState(listing.is_operator_included);
  const [needFuel, setNeedFuel] = useState(listing.is_fuel_included);
  const [needTransport, setNeedTransport] = useState(listing.is_transport_included);
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const res = await createQuoteRequest({
      request_type: 'single_listing',
      listing_id: listing.id,
      category_id: listing.category_id,
      title: `${listing.title} İçin Teklif Talebi`,
      description: notes || `${listing.title} için fiyat teklifi ve müsaitlik talep edilmektedir.`,
      quantity,
      start_date: startDate || new Date().toISOString().split('T')[0],
      end_date: endDate || null,
      city_id: listing.city_id,
      district_id: listing.district_id,
      address_detail: addressDetail,
      lat: listing.lat,
      lng: listing.lng,
      need_operator: needOperator,
      need_fuel: needFuel,
      need_transport: needTransport,
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } else {
      setErrorMsg(res.error || 'Teklif talebi iletilemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[10px] font-bold uppercase text-orange-600 tracking-wider">
              Doğrudan Teklif Talebi
            </span>
            <h3 className="font-extrabold text-navy-900 text-base sm:text-lg line-clamp-1">
              {listing.title}
            </h3>
            <p className="text-xs text-slate-500">{listing.company?.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {success && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>Teklif talebiniz firmaya başarıyla iletildi! Firma yanıtı bildirim ve tekliflerim sayfasına düşecektir.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Tarihler */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Başlangıç / Teslim *
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bitiş Tarihi (Opsiyonel)
                </label>
                <div className="relative flex items-center">
                  <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Miktar & Konum */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adet / Miktar</label>
                <input
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Şantiye / Konum</label>
                <div className="relative flex items-center">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Şantiye adresi / mahalle"
                    value={addressDetail}
                    onChange={(e) => setAddressDetail(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Hizmet İhtiyaçları */}
            <div className="pt-1">
              <label className="block text-xs font-bold text-slate-700 mb-2">
                Hizmet & Kapsam İhtiyaçları
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={needOperator}
                    onChange={(e) => setNeedOperator(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>Operatör</span>
                </label>
                <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={needFuel}
                    onChange={(e) => setNeedFuel(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>Yakıt</span>
                </label>
                <label className="flex items-center gap-1.5 p-2 rounded-lg border border-slate-200 bg-slate-50 cursor-pointer text-xs font-semibold">
                  <input
                    type="checkbox"
                    checked={needTransport}
                    onChange={(e) => setNeedTransport(e.target.checked)}
                    className="rounded text-orange-500"
                  />
                  <span>Nakliye</span>
                </label>
              </div>
            </div>

            {/* Notlar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Şantiye Detayı ve Özel Talepler
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Örn: Zemin balçık, kırıcılı çalışma yapılacak, günlük 10 saat çalışma esası..."
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold text-xs"
              >
                İptal
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-xs shadow-md transition flex items-center gap-1.5 active:scale-95"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{loading ? 'Gönderiliyor...' : 'Teklif İsteğini İlet'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
