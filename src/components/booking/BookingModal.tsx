'use client';

import { useState } from 'react';
import { Listing } from '@/types/database';
import { createBookingRequest } from '@/lib/services/booking-service';
import {
  X,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Clock,
  MapPin,
  Wrench,
  Fuel,
  Truck,
  ShieldCheck,
} from 'lucide-react';

interface BookingModalProps {
  listing: Listing;
  isOpen: boolean;
  onClose: () => void;
}

export default function BookingModal({ listing, isOpen, onClose }: BookingModalProps) {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [notes, setNotes] = useState('');

  const [operatorIncluded, setOperatorIncluded] = useState(listing.is_operator_included);
  const [fuelIncluded, setFuelIncluded] = useState(listing.is_fuel_included);
  const [transportIncluded, setTransportIncluded] = useState(listing.is_transport_included);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Calculate day count & estimated price
  let dayCount = 0;
  if (startDate && endDate) {
    const s = new Date(startDate);
    const e = new Date(endDate);
    if (e >= s) {
      dayCount = Math.round((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1;
    }
  }

  const dailyPrice = Number(listing.price_daily) || 0;
  let estimatedTotal = dailyPrice * dayCount;

  // If weekly or monthly rates apply
  if (dayCount >= 30 && listing.price_monthly) {
    estimatedTotal = Number(listing.price_monthly) * Math.ceil(dayCount / 30);
  } else if (dayCount >= 7 && listing.price_weekly) {
    estimatedTotal = Number(listing.price_weekly) * Math.ceil(dayCount / 7);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dayCount <= 0) {
      setErrorMessage('Lütfen geçerli bir başlangıç ve bitiş tarihi seçiniz.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const res = await createBookingRequest({
      listing_id: listing.id,
      company_id: listing.company_id || 'f0000000-0000-0000-0000-000000000001',
      start_date: startDate,
      end_date: endDate,
      quantity: 1,
      daily_price_applied: dailyPrice,
      total_price: estimatedTotal,
      operator_included: operatorIncluded,
      fuel_included: fuelIncluded,
      transport_included: transportIncluded,
      site_address: siteAddress || `${listing.city_name || ''} Şantiye Sahası`,
      notes,
    });

    setLoading(false);

    if (res.success) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } else {
      setErrorMessage(res.error || 'Rezervasyon talebi iletilemedi.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <span className="text-[10px] font-bold uppercase text-orange-600 tracking-wider">
              Rezervasyon Talebi
            </span>
            <h3 className="font-black text-navy-900 text-base line-clamp-1">
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

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs sm:text-sm">
          {success && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                Rezervasyon talebiniz firmaya iletildi! Firma 48 saat içinde onayladığında rezervasyonunuz kesinleşecektir.
              </span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Dates Selection */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Başlangıç Tarihi *
              </label>
              <input
                type="date"
                required
                min={new Date().toISOString().split('T')[0]}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bitiş Tarihi *
              </label>
              <input
                type="date"
                required
                min={startDate || new Date().toISOString().split('T')[0]}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500 bg-slate-50"
              />
            </div>
          </div>

          {/* Price Estimation Bar */}
          {dayCount > 0 && (
            <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-600 block">
                  Hesaplanan Süre: {dayCount} Gün
                </span>
                <span className="text-[10px] text-slate-400">
                  (Günlük: {dailyPrice.toLocaleString('tr-TR')} ₺)
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-orange-700 block">
                  Tahmini Toplam Tutar
                </span>
                <span className="text-lg font-black text-orange-600">
                  {estimatedTotal.toLocaleString('tr-TR')} ₺
                </span>
              </div>
            </div>
          )}

          {/* Site address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Şantiye Teslimat Adresi *
            </label>
            <input
              type="text"
              required
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
              placeholder="Örn: Dilovası İMES OSB 12. Cadde No: 4"
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* Inclusions */}
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-slate-700 block">Hizmet Kapsamı</span>
            <div className="grid grid-cols-3 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={operatorIncluded}
                  onChange={(e) => setOperatorIncluded(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span>Operatör</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={fuelIncluded}
                  onChange={(e) => setFuelIncluded(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span>Yakıt</span>
              </label>
              <label className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 bg-slate-50 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={transportIncluded}
                  onChange={(e) => setTransportIncluded(e.target.checked)}
                  className="rounded text-orange-600"
                />
                <span>Nakliye</span>
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Şantiye Notu (Opsiyonel)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="İSG evrak talepleri, şantiye giriş saatleri vb."
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {/* 48 hour auto-expiration notice */}
          <div className="p-2.5 rounded-xl bg-slate-100 text-slate-600 flex items-start gap-2 text-[11px] leading-relaxed">
            <Clock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
            <span>
              Firma rezervasyon talebinizi 48 saat içinde yanıtlamazsa talep otomatik olarak iptal edilir ve hiçbir taahhüt oluşmaz.
            </span>
          </div>

          {/* Footer Submit */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs"
            >
              Vazgeç
            </button>
            <button
              type="submit"
              disabled={loading || success || dayCount <= 0}
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition disabled:opacity-50"
            >
              {loading ? 'İletiliyor...' : 'REZERVASYON TALEBİ GÖNDER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
