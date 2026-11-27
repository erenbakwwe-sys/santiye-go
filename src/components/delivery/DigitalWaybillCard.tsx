'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  QrCode,
  Truck,
  Building2,
  MapPin,
  CheckCircle2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Calendar,
  User,
  Clock,
  Printer,
  FileText,
} from 'lucide-react';
import { DeliveryWaybill } from '@/lib/services/delivery-service';
import { generateQRMatrix, generateQRSvgPath } from '@/lib/utils/qr';

interface Props {
  waybill: DeliveryWaybill;
  onClose?: () => void;
}

export default function DigitalWaybillCard({ waybill, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  // Doğrulama bağlantısı (QR kod içine gömülen URL)
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://santiyego.com';
  const confirmUrl = `${origin}/teslimat-onay/${waybill.delivery_token}`;

  // SVG QR Matrisi (hata olursa kart çökmez; PIN ile teslimat yine mümkün)
  let pathData = '';
  let matrixSize = 0;
  try {
    const matrix = generateQRMatrix(confirmUrl);
    pathData = generateQRSvgPath(matrix);
    matrixSize = matrix.length + 8; // 4 modül sessiz bölge, her yanda
  } catch {
    pathData = '';
  }

  const handleCopyPin = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(waybill.delivery_pin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const isDelivered = waybill.status === 'DELIVERED';

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-xl w-full text-navy-900 animate-in fade-in zoom-in-95">
      {/* İrsaliye Üst Başlık (Official e-İrsaliye Şeridi) */}
      <div className="bg-navy-900 text-white p-5 sm:p-6 relative overflow-hidden">

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-orange-500 text-white flex items-center justify-center font-black shadow-md">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-black text-orange-400 block">
                ŞantiyeGO Dijital Sevk İrsaliyesi
              </span>
              <h2 className="text-base sm:text-lg font-black tracking-tight">
                Dijital Teslimat & QR Fişi
              </h2>
            </div>
          </div>

          <div className="text-right">
            <span className="font-mono text-xs text-slate-300 block">
              #{waybill.id.slice(-8).toUpperCase()}
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold mt-1 ${
                isDelivered
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  : 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
              }`}
            >
              {isDelivered ? '● TESLİM EDİLDİ' : '● SEVKİYAT HALİNDE'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6 space-y-5">
        {/* Sevkiyat ve Şantiye Özeti */}
        <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/80 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-400">
                Malzeme / Ekipman
              </span>
              <h3 className="text-sm sm:text-base font-black text-navy-900 leading-snug">
                {waybill.material_summary || waybill.listing_title}
              </h3>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs font-bold text-slate-400">Miktar</span>
              <div className="text-sm font-black text-orange-600">
                {waybill.quantity} {waybill.unit}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
            <div className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">
                <strong>Alıcı:</strong> {waybill.buyer_name}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                <strong>Plaka:</strong> {waybill.plate_number}
              </span>
            </div>
            <div className="sm:col-span-2 flex items-start gap-1.5 text-xs text-slate-500">
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
              <span className="line-clamp-2">
                <strong>Teslim Şantiyesi:</strong> {waybill.site_address}
              </span>
            </div>
          </div>
        </div>

        {/* QR KOD & 6 HANELİ PIN KODU KUTUSU (Güneş altında şantiye dostu) */}
        <div className="bg-white rounded-3xl p-5 border-2 border-orange-200 text-center space-y-4">
          <div className="flex items-center justify-center gap-1.5 text-xs font-black text-navy-900">
            <QrCode className="w-4 h-4 text-orange-500" />
            <span>Şantiyede Görevliye Okutunuz</span>
          </div>

          {/* SVG QR KOD (Sıfır bağımlılık, anında yüklenir) */}
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-2xl border-2 border-slate-900 shadow-md inline-block">
              {pathData ? (
                <svg
                  viewBox={`0 0 ${matrixSize} ${matrixSize}`}
                  className="w-44 h-44 sm:w-48 sm:h-48"
                  shapeRendering="crispEdges"
                  role="img"
                  aria-label="Teslimat doğrulama QR kodu"
                >
                  <rect width="100%" height="100%" fill="#ffffff" />
                  <path d={pathData} fill="#0f172a" />
                </svg>
              ) : (
                <div className="w-44 h-44 sm:w-48 sm:h-48 flex items-center justify-center text-xs text-slate-500 text-center px-3">
                  QR oluşturulamadı. Alıcı aşağıdaki 6 haneli kodu girerek onaylayabilir.
                </div>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 max-w-xs mx-auto">
            Şantiye şefi cep telefonu kamerasıyla yukarıdaki QR kodu okutarak teslimatı tek tıkla onaylar.
          </p>

          {/* 6 Haneli Sayısal PIN Kodu (Eldiven / Güneş Işığı Koruması) */}
          <div className="pt-2 border-t border-orange-100">
            <span className="text-xs font-bold text-slate-500 block mb-1">
              Kamera Çalışmazsa 6 Haneli Teslimat PIN Kodu:
            </span>
            <div className="inline-flex items-center gap-2 bg-navy-900 text-white px-5 py-2.5 rounded-2xl shadow-md border border-navy-800">
              <span className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-orange-400 select-all">
                {waybill.delivery_pin.slice(0, 3)} {waybill.delivery_pin.slice(3)}
              </span>
              <button
                type="button"
                onClick={handleCopyPin}
                className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-navy-800 transition"
                title="Kodu Kopyala"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            {copied && (
              <span className="text-xs font-bold text-emerald-600 block mt-1">
                PIN Kodu Kopyalandı!
              </span>
            )}
          </div>
        </div>

        {/* Escrow Güvence Notu */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <p className="text-xs leading-relaxed">
            <strong>Escrow Ödeme Güvencesi:</strong> Şantiye şefi QR kodu okuttuğu veya PIN kodunu girdiği an hakediş bedeli havuzdan satıcı hesabına anında serbest bırakılır.
          </p>
        </div>

        {/* Butonlar */}
        <div className="flex items-center gap-2 pt-2">
          <Link
            href={`/teslimat-onay/${waybill.delivery_token}`}
            target="_blank"
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs text-center transition shadow-md flex items-center justify-center gap-1.5"
          >
            <span>Onay Ekranını Aç</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              Kapat
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
