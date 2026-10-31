'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Wrench,
  AlertCircle,
  Clock,
  Layers,
  ArrowLeft,
  Save,
} from 'lucide-react';
import { DEMO_LISTINGS } from '@/lib/mock-data';
import {
  getListingAvailability,
  setBatchAvailability,
  CalendarDayStatus,
} from '@/lib/services/calendar-service';

export default function CompanyCalendarPage() {
  const companyListings = DEMO_LISTINGS.filter(
    (l) => l.company_id === 'f0000000-0000-0000-0000-000000000001'
  );

  const [selectedListingId, setSelectedListingId] = useState<string>(
    companyListings[0]?.id || '10000000-0000-0000-0000-000000000001'
  );

  const [currentDate, setCurrentDate] = useState(new Date(2026, 10, 1)); // November 2026
  const [dayStatuses, setDayStatuses] = useState<CalendarDayStatus[]>([]);
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [targetStatus, setTargetStatus] = useState<'available' | 'booked' | 'maintenance'>('booked');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1; // 1-12

  const loadCalendar = async () => {
    const data = await getListingAvailability(selectedListingId, year, month);
    setDayStatuses(data);
  };

  useEffect(() => {
    loadCalendar();
    setSelectedDates([]);
  }, [selectedListingId, currentDate]);

  const daysInMonth = new Date(year, month, 0).getDate();
  const firstDayOfWeek = (new Date(year, month - 1, 1).getDay() + 6) % 7; // Monday = 0

  const toggleDateSelection = (dateStr: string) => {
    if (selectedDates.includes(dateStr)) {
      setSelectedDates(selectedDates.filter((d) => d !== dateStr));
    } else {
      setSelectedDates([...selectedDates, dateStr]);
    }
  };

  const handleBatchSave = async () => {
    if (selectedDates.length === 0) return;
    setSaving(true);
    await setBatchAvailability(selectedListingId, selectedDates, targetStatus, notes);
    setSaving(false);
    setSaveSuccess(true);
    setSelectedDates([]);
    setNotes('');
    loadCalendar();
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, currentDate.getMonth() + 1, 1));
  };

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
  ];

  const currentListing = companyListings.find((l) => l.id === selectedListingId) || companyListings[0];

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/firma-paneli"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Firma Paneline Dön
          </Link>
          <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2.5 py-1 rounded-md border border-orange-200">
            Müsaitlik & Stok Yönetimi
          </span>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-navy-900 flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-orange-500" />
              İş Makinesi Müsaitlik Takvimi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Makinelerinizin kirada, müsait veya bakımda olduğu günleri belirleyin. Onaylanan rezervasyonlar otomatik işlenir.
            </p>
          </div>

          {/* Listing Selector Dropdown */}
          <div className="shrink-0 w-full md:w-80">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Makine / İlan Seçin:
            </label>
            <select
              value={selectedListingId}
              onChange={(e) => setSelectedListingId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs sm:text-sm font-bold text-navy-900 focus:ring-2 focus:ring-orange-500 bg-slate-50"
            >
              {companyListings.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center gap-2 text-sm shadow-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Takvim güncellemeleri başarıyla kaydedildi!</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Main Calendar View (8 Cols) */}
          <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
            {/* Month Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-black text-navy-900">
                {monthNames[currentDate.getMonth()]} {year}
              </h2>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                  title="Önceki Ay"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                  title="Sonraki Ay"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-emerald-500" />
                <span className="text-slate-600">Müsait (Kiralayabilir)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-red-500" />
                <span className="text-slate-600">Dolu / Kirada</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded bg-amber-500" />
                <span className="text-slate-600">Bakımda</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded border-2 border-orange-500 bg-orange-100" />
                <span className="text-orange-700">Seçili Gün</span>
              </div>
            </div>

            {/* Days of Week Header */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-black text-slate-400 uppercase tracking-wider">
              <div>Pzt</div>
              <div>Sal</div>
              <div>Çar</div>
              <div>Per</div>
              <div>Cum</div>
              <div>Cmt</div>
              <div>Paz</div>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-2">
              {/* Empty leading days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 rounded-xl bg-slate-50/50 opacity-30" />
              ))}

              {/* Month Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const entry = dayStatuses.find((d) => d.date === dateStr);
                const isSelected = selectedDates.includes(dateStr);

                let statusBadge = (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/80 px-1 rounded">
                    Müsait
                  </span>
                );

                let bgClass = 'border-slate-200 hover:border-slate-400 bg-white';
                if (entry?.status === 'booked') {
                  bgClass = 'border-red-200 bg-red-50/60';
                  statusBadge = (
                    <span className="text-[10px] font-bold text-red-700 bg-red-100 px-1 rounded">
                      Kirada
                    </span>
                  );
                } else if (entry?.status === 'maintenance') {
                  bgClass = 'border-amber-200 bg-amber-50/60';
                  statusBadge = (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1 rounded">
                      Bakımda
                    </span>
                  );
                }

                if (isSelected) {
                  bgClass = 'border-2 border-orange-500 bg-orange-50/80 shadow-md ring-2 ring-orange-200';
                }

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => toggleDateSelection(dateStr)}
                    className={`h-20 p-2 rounded-xl border flex flex-col justify-between text-left transition select-none ${bgClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-extrabold text-navy-900">{dayNum}</span>
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" />
                      )}
                    </div>
                    <div>{statusBadge}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Batch Actions Toolbar (4 Cols) */}
          <div className="lg:col-span-4 space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
              <h3 className="text-base font-extrabold text-navy-900 border-b border-slate-100 pb-2">
                Toplu Gün Güncelleme
              </h3>

              <div>
                <span className="text-xs text-slate-500">Seçilen Gün Sayısı:</span>
                <div className="text-xl font-black text-orange-600 mt-0.5">
                  {selectedDates.length} Gün Seçildi
                </div>
              </div>

              {selectedDates.length > 0 && (
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-lg text-[10px] text-slate-600 font-mono">
                  {selectedDates.sort().map((d) => (
                    <span key={d} className="px-1.5 py-0.5 rounded bg-white border border-slate-200">
                      {d.slice(5)}
                    </span>
                  ))}
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Uygulanacak Durum:
                </label>
                <div className="grid grid-cols-1 gap-2">
                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${
                      targetStatus === 'available'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={targetStatus === 'available'}
                      onChange={() => setTargetStatus('available')}
                      className="text-emerald-600"
                    />
                    <span>Müsait (Kiralamaya Açık)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${
                      targetStatus === 'booked'
                        ? 'border-red-500 bg-red-50 text-red-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={targetStatus === 'booked'}
                      onChange={() => setTargetStatus('booked')}
                      className="text-red-600"
                    />
                    <span>Dolu / Kirada (Seçilemez)</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer text-xs font-bold transition ${
                      targetStatus === 'maintenance'
                        ? 'border-amber-500 bg-amber-50 text-amber-900'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={targetStatus === 'maintenance'}
                      onChange={() => setTargetStatus('maintenance')}
                      className="text-amber-600"
                    />
                    <span>Periyodik Bakımda / Tamir</span>
                  </label>
                </div>
              </div>

              {/* Notes input */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Şantiye / Bakım Notu:
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Örn: 250 saat motor bakımı"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Save Button */}
              <button
                type="button"
                disabled={selectedDates.length === 0 || saving}
                onClick={handleBatchSave}
                className="w-full py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition disabled:opacity-40 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Kaydediliyor...' : 'SEÇİLİ GÜNLERİ GÜNCELLE'}
              </button>

              {selectedDates.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedDates([])}
                  className="w-full py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 text-xs font-bold"
                >
                  Seçimi Temizle
                </button>
              )}
            </div>

            {/* Machinery Stock Info Box */}
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-xs space-y-2">
              <h4 className="font-extrabold text-navy-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-orange-500" />
                Makine Bilgisi & Stok
              </h4>
              <p className="text-slate-600">
                <strong>Model:</strong> {currentListing?.title}
              </p>
              <p className="text-slate-600">
                <strong>Stok Miktarı:</strong> {currentListing?.stock_quantity || 1} Adet
              </p>
              <p className="text-slate-500 text-[11px] leading-relaxed pt-1 border-t border-slate-100">
                Stok adedi 1 olan makinelerde bir güne onaylı rezervasyon girildiğinde, sistem o günü diğer tüm alıcılara otomatik kapatır.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
