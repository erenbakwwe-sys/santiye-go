'use client';

import { useState, useEffect } from 'react';
import {
  Coins,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  Settings,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Clock,
  Eye,
  Check,
  X,
  FileQuestion,
  Users,
  Search,
  Sparkles,
  BarChart2,
  ArrowUpRight,
} from 'lucide-react';
import {
  CreditPackage,
  QuoteCreditConfig,
  QuoteDispute,
  CompanyCreditLedger,
} from '@/types/database';
import {
  getCreditConfig,
  updateCreditConfig,
  getCreditPackages,
  saveCreditPackage,
  deleteCreditPackage,
  getQuoteDisputes,
  resolveQuoteDispute,
  adminAdjustCredits,
  getCreditSystemStats,
} from '@/lib/services/credit-service';

export default function AdminCreditsPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'packages' | 'disputes' | 'manual'>(
    'overview'
  );
  const [loading, setLoading] = useState(true);

  // Stats & Config
  const [stats, setStats] = useState<any>(null);
  const [config, setConfig] = useState<QuoteCreditConfig | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [disputes, setDisputes] = useState<QuoteDispute[]>([]);

  // Package Form State
  const [pkgModalOpen, setPkgModalOpen] = useState(false);
  const [editingPkg, setEditingPkg] = useState<Partial<CreditPackage> | null>(null);
  const [pkgSaving, setPkgSaving] = useState(false);

  // Manual Adjust State
  const [manualCompId, setManualCompId] = useState('f0000000-0000-0000-0000-000000000001');
  const [manualAmount, setManualAmount] = useState<number>(10);
  const [manualNotes, setManualNotes] = useState('');
  const [manualSubmitting, setManualSubmitting] = useState(false);

  // Dispute Resolve State
  const [resolvingDispute, setResolvingDispute] = useState<QuoteDispute | null>(null);
  const [resolveAction, setResolveAction] = useState<'approved' | 'rejected'>('approved');
  const [resolveNotes, setResolveNotes] = useState('');
  const [resolveSubmitting, setResolveSubmitting] = useState(false);

  // Notice Alert
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cfg, pkgs, disps, st] = await Promise.all([
        getCreditConfig(),
        getCreditPackages(false),
        getQuoteDisputes(),
        getCreditSystemStats(),
      ]);

      setConfig(cfg);
      setPackages(pkgs);
      setDisputes(disps);
      setStats(st);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const triggerNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Change System Mode (OFF / SHADOW / ACTIVE)
  const handleModeChange = async (mode: 'OFF' | 'SHADOW' | 'ACTIVE') => {
    if (!config) return;
    const res = await updateCreditConfig({ mode });
    if (res.success) {
      setConfig(res.config);
      triggerNotice(`Kredi sistemi modu [${mode}] olarak güncellendi.`);
    }
  };

  // Save Settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    const res = await updateCreditConfig(config);
    if (res.success) {
      setConfig(res.config);
      triggerNotice('Kredi ve slot ayarları başarıyla kaydedildi.');
    }
  };

  // Package Save
  const handleSavePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPkg) return;
    setPkgSaving(true);

    const res = await saveCreditPackage(editingPkg);
    setPkgSaving(false);

    if (res.success) {
      setPkgModalOpen(false);
      setEditingPkg(null);
      triggerNotice('Kredi paketi kaydedildi.');
      loadData();
    } else {
      triggerNotice(res.error || 'Paket kaydedilemedi.', 'error');
    }
  };

  // Package Delete
  const handleDeletePackage = async (id: string) => {
    if (!confirm('Bu kredi paketini silmek istediğinize emin misiniz?')) return;
    await deleteCreditPackage(id);
    triggerNotice('Paket silindi.');
    loadData();
  };

  // Manual Adjust
  const handleManualAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualNotes.trim()) {
      triggerNotice('Lütfen işlem gerekçesini yazınız.', 'error');
      return;
    }

    setManualSubmitting(true);
    const res = await adminAdjustCredits('admin-super-001', manualCompId, manualAmount, manualNotes);
    setManualSubmitting(false);

    if (res.success) {
      setManualNotes('');
      triggerNotice(`Firma bakiyesine ${manualAmount > 0 ? '+' : ''}${manualAmount} kredi işlendi.`);
      loadData();
    } else {
      triggerNotice(res.error || 'İşlem başarısız.', 'error');
    }
  };

  // Dispute Resolve
  const handleResolveDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingDispute) return;
    setResolveSubmitting(true);

    const res = await resolveQuoteDispute(
      resolvingDispute.id,
      'admin-super-001',
      resolveAction,
      resolveNotes
    );
    setResolveSubmitting(false);

    if (res.success) {
      setResolvingDispute(null);
      setResolveNotes('');
      triggerNotice(
        resolveAction === 'approved'
          ? 'İtiraz onaylandı, 1 kredi firmaya iade edildi.'
          : 'İtiraz reddedildi.'
      );
      loadData();
    } else {
      triggerNotice(res.error || 'İşlem başarısız.', 'error');
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert toast */}
      {notice && (
        <div
          className={`p-4 rounded-xl border text-xs font-bold flex items-center justify-between shadow-sm animate-fade-in ${
            notice.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="flex items-center gap-2">
            {notice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notice.message}</span>
          </div>
          <button onClick={() => setNotice(null)} className="opacity-70 hover:opacity-100">
            ✕
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[11px] font-black uppercase">
              Gelir & Para Kazanma Motoru
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold">Prompt 9B</span>
          </div>
          <h1 className="text-2xl font-black text-navy-900 mt-1 flex items-center gap-2">
            <Coins className="w-6 h-6 text-orange-500" />
            Teklif Verme Kredisi & Talep Başına Gelir Yönetimi
          </h1>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl">
            Tedarikçilerin iş makineleri taleplerine teklif vermek için kullandığı kredi sistemi. Platform dışı anlaşmalarda dahi talep aşamasında gelir elde edilmesini sağlar.
          </p>
        </div>

        {/* Global Mode Switcher */}
        {config && (
          <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex items-center gap-1 self-start md:self-auto shrink-0">
            <button
              onClick={() => handleModeChange('OFF')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                config.mode === 'OFF'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              KAPALI
            </button>
            <button
              onClick={() => handleModeChange('SHADOW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                config.mode === 'SHADOW'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              GÖLGE MOD (ÖLÇÜM)
            </button>
            <button
              onClick={() => handleModeChange('ACTIVE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                config.mode === 'ACTIVE'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-navy-900'
              }`}
            >
              CANLI (AKTİF)
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'overview'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Genel Bakış & Gölge Mod Raporu
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'settings'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Maliyet & Slot Ayarları
        </button>
        <button
          onClick={() => setActiveTab('packages')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'packages'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Kredi Paketleri ({packages.length})
        </button>
        <button
          onClick={() => setActiveTab('disputes')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'disputes'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Sorunlu Talep / İade Masası ({disputes.filter((d) => d.status === 'pending').length})
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${
            activeTab === 'manual'
              ? 'bg-navy-900 text-white shadow-sm'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          Manuel Kredi Ekle/Çıkar
        </button>
      </div>

      {/* TAB 1: OVERVIEW & SHADOW STATS */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Gölge Mod Potansiyel Gelir
              </span>
              <div className="text-3xl font-black text-amber-600">
                ₺{stats?.shadowEstimatedRevenue?.toLocaleString('tr-TR') || '0'}
              </div>
              <p className="text-[11px] text-slate-500">
                Sistem aktif olsaydı üretilecek tahmini ciro.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Simüle Edilen Teklif Harcaması
              </span>
              <div className="text-3xl font-black text-navy-900">
                {stats?.totalShadowSpentCredits || 0} Adet
              </div>
              <p className="text-[11px] text-slate-500">
                Gölge modda firmaların ücretsiz verdiği teklifler.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Ortalama Slot Doluluğu
              </span>
              <div className="text-3xl font-black text-emerald-600">
                {stats?.averageSlotsFilled || 2.4} / 4
              </div>
              <p className="text-[11px] text-slate-500">
                Talep başına ortalama teklif veren firma sayısı.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Bekleyen İade İtirazları
              </span>
              <div className="text-3xl font-black text-orange-600">
                {stats?.activeDisputesCount || 0} Talep
              </div>
              <p className="text-[11px] text-slate-500">
                Moderatör incelemesi bekleyen sorunlu talepler.
              </p>
            </div>
          </div>

          {/* Doldurulamayan Talepler & Fırsat Listesi */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
                  <BarChart2 className="w-5 h-5 text-orange-500" />
                  Doldurulamayan Talepler & Firma Kazanım Fırsatları
                </h3>
                <p className="text-xs text-slate-500">
                  4 slot kontenjanı dolmayan veya hiç teklif almayan bölgeler. Bu bölgelerde tedarikçi kazanımı yapılmalıdır.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-extrabold text-navy-900 text-sm">Gebze / Kocaeli</div>
                <div className="text-slate-600">Kategori: 30-50 Ton Paletli Ekskavatör</div>
                <div className="text-orange-600 font-bold">1 / 4 Slot Dolu (3 Boş Kontenjan)</div>
                <span className="text-[10px] text-slate-400 block">Talep Tarihi: Dün</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-extrabold text-navy-900 text-sm">Çorlu / Tekirdağ</div>
                <div className="text-slate-600">Kategori: 100 Ton Mobil Vinç</div>
                <div className="text-red-600 font-bold">0 / 4 Slot Dolu (Hiç Teklif Yok)</div>
                <span className="text-[10px] text-slate-400 block">Talep Tarihi: 2 gün önce</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="font-extrabold text-navy-900 text-sm">Nilüfer / Bursa</div>
                <div className="text-slate-600">Kategori: Mini Yükleyici (Bobcat)</div>
                <div className="text-orange-600 font-bold">2 / 4 Slot Dolu (2 Boş Kontenjan)</div>
                <span className="text-[10px] text-slate-400 block">Talep Tarihi: Bugün</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SETTINGS */}
      {activeTab === 'settings' && config && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
              <Settings className="w-5 h-5 text-orange-500" />
              Kredi Maliyeti, Slot Kontenjanı ve İade Kuralları
            </h3>
            <p className="text-xs text-slate-500">
              Platformun talep başına tahsilat ve kontenjan parametrelerini belirleyin.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Varsayılan Talep Başına Kredi Maliyeti *
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={config.default_credit_cost}
                onChange={(e) =>
                  setConfig({ ...config, default_credit_cost: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Firmadan talep başına düşecek teklif verme kredisi adedi.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Talep Başına Maksimum Teklif Slotu (Firma Kontenjanı) *
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={config.default_max_slots}
                onChange={(e) =>
                  setConfig({ ...config, default_max_slots: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Bir talebe en fazla kaç onaylı firma teklif verebilir (Varsayılan: 4).
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Hoş Geldin Kredisi (Yeni Doğrulanmış Firmaya Otomatik) *
              </label>
              <input
                type="number"
                min="0"
                value={config.welcome_bonus_credits}
                onChange={(e) =>
                  setConfig({ ...config, welcome_bonus_credits: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Evrakları onaylanan tedarikçiye hediye edilen başlangıç kredisi.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sorunlu Talep İtiraz Süre Sınırı (Saat) *
              </label>
              <input
                type="number"
                min="1"
                max="168"
                value={config.dispute_window_hours}
                onChange={(e) =>
                  setConfig({ ...config, dispute_window_hours: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold text-sm"
              />
              <span className="text-[11px] text-slate-500 mt-0.5 block">
                Kredi harcandıktan sonra firmanın iade talep edebileceği süre (Varsayılan: 48).
              </span>
            </div>
          </div>

          <div className="space-y-3 pt-2 border-t border-slate-100 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.auto_refund_on_buyer_cancel}
                onChange={(e) =>
                  setConfig({ ...config, auto_refund_on_buyer_cancel: e.target.checked })
                }
                className="rounded text-orange-600 w-4 h-4"
              />
              <span className="font-bold text-slate-800">
                Alıcı Talebi Erken İptal Ederse Teklif Veren Firmalara Otomatik Kredi İadesi Yap
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.exempt_single_listing}
                onChange={(e) =>
                  setConfig({ ...config, exempt_single_listing: e.target.checked })
                }
                className="rounded text-orange-600 w-4 h-4"
              />
              <span className="font-bold text-slate-800">
                Tek Bir Firmanın İlanına Doğrudan Gelen "Teklif İste" Talepleri Daima Ücretsiz Kalsın
              </span>
            </label>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition"
            >
              Ayarları Kaydet
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: PACKAGES */}
      {activeTab === 'packages' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
                <Coins className="w-5 h-5 text-orange-500" />
                Kredi Paketleri Yönetimi
              </h3>
              <p className="text-xs text-slate-500">
                Firmaların satın alabileceği kredi paketleri ve fiyatlandırma. Kodda sabit fiyat bulunmaz.
              </p>
            </div>

            <button
              onClick={() => {
                setEditingPkg({
                  name: '',
                  credits: 20,
                  price: 899,
                  discount_percentage: 0,
                  is_active: true,
                  sort_order: packages.length + 1,
                });
                setPkgModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Yeni Paket Ekle
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-extrabold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Sıra</th>
                  <th className="py-2.5 px-3">Paket Adı</th>
                  <th className="py-2.5 px-3 text-center">Kredi</th>
                  <th className="py-2.5 px-3 text-right">Fiyat (TL)</th>
                  <th className="py-2.5 px-3 text-center">İndirim</th>
                  <th className="py-2.5 px-3 text-center">Durum</th>
                  <th className="py-2.5 px-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 text-slate-400 font-bold">{pkg.sort_order}</td>
                    <td className="py-2.5 px-3 font-bold text-navy-900">{pkg.name}</td>
                    <td className="py-2.5 px-3 text-center font-black text-orange-600">
                      {pkg.credits} Kredi
                    </td>
                    <td className="py-2.5 px-3 text-right font-extrabold text-navy-900">
                      ₺{pkg.price.toLocaleString('tr-TR')}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {pkg.discount_percentage ? `%${pkg.discount_percentage}` : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          pkg.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {pkg.is_active ? 'Aktif' : 'Pasif'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setEditingPkg(pkg);
                          setPkgModalOpen(true);
                        }}
                        className="text-slate-500 hover:text-navy-900 p-1"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DISPUTES QUEUE */}
      {activeTab === 'disputes' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
              <FileQuestion className="w-5 h-5 text-orange-500" />
              Sorunlu Talep & İade İnceleme Kuyruğu
            </h3>
            <p className="text-xs text-slate-500">
              Telefonuna ulaşılamayan, sahte çıkan veya alıcının iptal ettiği talepler için firmaların iade başvuruları.
            </p>
          </div>

          <div className="space-y-3">
            {disputes.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Kuyrukta bekleyen itiraz bulunmamaktadır.
              </div>
            ) : (
              disputes.map((d) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-navy-900">Talep Ref: {d.request_id}</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-bold text-slate-700">Firma: {d.company?.name || d.company_id}</span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          d.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : d.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {d.status === 'approved' ? 'İADE EDİLDİ' : d.status === 'rejected' ? 'REDDEDİLDİ' : 'BEKLİYOR'}
                      </span>
                    </div>

                    <div className="text-slate-700">
                      <strong>Neden:</strong> {d.reason} — <span>{d.description}</span>
                    </div>
                    {d.admin_notes && (
                      <div className="text-slate-500 text-[11px] italic">
                        <strong>Moderatör Notu:</strong> {d.admin_notes}
                      </div>
                    )}
                  </div>

                  {d.status === 'pending' && (
                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => {
                          setResolvingDispute(d);
                          setResolveAction('approved');
                          setResolveNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Onayla (+1 İade)
                      </button>
                      <button
                        onClick={() => {
                          setResolvingDispute(d);
                          setResolveAction('rejected');
                          setResolveNotes('');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reddet
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 5: MANUAL ADJUST */}
      {activeTab === 'manual' && (
        <form onSubmit={handleManualAdjust} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4 max-w-xl">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-navy-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-orange-500" />
              Manuel Kredi Ekleme & Çıkarma (Gerekçeli & Loglu)
            </h3>
            <p className="text-xs text-slate-500">
              Müşteri hizmetleri telafisi, promosyon veya ceza amacıyla bakiye düzenleme.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Firma Seçimi *</label>
              <select
                value={manualCompId}
                onChange={(e) => setManualCompId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
              >
                <option value="f0000000-0000-0000-0000-000000000001">Anadolu İş Makineleri Parkı</option>
                <option value="f0000000-0000-0000-0000-000000000002">Marmara Vinç & Ağır Nakliyat</option>
                <option value="f0000000-0000-0000-0000-000000000003">Ege Hafriyat & İş Makineleri</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kredi Miktarı (+ Ekle / - Çıkar) *
              </label>
              <input
                type="number"
                required
                value={manualAmount}
                onChange={(e) => setManualAmount(Number(e.target.value))}
                placeholder="Örn: 10 veya -5"
                className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">İşlem Gerekçesi (Zorunlu) *</label>
              <textarea
                rows={3}
                required
                value={manualNotes}
                onChange={(e) => setManualNotes(e.target.value)}
                placeholder="Bu manuel işlemin nedenini deftere kaydedilmek üzere belirtiniz..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={manualSubmitting}
                className="px-6 py-2.5 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
              >
                {manualSubmitting ? 'Kaydediliyor...' : 'Deftere İşle & Bakiyeyi Güncelle'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Package Edit/Create Modal */}
      {pkgModalOpen && editingPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
          <form
            onSubmit={handleSavePackage}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-navy-900">
                {editingPkg.id ? 'Paketi Düzenle' : 'Yeni Kredi Paketi Ekle'}
              </h3>
              <button
                type="button"
                onClick={() => setPkgModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Paket Adı *</label>
                <input
                  type="text"
                  required
                  value={editingPkg.name || ''}
                  onChange={(e) => setEditingPkg({ ...editingPkg, name: e.target.value })}
                  placeholder="Örn: Profesyonel Paket"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kredi Adedi *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingPkg.credits || 10}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, credits: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Fiyat (₺ KDV Dahil) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editingPkg.price || 499}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, price: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">İndirim Oranı (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    value={editingPkg.discount_percentage || 0}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, discount_percentage: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Sıralama</label>
                  <input
                    type="number"
                    value={editingPkg.sort_order || 1}
                    onChange={(e) =>
                      setEditingPkg({ ...editingPkg, sort_order: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editingPkg.is_active ?? true}
                  onChange={(e) =>
                    setEditingPkg({ ...editingPkg, is_active: e.target.checked })
                  }
                  className="rounded text-orange-600"
                />
                <span className="font-bold text-slate-800">Paket Satışa Açık (Aktif)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPkgModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 text-xs font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={pkgSaving}
                className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md"
              >
                {pkgSaving ? 'Kaydediliyor...' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Dispute Resolve Modal */}
      {resolvingDispute && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
          <form
            onSubmit={handleResolveDispute}
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-navy-900">İtirazı Karara Bağla</h3>
              <button
                type="button"
                onClick={() => setResolvingDispute(null)}
                className="text-slate-400 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-slate-600">
                <strong>Karar:</strong>{' '}
                <span className={resolveAction === 'approved' ? 'text-emerald-700 font-black' : 'text-red-700 font-black'}>
                  {resolveAction === 'approved' ? 'KREDİ İADESİ YAP (+1 Kredi)' : 'İTİRAZI REDDET'}
                </span>
              </p>
              <p className="text-slate-600">
                <strong>Firma Açıklaması:</strong> {resolvingDispute.description}
              </p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Moderatör Karar Notu</label>
              <textarea
                rows={3}
                value={resolveNotes}
                onChange={(e) => setResolveNotes(e.target.value)}
                placeholder="Firma bildirimine eklenecek gerekçe..."
                className="w-full px-3 py-2 rounded-xl border border-slate-300"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setResolvingDispute(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 font-bold"
              >
                Vazgeç
              </button>
              <button
                type="submit"
                disabled={resolveSubmitting}
                className={`px-6 py-2.5 rounded-xl text-white font-black shadow-md ${
                  resolveAction === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {resolveSubmitting ? 'İşleniyor...' : 'Kararı Uygula'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
