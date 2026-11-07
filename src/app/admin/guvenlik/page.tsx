'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Phone,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Save,
  Users,
  Eye,
  RefreshCw,
  Search,
  Sliders,
  FileText,
} from 'lucide-react';
import {
  getComplianceStats,
  getComplianceDisputes,
  resolveComplianceDispute,
  getRepeatOffendersList,
  takeOffenderAction,
  getAntiLeakSettings,
  updateAntiLeakSettings,
  ComplianceLogItem,
  OffenderProfile,
} from '@/lib/services/admin-service';

export default function AdminSecurityCompliancePage() {
  const [stats, setStats] = useState<any>({
    totalMasked: 0,
    phoneCount: 0,
    emailCount: 0,
    ibanCount: 0,
    socialCount: 0,
    disputeCount: 0,
    repeatOffenderCount: 0,
    softModeRevealCount: 0,
  });

  const [disputes, setDisputes] = useState<ComplianceLogItem[]>([]);
  const [offenders, setOffenders] = useState<OffenderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [notice, setNotice] = useState('');

  // Settings State
  const [revealRule, setRevealRule] = useState<string>('teklif_kabul');
  const [threshold, setThreshold] = useState<number>(3);
  const [dailyLimit, setDailyLimit] = useState<number>(3);
  const [keywords, setKeywords] = useState<string>('');

  const loadData = async () => {
    setLoading(true);
    const [s, d, o, set] = await Promise.all([
      getComplianceStats(),
      getComplianceDisputes(),
      getRepeatOffendersList(),
      getAntiLeakSettings(),
    ]);

    setStats(s);
    setDisputes(d);
    setOffenders(o);
    setRevealRule(set.contactRevealRule);
    setThreshold(set.violationThreshold);
    setDailyLimit(set.softModeDailyLimit);
    setKeywords(set.forbiddenKeywords);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    await updateAntiLeakSettings({
      contactRevealRule: revealRule,
      violationThreshold: threshold,
      softModeDailyLimit: dailyLimit,
      forbiddenKeywords: keywords,
    });
    setSavingSettings(false);
    setNotice('İletişim koruma ayarları başarıyla güncellendi.');
    setTimeout(() => setNotice(''), 3500);
  };

  const handleResolveDispute = async (id: string, status: 'approved' | 'rejected') => {
    await resolveComplianceDispute(id, status);
    setNotice(`İtiraz ${status === 'approved' ? 'onaylandı (yanlış alarm)' : 'reddedildi'}.`);
    loadData();
    setTimeout(() => setNotice(''), 3500);
  };

  const handleOffenderAction = async (userId: string, action: 'warn' | 'suspend' | 'clear') => {
    await takeOffenderAction(userId, action);
    const actionLabel =
      action === 'suspend'
        ? 'Hesap askıya alındı'
        : action === 'warn'
        ? 'Nazik uyarı iletildi'
        : 'İhlal sayacı sıfırlandı';
    setNotice(`${actionLabel}.`);
    loadData();
    setTimeout(() => setNotice(''), 3500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/admin" className="text-xs text-slate-500 hover:text-navy-900 font-bold">
              Yönetim Paneli
            </Link>
            <span className="text-slate-400">/</span>
            <span className="text-xs text-orange-600 font-bold">İletişim Güvenliği & Denetim</span>
          </div>
          <h1 className="text-2xl font-black text-navy-900 mt-1 flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-emerald-600" />
            İletişim Bilgisi Koruma & Açılış Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Komisyon kaçağı önleme, merkezi içerik tarayıcı kuralları, ihlal sayaçları ve kontrollü açılış (reveal) mekanizması.
          </p>
        </div>

        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-sm self-start"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Yenile</span>
        </button>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2 animate-fade-in shadow-sm">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Maskelenen</div>
          <div className="text-2xl font-black text-navy-900">{stats.totalMasked}</div>
          <div className="text-[10px] text-slate-500">Otomatik taranan</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Telefon / GSM</div>
          <div className="text-2xl font-black text-orange-600">{stats.phoneCount}</div>
          <div className="text-[10px] text-slate-500">Türkiye formatları</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">IBAN Tespiti</div>
          <div className="text-2xl font-black text-purple-600">{stats.ibanCount}</div>
          <div className="text-[10px] text-slate-500">TR+24 hane</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sosyal & WP</div>
          <div className="text-2xl font-black text-blue-600">{stats.socialCount}</div>
          <div className="text-[10px] text-slate-500">Harici yönlendirme</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">İtiraz Kuyruğu</div>
          <div className="text-2xl font-black text-amber-600">{stats.disputeCount}</div>
          <div className="text-[10px] text-slate-500">Yanlış alarm bildirimi</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Numara Göster</div>
          <div className="text-2xl font-black text-emerald-600">{stats.softModeRevealCount}</div>
          <div className="text-[10px] text-slate-500">Yumuşak mod kullanımı</div>
        </div>
      </div>

      {/* Main Grid: Settings & False Positive Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Settings Column */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-5">
          <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2 border-b pb-3">
            <Sliders className="w-5 h-5 text-orange-500" />
            Kontrollü Açılış & Eşik Ayarları
          </h2>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Reveal Rule */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                İletişim Bilgisi Açılış Kuralı (Reveal Trigger):
              </label>
              <select
                value={revealRule}
                onChange={(e) => setRevealRule(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-bold text-navy-900 bg-white focus:ring-2 focus:ring-orange-500"
              >
                <option value="teklif_kabul">teklif_kabul (VARSAYILAN: Teklif veya rezervasyon onaylandığında)</option>
                <option value="numara_goster_butonu">numara_goster_butonu (Yumuşak Mod: Doğrulanmış kullanıcıya günlük kotalı)</option>
                <option value="odeme">odeme (Platform üzerinden ödeme tamamlandığında)</option>
                <option value="talep_kredisi">talep_kredisi (Tedarikçi teklif kredisi harcadığında - Prompt 9B)</option>
              </select>
              {revealRule === 'odeme' && (
                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2 font-semibold">
                  ⚠️ Uyarı: Canlı online ödeme kapısı devreye alınana kadar &apos;odeme&apos; modu kullanıcıların iletişim görmesini engelleyebilir. Varsayılan &apos;teklif_kabul&apos; önerilir.
                </p>
              )}
              {revealRule === 'numara_goster_butonu' && (
                <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 mt-2 font-semibold">
                  💡 Yumuşak Mod: Platformun erken aşamasında kullanıcıyı ürkütmemek için, SMS onaylı hesaplara günlük sınırla &quot;Numarayı Göster&quot; butonu verir.
                </p>
              )}
            </div>

            {/* Violation Threshold */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                İhlal Alarm Eşiği (Kaç ihlalden sonra moderasyona düşsün):
              </label>
              <input
                type="number"
                min="1"
                max="10"
                required
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-navy-900 focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                İlk ihlalde bilgilendirme, ikincide nazik uyarı, {threshold}. ihlalde kullanıcı inceleme kuyruğuna alınır.
              </p>
            </div>

            {/* Soft Mode Daily Limit */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Yumuşak Mod Günlük Gösterim Limiti (Kullanıcı Başına):
              </label>
              <input
                type="number"
                min="1"
                max="20"
                required
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs font-bold text-navy-900 focus:ring-2 focus:ring-orange-500"
              />
            </div>

            {/* Dynamic Forbidden Keywords */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Dinamik Yasaklı Anahtar Kelimeler (Virgülle Ayrılmış):
              </label>
              <textarea
                rows={3}
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-navy-900 focus:ring-2 focus:ring-orange-500 leading-relaxed font-mono text-[11px]"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Koda gömülü regex desenlerine ek olarak anlık taranacak harici yönlendirme kelimeleri.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className="w-full py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                {savingSettings ? 'Kaydediliyor...' : 'GÜVENLİK AYARLARINI GÜNCELLE'}
              </button>
            </div>
          </form>
        </div>

        {/* False Positive & Dispute Queue Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Yanlış Alarm & İtiraz Kuyruğu
            </h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              {disputes.filter((d) => d.false_positive_status === 'pending').length} Bekleyen
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {disputes.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Bekleyen yanlış alarm itirazı bulunmuyor.
              </div>
            ) : (
              disputes.map((item) => (
                <div key={item.id} className="py-3.5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-navy-900">
                        {item.user_name || item.user_id}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-semibold">
                        {item.target_entity_type}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {new Date(item.created_at).toLocaleDateString('tr-TR', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Kullanıcı İtiraz Açıklaması:
                    </div>
                    <div className="font-medium italic text-slate-800">
                      &quot;{item.false_positive_notes || 'Açıklama belirtilmedi'}&quot;
                    </div>
                    <div className="text-[10px] text-slate-500 pt-1 flex items-center gap-1">
                      <span>Algılanan Desen:</span>
                      <span className="font-bold text-orange-600">
                        {item.detected_types.join(', ')}
                      </span>
                    </div>
                  </div>

                  {item.false_positive_status === 'pending' ? (
                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => handleResolveDispute(item.id, 'rejected')}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px] font-bold transition"
                      >
                        İtirazı Reddet
                      </button>
                      <button
                        onClick={() => handleResolveDispute(item.id, 'approved')}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition shadow-sm"
                      >
                        Onayla (Yanlış Alarm)
                      </button>
                    </div>
                  ) : (
                    <div className="text-right">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          item.false_positive_status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {item.false_positive_status === 'approved' ? 'Yanlış Alarm Onaylandı' : 'İtiraz Reddedildi'}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Repeat Offenders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-red-600" />
              Tekrarlayan İhlal & Platform Dışı Yönlendirme Takibi
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              İletişim bilgisi maskeleme sayacı eşiği aşan kullanıcılar ve moderasyon aksiyonları.
            </p>
          </div>
          <span className="text-xs bg-red-100 text-red-800 font-bold px-2.5 py-1 rounded-full">
            {offenders.length} Kullanıcı Takipte
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b">
              <tr>
                <th className="p-3">Kullanıcı / Firma</th>
                <th className="p-3">Rol</th>
                <th className="p-3 text-center">İhlal Sayacı</th>
                <th className="p-3 text-center">Uyumluluk Durumu</th>
                <th className="p-3 text-right">Aksiyonlar</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {offenders.map((offender) => (
                <tr key={offender.user_id} className="hover:bg-slate-50 transition">
                  <td className="p-3">
                    <div className="font-bold text-navy-900">{offender.full_name}</div>
                    {offender.company_name && (
                      <div className="text-[11px] text-slate-400">{offender.company_name}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="capitalize text-slate-600">
                      {offender.role === 'company' ? 'Tedarikçi Firma' : 'Müteahhit / Alıcı'}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span className="px-2.5 py-1 rounded-full font-black text-xs bg-red-50 text-red-700 border border-red-200">
                      {offender.mask_violation_count} İhlal
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                        offender.compliance_status === 'suspended'
                          ? 'bg-red-600 text-white'
                          : offender.compliance_status === 'warned'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {offender.compliance_status === 'suspended'
                        ? 'Askıya Alındı'
                        : offender.compliance_status === 'warned'
                        ? 'Uyarı Verildi'
                        : 'İyi Durumda'}
                    </span>
                  </td>
                  <td className="p-3 text-right space-x-1.5">
                    <button
                      onClick={() => handleOffenderAction(offender.user_id, 'warn')}
                      className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 text-[10px] font-bold hover:bg-amber-100 transition"
                    >
                      Uyarı Gönder
                    </button>
                    {offender.compliance_status !== 'suspended' ? (
                      <button
                        onClick={() => handleOffenderAction(offender.user_id, 'suspend')}
                        className="px-2.5 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 transition"
                      >
                        Askıya Al
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOffenderAction(offender.user_id, 'clear')}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[10px] font-bold hover:bg-emerald-700 transition"
                      >
                        Askıyı Kaldır
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
