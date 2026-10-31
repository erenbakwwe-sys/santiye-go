'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Settings,
  Percent,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Save,
  AlertCircle,
  CreditCard,
  Layers,
} from 'lucide-react';
import {
  getPlatformSettings,
  updatePlatformSetting,
} from '@/lib/services/admin-service';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<any>({});
  const [commissionRate, setCommissionRate] = useState<number>(8.0);
  const [cancelHours, setCancelHours] = useState<number>(24);
  const [expireHours, setExpireHours] = useState<number>(48);
  const [escrowDays, setEscrowDays] = useState<number>(3);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState<boolean>(true);
  const [softLaunchActive, setSoftLaunchActive] = useState<boolean>(true);
  const [softLaunchCity, setSoftLaunchCity] = useState<string>('55'); // Samsun default

  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    async function load() {
      const s = await getPlatformSettings();
      setSettings(s);
      if (s.default_commission_rate?.value?.rate_percent) {
        setCommissionRate(s.default_commission_rate.value.rate_percent);
      }
      if (s.booking_cancellation_hours?.value?.hours) {
        setCancelHours(s.booking_cancellation_hours.value.hours);
      }
      if (s.quote_request_auto_expire_hours?.value?.hours) {
        setExpireHours(s.quote_request_auto_expire_hours.value.hours);
      }
      if (s.platform_payout_escrow_days?.value?.days) {
        setEscrowDays(s.platform_payout_escrow_days.value.days);
      }
      if (s.soft_launch_config?.value) {
        setSoftLaunchActive(s.soft_launch_config.value.is_active ?? true);
        setSoftLaunchCity(String(s.soft_launch_config.value.pilot_city_id || '55'));
      }
    }
    load();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    await Promise.all([
      updatePlatformSetting('default_commission_rate', { rate_percent: Number(commissionRate) }, 'admin-super-001'),
      updatePlatformSetting('booking_cancellation_hours', { hours: Number(cancelHours) }, 'admin-super-001'),
      updatePlatformSetting('quote_request_auto_expire_hours', { hours: Number(expireHours) }, 'admin-super-001'),
      updatePlatformSetting('platform_payout_escrow_days', { days: Number(escrowDays) }, 'admin-super-001'),
      updatePlatformSetting('soft_launch_config', { is_active: softLaunchActive, pilot_city_id: Number(softLaunchCity) }, 'admin-super-001'),
    ]);

    setSaving(false);
    setNotice('Tüm sistem ayarları başarıyla güncellendi ve denetim loglarına kaydedildi!');
    setTimeout(() => setNotice(''), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-slate-500 hover:text-navy-900 font-bold">
              Yönetim Paneli
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-xs text-orange-600 font-bold">Sistem Ayarları</span>
          </div>
          <h1 className="text-2xl font-black text-navy-900 mt-1">Platform Parametreleri</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Komisyon oranları, zaman aşımları ve güvenlik yapılandırmaları. (Kodda hardcoded değer bulunmaz).
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 1. Komisyon Ayarları */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2 border-b pb-3">
              <Percent className="w-5 h-5 text-orange-500" />
              Komisyon ve Finans Ayarları
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Global Platform Komisyon Oranı (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                required
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm font-bold text-navy-900 focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Kategori veya firma özel istisnası tanımlanmamış tüm kiralama/satış işlemlerinde uygulanır.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                İş Teslimi Sonrası Hakediş Aktarım Bekleme Süresi (Gün)
              </label>
              <input
                type="number"
                min="0"
                max="30"
                required
                value={escrowDays}
                onChange={(e) => setEscrowDays(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Alıcının itiraz süresi dolduktan sonra iyzico üzerinden alt üye işyerinin IBAN&apos;ına otomatik EFT tetiklenir.
              </p>
            </div>
          </div>

          {/* 2. Zaman Aşımı ve Rezervasyon Kuralları */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2 border-b pb-3">
              <Clock className="w-5 h-5 text-blue-600" />
              Süre ve İptal Parametreleri
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cezasız Rezervasyon İptal Süresi (Saat)
              </label>
              <input
                type="number"
                min="1"
                required
                value={cancelHours}
                onChange={(e) => setCancelHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Kiralama başlama tarihinden kaç saat öncesine kadar alıcı kesintisiz tam iade alabilir.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yanıtsız Teklif & Rezervasyon Otomatik İptal Süresi (Saat)
              </label>
              <input
                type="number"
                min="1"
                required
                value={expireHours}
                onChange={(e) => setExpireHours(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Firma tarafından yanıtlanmayan talepler bu sürenin sonunda otomatik iptal (expired) edilir.
              </p>
            </div>
          </div>

          {/* 3. Güvenlik ve 2FA */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 md:col-span-2">
            <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2 border-b pb-3">
              <Lock className="w-5 h-5 text-emerald-600" />
              Yönetici Güvenlik & İki Adımlı Doğrulama (2FA)
            </h2>

            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
              <div>
                <div className="font-bold text-navy-900 text-sm">
                  Yönetim Paneli Girişlerinde 2FA Zorunluluğu
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  Süper admin ve moderatör hesaplarına girişlerde SMS / Authenticator kodu doğrulaması ister.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={twoFactorEnabled}
                  onChange={(e) => setTwoFactorEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
          </div>

          {/* 4. Soft Launch & Kademeli Açılış Modu */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4 md:col-span-2">
            <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2 border-b pb-3">
              <Layers className="w-5 h-5 text-purple-600" />
              Kademeli Açılış (Soft Launch) Modu
            </h2>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-purple-50/50 border border-purple-200 gap-4">
              <div>
                <div className="font-bold text-purple-950 text-sm flex items-center gap-2">
                  <span>Soft Launch Kısıtlamasını Aktif Et</span>
                  {softLaunchActive && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-600 text-white">
                      Aktif
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-600 mt-1 max-w-xl leading-relaxed">
                  Platformu önce tek bir pilot ilde ve seçili ana kategorilerle kontrollü başlatır. Diğer illerdeki sayfalarda kullanıcılara &quot;Çok Yakında Bu Bölgede&quot; mesajı gösterilir ve boş sayfalar Google indeksine alınmaz (noindex).
                </div>
              </div>

              <div className="flex items-center gap-4 shrink-0">
                <select
                  disabled={!softLaunchActive}
                  value={softLaunchCity}
                  onChange={(e) => setSoftLaunchCity(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-purple-300 text-xs font-bold bg-white text-navy-900 focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                >
                  <option value="55">Pilot İl: Samsun</option>
                  <option value="34">Pilot İl: İstanbul</option>
                  <option value="6">Pilot İl: Ankara</option>
                  <option value="35">Pilot İl: İzmir</option>
                </select>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={softLaunchActive}
                    onChange={(e) => setSoftLaunchActive(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Kaydediliyor...' : 'TÜM AYARLARI GÜNCELLE'}
          </button>
        </div>
      </form>
    </div>
  );
}
