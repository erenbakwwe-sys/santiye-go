'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Users,
  Building2,
  Layers,
  CreditCard,
  TrendingUp,
  Clock,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  ArrowRight,
  History,
} from 'lucide-react';
import {
  getAdminDashboardMetrics,
  getCompaniesForVerification,
  getAdminReports,
  DEMO_ADMIN_LOGS,
} from '@/lib/services/admin-service';
import { Company, Report, AdminAuditLog } from '@/types/database';

export default function AdminDashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [logs, setLogs] = useState<AdminAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [m, c, r] = await Promise.all([
        getAdminDashboardMetrics(),
        getCompaniesForVerification(),
        getAdminReports(),
      ]);
      setMetrics(m);
      setCompanies(c);
      setReports(r);
      setLogs(DEMO_ADMIN_LOGS);
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Yönetim paneli yükleniyor...</div>;
  }

  const formatMoney = (cents: number) => {
    return (cents / 100).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₺';
  };

  const pendingCompanies = companies.filter((c) => c.verification_status === 'pending');
  const openReports = reports.filter((r) => r.status === 'pending' || r.status === 'investigating');

  return (
    <div className="space-y-8">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-orange-100 text-orange-800 text-[11px] font-black uppercase">
              Süper Admin
            </span>
            <span className="text-slate-400">•</span>
            <span className="text-xs text-slate-500 font-semibold">Genel Bakış</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900 mt-1">
            Yönetim Gösterge Paneli
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/ayarlar"
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-200 text-xs font-bold transition"
          >
            Sistem Ayarları
          </Link>
          <Link
            href="/admin/odemeler"
            className="px-4 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white text-xs font-bold transition"
          >
            Ödeme Raporları
          </Link>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Toplam Kullanıcı</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-navy-900">{metrics.totalUsers}</div>
          <div className="text-[11px] text-slate-400">{metrics.totalCompanies} Onaylı Firma</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Aktif İlanlar</span>
            <Layers className="w-4 h-4 text-orange-500" />
          </div>
          <div className="text-2xl font-black text-navy-900">{metrics.activeListings}</div>
          <div className="text-[11px] text-slate-400">7 Farklı Şehirde Yayında</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>İşlem Hacmi (GMV)</span>
            <CreditCard className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-navy-900">
            {formatMoney(metrics.totalVolumeCents)}
          </div>
          <div className="text-[11px] text-emerald-600 font-bold">Bu Ay: 28 Rezervasyon</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Komisyon Geliri</span>
            <TrendingUp className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-black text-orange-600">
            {formatMoney(metrics.totalCommissionCents)}
          </div>
          <div className="text-[11px] text-slate-400">Ortalama %8 Platform Komisyonu</div>
        </div>
      </div>

      {/* Two Column Quick Review Lists: Pending Companies & Open Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Company Verifications */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-navy-900 text-sm sm:text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-orange-500" />
              Onay Bekleyen Firmalar ({pendingCompanies.length})
            </h2>
            <Link
              href="/admin/firmalar"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {pendingCompanies.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Onay bekleyen firma başvurusu bulunmamaktadır.
            </div>
          ) : (
            <div className="space-y-3">
              {pendingCompanies.map((c) => (
                <div
                  key={c.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-navy-900 text-sm">{c.name}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {c.city_name || 'İstanbul'} • VKN: {c.tax_number || 'Belirtilmedi'}
                    </div>
                  </div>
                  <Link
                    href={`/admin/firmalar?id=${c.id}`}
                    className="px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs"
                  >
                    Evrakları İncele
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Open Reports Desk */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-extrabold text-navy-900 text-sm sm:text-base flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-500" />
              İnceleme Bekleyen Şikayetler ({openReports.length})
            </h2>
            <Link
              href="/admin/sikayetler"
              className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
            >
              Tümünü Gör <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {openReports.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              Açık şikayet kaydı bulunmamaktadır.
            </div>
          ) : (
            <div className="space-y-3">
              {openReports.map((r) => (
                <div
                  key={r.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-navy-900">{r.reason}</span>
                      <span className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 text-[9px] font-bold">
                        {r.status === 'investigating' ? 'İnceleniyor' : 'Yeni'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 line-clamp-1">{r.details}</p>
                  </div>
                  <Link
                    href={`/admin/sikayetler?id=${r.id}`}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-200 font-bold text-xs shrink-0"
                  >
                    Detay
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Admin Audit Logs Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="font-extrabold text-navy-900 text-sm sm:text-base flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Son Yönetici İşlem Kayıtları (Audit Logs)
          </h2>
          <span className="text-xs text-slate-400">Tüm işlemler şifreli saklanır</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                <th className="py-2.5 px-3">Zaman</th>
                <th className="py-2.5 px-3">Yönetici</th>
                <th className="py-2.5 px-3">Eylem</th>
                <th className="py-2.5 px-3">Hedef</th>
                <th className="py-2.5 px-3">Detay</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {logs.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                    {new Date(l.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-navy-900">{l.admin_id}</td>
                  <td className="py-2.5 px-3 font-semibold text-orange-600">{l.action}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-mono text-[10px]">
                      {l.target_type}:{l.target_id?.slice(0, 8)}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 max-w-xs truncate">
                    {JSON.stringify(l.details)}
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
