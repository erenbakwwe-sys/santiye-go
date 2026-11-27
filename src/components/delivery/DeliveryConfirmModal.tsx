'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  Truck,
  Building2,
  MapPin,
  AlertCircle,
  KeyRound,
  FileCheck2,
  ArrowRight,
  Lock,
} from 'lucide-react';
import {
  DeliveryWaybill,
  getWaybillByPin,
  getWaybillByToken,
  confirmDeliveryAndReleaseEscrow,
} from '@/lib/services/delivery-service';
import { getActiveProfile } from '@/lib/services/auth-service';

interface Props {
  initialTokenOrPin?: string;
  initialWaybill?: DeliveryWaybill | null;
  onSuccess?: (waybill: DeliveryWaybill) => void;
  onClose: () => void;
}

export default function DeliveryConfirmModal({
  initialTokenOrPin = '',
  initialWaybill = null,
  onSuccess,
  onClose,
}: Props) {
  // Onaylayan kimlik DAİMA doğrulanmış oturumdan gelir (prop ile aktör verilemez).
  // undefined = oturum yükleniyor, null = giriş yapılmamış
  const [actorId, setActorId] = useState<string | null | undefined>(undefined);
  const [pinOrToken, setPinOrToken] = useState(initialTokenOrPin);
  const [waybill, setWaybill] = useState<DeliveryWaybill | null>(initialWaybill);
  const [qtyConfirmed, setQtyConfirmed] = useState(true);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedWaybill, setCompletedWaybill] = useState<DeliveryWaybill | null>(
    initialWaybill?.status === 'DELIVERED' ? initialWaybill : null
  );

  useEffect(() => {
    let alive = true;
    getActiveProfile()
      .then((p) => alive && setActorId(p?.id ?? null))
      .catch(() => alive && setActorId(null));
    return () => {
      alive = false;
    };
  }, []);

  // Eğer token/PIN baştan verildiyse irsaliyeyi bul (yalnızca oturumdaki alıcının irsaliyeleri)
  useEffect(() => {
    if (initialTokenOrPin && !waybill && actorId) {
      const found =
        getWaybillByPin(initialTokenOrPin, actorId) || getWaybillByToken(initialTokenOrPin, actorId);
      if (found) {
        setWaybill(found);
        if (found.status === 'DELIVERED') setCompletedWaybill(found);
      }
    }
  }, [initialTokenOrPin, waybill, actorId]);

  // PIN değiştikçe otomatik bul
  const handlePinChange = (val: string) => {
    setPinOrToken(val);
    setErrorMessage('');
    const cleanPin = val.trim().replace(/\D/g, '');
    if (cleanPin.length === 6) {
      const found = getWaybillByPin(cleanPin, actorId ?? null);
      if (found) {
        setWaybill(found);
        if (found.status === 'DELIVERED') setCompletedWaybill(found);
      } else {
        setErrorMessage('Bu PIN koduna ait aktif bir sevkiyat bulunamadı.');
      }
    } else if (val.includes('-tok-')) {
      const found = getWaybillByToken(val.trim(), actorId ?? null);
      if (found) {
        setWaybill(found);
        if (found.status === 'DELIVERED') setCompletedWaybill(found);
      }
    }
  };

  const handleConfirm = async () => {
    if (!actorId) {
      setErrorMessage('Teslimatı onaylamak için alıcı hesabınızla giriş yapmalısınız.');
      return;
    }
    const code = pinOrToken.trim() || waybill?.delivery_pin || waybill?.delivery_token;
    if (!code) {
      setErrorMessage('Lütfen 6 haneli teslimat kodunu giriniz.');
      return;
    }

    if (!qtyConfirmed) {
      setErrorMessage('Teslimatı onaylamak için malzeme doğrulama onay kutucuğunu işaretleyiniz.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const res = await confirmDeliveryAndReleaseEscrow({
      tokenOrPin: code,
      actorUserId: actorId,
      deliveryNote: deliveryNote.trim() || undefined,
      quantityConfirmed: qtyConfirmed,
    });

    setLoading(false);

    if (res.success && res.waybill) {
      setCompletedWaybill(res.waybill);
      if (onSuccess) onSuccess(res.waybill);
    } else {
      setErrorMessage(res.error || 'Teslimat onaylanırken bir hata oluştu.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden text-navy-900 my-8">
        {/* Modal Başlığı */}
        <div className="bg-navy-900 text-white p-5 flex items-center justify-between border-b border-navy-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-md">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight leading-tight">
                Şantiye Teslimat Onayı & İrsaliye
              </h3>
              <p className="text-xs text-slate-300">
                Escrow Emanet Havuzu Çözümleme Protokolü
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-navy-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Başarılı Onay Kartı */}
        {completedWaybill ? (
          <div className="p-6 sm:p-8 space-y-6">
            <div className="p-5 bg-emerald-50 border-2 border-emerald-500 rounded-3xl text-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h4 className="text-lg font-black text-emerald-950">
                  Dijital İrsaliye Onaylandı!
                </h4>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  Emanet Ödeme Başarıyla Satıcı Hesabına Serbest Bırakıldı
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2.5">
              <div className="flex justify-between border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-bold">Malzeme / İş:</span>
                <span className="font-black text-navy-900">{completedWaybill.listing_title}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-bold">Miktar:</span>
                <span className="font-black text-navy-900">
                  {completedWaybill.quantity} {completedWaybill.unit}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-bold">Tedarikçi:</span>
                <span className="font-bold text-navy-900">{completedWaybill.company_name}</span>
              </div>
              <div className="flex justify-between border-b border-slate-200/70 pb-2">
                <span className="text-slate-500 font-bold">Serbest Bırakılan Tutar:</span>
                <span className="font-black text-orange-600">
                  {completedWaybill.total_price.toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-bold">Onay Zamanı:</span>
                <span className="font-mono text-slate-700">
                  {completedWaybill.delivered_at
                    ? new Date(completedWaybill.delivered_at).toLocaleString('tr-TR')
                    : 'Az önce'}
                </span>
              </div>
              {completedWaybill.delivery_note && (
                <div className="pt-2 border-t border-slate-200 text-xs text-slate-600">
                  <strong>Şantiye Şefi Notu:</strong> &ldquo;{completedWaybill.delivery_note}&rdquo;
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-black text-xs transition shadow-md"
            >
              Tamamla ve Kapat
            </button>
          </div>
        ) : (
          /* Onay Formu */
          <div className="p-6 space-y-5">
            {actorId === null && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-3">
                <span>Teslimatı yalnızca siparişin alıcısı onaylayabilir. Lütfen alıcı hesabınızla giriş yapın.</span>
                <Link
                  href={`/giris?redirect=${encodeURIComponent('/alici-paneli/rezervasyonlar')}`}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-navy-900 text-white font-bold"
                >
                  Giriş Yap
                </Link>
              </div>
            )}
            {errorMessage && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* PIN Kodu Girişi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Şoförün Ekranındaki 6 Haneli Teslimat Kodu:</span>
                <span className="text-xs text-orange-600 font-semibold">veya QR Token</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  maxLength={32}
                  value={pinOrToken}
                  onChange={(e) => handlePinChange(e.target.value)}
                  placeholder="Örn: 749215"
                  className="w-full px-4 py-3 rounded-2xl border-2 border-slate-300 focus:border-orange-500 text-center font-mono text-2xl font-black tracking-widest text-navy-900 focus:outline-none bg-slate-50 focus:bg-white transition"
                />
                <KeyRound className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Kodu şoförün cep telefonundaki dijital irsaliye kartından alabilirsiniz.
              </p>
            </div>

            {/* İrsaliye Bilgi Kartı */}
            {waybill && (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-xs font-bold text-slate-400">
                      Teslim Alınacak Kalem
                    </span>
                    <h4 className="text-sm font-black text-navy-900">
                      {waybill.listing_title}
                    </h4>
                  </div>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-orange-100 text-orange-800">
                    {waybill.quantity} {waybill.unit}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1 pt-1 border-t border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong>Tedarikçi:</strong> {waybill.company_name}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-slate-400" />
                    <span><strong>Şoför / Plaka:</strong> {waybill.driver_name} ({waybill.plate_number})</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-xs text-slate-500">
                    <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{waybill.site_address}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Şantiye Şefi Onay Kutucuğu */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={qtyConfirmed}
                  onChange={(e) => setQtyConfirmed(e.target.checked)}
                  className="w-4 h-4 mt-0.5 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-xs font-bold text-slate-800 leading-snug">
                  Sipariş edilen malzeme/ekipman şantiyede eksiksiz ve hasarsız teslim alındı.
                </span>
              </label>

              {/* Opsiyonel Teslimat Notu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Şantiye Şefi Teslim Notu (Opsiyonel):
                </label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Örn: 18 m³ C35 beton dökümü sorunsuz tamamlandı."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Escrow Bilgilendirmesi */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start gap-2 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                Bu onayla birlikte korumalı havuzda bloke edilmiş olan{' '}
                <strong>
                  {waybill?.total_price
                    ? `${waybill.total_price.toLocaleString('tr-TR')} ₺`
                    : 'sipariş bedeli'}
                </strong>{' '}
                anında tedarikçiye transfer edilecektir.
              </p>
            </div>

            {/* Onay Aksiyon Butonu */}
            <button
              type="button"
              disabled={loading || !actorId}
              onClick={handleConfirm}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm tracking-wide shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {loading
                ? 'Teslimat Onaylanıyor...'
                : 'TESLİMATI ONAYLA VE ÖDEMEYİ SERBEST BIRAK'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
