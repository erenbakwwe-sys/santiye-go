'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2,
  ShieldCheck,
  Truck,
  Building2,
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Lock,
} from 'lucide-react';
import {
  DeliveryWaybill,
  getWaybillByToken,
  confirmDeliveryAndReleaseEscrow,
} from '@/lib/services/delivery-service';
import { getActiveProfile } from '@/lib/services/auth-service';

export default function TokenDeliveryConfirmPage() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params?.token === 'string' ? params.token : '';

  // undefined = oturum yükleniyor, null = giriş yapılmamış, string = oturumdaki kullanıcı
  const [actorId, setActorId] = useState<string | null | undefined>(undefined);
  const [waybill, setWaybill] = useState<DeliveryWaybill | null>(null);
  const [qtyConfirmed, setQtyConfirmed] = useState(true);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedWaybill, setCompletedWaybill] = useState<DeliveryWaybill | null>(null);

  useEffect(() => {
    let alive = true;
    getActiveProfile()
      .then((p) => alive && setActorId(p?.id ?? null))
      .catch(() => alive && setActorId(null));
    return () => {
      alive = false;
    };
  }, []);

  // İrsaliye bilgisi yalnızca oturumdaki ALICI için gösterilir (QR'ı gören herkes detay/onay göremez)
  useEffect(() => {
    if (!token || !actorId) return;
    const found = getWaybillByToken(token, actorId);
    if (found) {
      setWaybill(found);
      if (found.status === 'DELIVERED') {
        setCompletedWaybill(found);
      }
    } else {
      setWaybill(null);
      setErrorMessage('Geçersiz teslimat QR kodu veya bu teslimat hesabınıza ait değil.');
    }
  }, [token, actorId]);

  const handleConfirm = async () => {
    if (!waybill || !actorId) return;

    if (!qtyConfirmed) {
      setErrorMessage('Teslimatı onaylamak için malzeme doğrulama kutucuğunu işaretleyiniz.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const res = await confirmDeliveryAndReleaseEscrow({
      tokenOrPin: waybill.delivery_token,
      actorUserId: actorId,
      deliveryNote: deliveryNote.trim() || undefined,
      quantityConfirmed: qtyConfirmed,
    });

    setLoading(false);

    if (res.success && res.waybill) {
      setCompletedWaybill(res.waybill);
    } else {
      setErrorMessage(res.error || 'Teslimat onaylanırken bir hata oluştu.');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/alici-paneli/rezervasyonlar"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Siparişlerime Dön
        </Link>

        {/* Hero Header */}
        <div className="bg-navy-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500 flex items-center justify-center font-black">
              <FileCheck2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 text-xs font-black border border-orange-500/30">
                QR Doğrulama Bağlantısı
              </span>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">
                Şantiye Malzeme Teslimat Onayı
              </h1>
            </div>
          </div>
          <p className="text-xs text-slate-300 relative z-10 leading-relaxed mt-2">
            Kamera ile taranan dijital irsaliye detayları aşağıdadır. Kontrol edip onayladığınızda
            emanet hakediş satıcıya serbest bırakılacaktır.
          </p>
        </div>

        {/* Başarılı Onay Kartı */}
        {completedWaybill ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            <div className="p-6 bg-emerald-50 border-2 border-emerald-500 rounded-3xl text-center space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div>
                <h2 className="text-xl font-black text-emerald-950">
                  Dijital İrsaliye Onaylandı!
                </h2>
                <p className="text-xs text-emerald-700 font-semibold mt-1">
                  Emanet Ödeme Başarıyla Satıcı Hesabına Serbest Bırakıldı
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 text-xs space-y-3">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">Malzeme / İş:</span>
                <span className="font-black text-navy-900">{completedWaybill.listing_title}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">Miktar:</span>
                <span className="font-black text-navy-900">
                  {completedWaybill.quantity} {completedWaybill.unit}
                </span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">Tedarikçi:</span>
                <span className="font-bold text-navy-900">{completedWaybill.company_name}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500 font-bold">Serbest Bırakılan Tutar:</span>
                <span className="font-black text-orange-600 text-sm">
                  {completedWaybill.total_price.toLocaleString('tr-TR')} ₺
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500 font-bold">Teslim Tarihi:</span>
                <span className="font-mono text-slate-700">
                  {completedWaybill.delivered_at
                    ? new Date(completedWaybill.delivered_at).toLocaleString('tr-TR')
                    : 'Yeni Onaylandı'}
                </span>
              </div>
              {completedWaybill.delivery_note && (
                <div className="pt-2 border-t text-xs text-slate-600">
                  <strong>Şantiye Şefi Notu:</strong> &ldquo;{completedWaybill.delivery_note}&rdquo;
                </div>
              )}
            </div>

            <Link
              href="/alici-paneli/rezervasyonlar"
              className="block w-full py-3.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-black text-xs text-center transition shadow-md"
            >
              Siparişlerime Dön
            </Link>
          </div>
        ) : waybill ? (
          /* İrsaliye Onay Formu */
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm">
            {errorMessage && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-400">
                    Teslim Alınacak Kalem
                  </span>
                  <h3 className="text-base font-black text-navy-900">
                    {waybill.listing_title}
                  </h3>
                </div>
                <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-orange-100 text-orange-800">
                  {waybill.quantity} {waybill.unit}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span><strong>Tedarikçi:</strong> {waybill.company_name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  <span><strong>Şoför / Plaka:</strong> {waybill.driver_name} ({waybill.plate_number})</span>
                </div>
                <div className="sm:col-span-2 flex items-start gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0 mt-0.5" />
                  <span><strong>Şantiye Adresi:</strong> {waybill.site_address}</span>
                </div>
              </div>
            </div>

            {/* Doğrulama Kutucuğu */}
            <div className="space-y-3">
              <label className="flex items-start gap-2.5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Şantiye Şefi Notu (Opsiyonel):
                </label>
                <input
                  type="text"
                  value={deliveryNote}
                  onChange={(e) => setDeliveryNote(e.target.value)}
                  placeholder="Örn: 18 m³ C35 beton eksiksiz teslim alındı."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Escrow Bilgilendirmesi */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5 text-xs text-emerald-900">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <p className="text-xs leading-relaxed">
                <strong>Emanet Ödeme Serbest Bırakma:</strong> Bu buton onaylandığında havuzda bloke edilmiş olan{' '}
                <strong>{waybill.total_price.toLocaleString('tr-TR')} ₺</strong> hakediş bedeli anında tedarikçiye aktarılacaktır.
              </p>
            </div>

            <button
              type="button"
              disabled={loading}
              onClick={handleConfirm}
              className="w-full py-4 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm tracking-wide shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              {loading
                ? 'Teslimat Onaylanıyor...'
                : 'TESLİMATI ONAYLA VE ÖDEMEYİ SERBEST BIRAK'}
            </button>
          </div>
        ) : actorId === null ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
            <Lock className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-navy-900">Alıcı Girişi Gerekli</h3>
            <p className="text-xs text-slate-500">
              Teslimatı yalnızca siparişin alıcısı onaylayabilir. Devam etmek için alıcı hesabınızla giriş yapın.
            </p>
            <Link
              href={`/giris?redirect=${encodeURIComponent(`/teslimat-onay/${token}`)}`}
              className="inline-flex px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold text-xs"
            >
              Giriş Yap
            </Link>
          </div>
        ) : actorId === undefined ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center text-xs text-slate-500">
            Oturum doğrulanıyor...
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center space-y-4">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-navy-900">İrsaliye Bulunamadı</h3>
            <p className="text-xs text-slate-500">
              {errorMessage || 'Teslimat kodu doğrulanamadı. Lütfen 6 haneli kodu elle giriniz.'}
            </p>
            <Link
              href="/teslimat-onay"
              className="inline-flex px-5 py-2.5 rounded-xl bg-navy-900 text-white font-bold text-xs"
            >
              PIN ile Doğrulama Sayfasına Git
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
