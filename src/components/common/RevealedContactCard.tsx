'use client';

import { Phone, MessageCircle, MapPin, Building2, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ContactCardDetails } from '@/lib/services/reveal-service';

interface RevealedContactCardProps {
  details: ContactCardDetails;
  roleLabel?: string;
}

export default function RevealedContactCard({ details, roleLabel = 'Firma İletişim Kartı' }: RevealedContactCardProps) {
  const cleanPhone = (details.phone || '').replace(/[^0-9]/g, '');

  return (
    <div className="bg-gradient-to-br from-emerald-50/80 to-white border-2 border-emerald-500/40 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-emerald-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-black text-navy-900 uppercase tracking-wider">{roleLabel}</h4>
            <div className="flex items-center gap-1 text-[11px] text-emerald-700 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Teklif/Rezervasyon Onaylandı (İletişim Açıldı)</span>
            </div>
          </div>
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-extrabold uppercase">
          Onaylı
        </span>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Firma / Yetkili</span>
          <div className="font-extrabold text-navy-900 text-sm flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-orange-500 shrink-0" />
            <span>{details.companyName || details.fullName}</span>
          </div>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Telefon Numarası</span>
          <div>
            <a
              href={`tel:${details.phone}`}
              className="font-black text-navy-900 hover:text-orange-600 text-sm flex items-center gap-1.5 transition"
            >
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{details.phone || 'Belirtilmedi'}</span>
            </a>
          </div>
        </div>

        <div className="sm:col-span-2 space-y-1">
          <span className="text-[10px] font-bold text-slate-400 uppercase">Tam Şantiye / Garaj Adresi</span>
          <div className="text-slate-700 flex items-start gap-1.5">
            <MapPin className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
            <span className="font-medium">{details.fullAddress || `${details.districtName}, ${details.cityName}`}</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-emerald-100/80">
        <a
          href={`tel:${details.phone}`}
          className="flex-1 py-2.5 px-4 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs transition flex items-center justify-center gap-2 text-center"
        >
          <Phone className="w-3.5 h-3.5 text-orange-400" />
          <span>Hemen Ara ({details.phone})</span>
        </a>

        {cleanPhone && (
          <a
            href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent('Merhaba, Şantiye GO üzerinden onaylanan işlemimiz hakkında yazıyorum.')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition flex items-center justify-center gap-2 text-center shadow-sm"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            <span>WhatsApp ile Görüş</span>
          </a>
        )}
      </div>

      <p className="text-[10px] text-slate-400 text-center italic">
        * Bu iletişim kartı yalnızca teklifi/rezervasyonu onaylayan taraflara gösterilmektedir (Row Level Security).
      </p>
    </div>
  );
}
