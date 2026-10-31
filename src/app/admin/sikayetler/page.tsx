'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  MessageSquare,
  Layers,
  Star,
  X,
} from 'lucide-react';
import { getAdminReports, resolveReport } from '@/lib/services/admin-service';
import { Report } from '@/types/database';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeReport, setActiveReport] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getAdminReports();
    setReports([...data]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleResolve = async (status: 'resolved' | 'dismissed') => {
    if (!activeReport) return;
    await resolveReport(activeReport.id, status, adminNotes, 'admin-super-001');
    setNotice(`Şikayet ${status === 'resolved' ? 'çözüldü' : 'reddedildi'} olarak işaretlendi.`);
    setActiveReport(null);
    setAdminNotes('');
    loadData();
    setTimeout(() => setNotice(''), 3000);
  };

  const filtered = reports.filter((r) => {
    if (selectedStatus === 'all') return true;
    return r.status === selectedStatus;
  });

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
            <span className="text-xs text-orange-600 font-bold">Şikayet Masası</span>
          </div>
          <h1 className="text-2xl font-black text-navy-900 mt-1">
            Şikayet & Uyuşmazlık Yönetimi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kullanıcılardan gelen ilan, mesaj ve yorum şikayetlerini inceleyip karara bağlayın.
          </p>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {['all', 'pending', 'investigating', 'resolved', 'dismissed'].map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
              selectedStatus === st
                ? 'bg-navy-900 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {st === 'all' && `Tüm Şikayetler (${reports.length})`}
            {st === 'pending' &&
              `Yeni / Bekleyen (${reports.filter((r) => r.status === 'pending').length})`}
            {st === 'investigating' &&
              `İnceleniyor (${reports.filter((r) => r.status === 'investigating').length})`}
            {st === 'resolved' &&
              `Çözülenler (${reports.filter((r) => r.status === 'resolved').length})`}
            {st === 'dismissed' &&
              `Reddedilen (${reports.filter((r) => r.status === 'dismissed').length})`}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3 px-4">Şikayet Nedeni</th>
                <th className="py-3 px-4">Hedef Türü</th>
                <th className="py-3 px-4">Bildiren / Tarih</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4">Moderatör Notu</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-navy-900 text-sm">{r.reason}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{r.details}</div>
                  </td>

                  <td className="py-3 px-4">
                    {r.listing_id && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                        <Layers className="w-3 h-3" /> İlan Şikayeti
                      </span>
                    )}
                    {r.message_id && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        <MessageSquare className="w-3 h-3" /> Mesajlaşma
                      </span>
                    )}
                    {r.review_id && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                        <Star className="w-3 h-3" /> Yorum Şikayeti
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    <div>{r.reporter_id}</div>
                    <div className="text-[10px] text-slate-400">
                      {new Date(r.created_at).toLocaleDateString('tr-TR')}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {r.status === 'pending' && (
                      <span className="px-2 py-0.5 rounded bg-orange-100 text-orange-800 text-[10px] font-bold">
                        Yeni
                      </span>
                    )}
                    {r.status === 'investigating' && (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                        İnceleniyor
                      </span>
                    )}
                    {r.status === 'resolved' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                        Çözüldü
                      </span>
                    )}
                    {r.status === 'dismissed' && (
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-bold">
                        Reddedildi
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-slate-500 max-w-xs truncate">
                    {r.admin_notes || '-'}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveReport(r);
                        setAdminNotes(r.admin_notes || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs"
                    >
                      İncele & Karar Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Resolution Modal */}
      {activeReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-5 shadow-2xl border border-slate-200 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-extrabold text-navy-900 text-base">Şikayet İnceleme Masası</h3>
              <button
                type="button"
                onClick={() => setActiveReport(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl space-y-1">
              <div>
                <strong>Neden:</strong> {activeReport.reason}
              </div>
              <div className="text-slate-600 leading-relaxed">{activeReport.details}</div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Yönetici Notu & Alınan Aksiyon:
              </label>
              <textarea
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Örn: İlan incelendi, fiyattaki hata düzeltilmesi için firmaya ihtar verildi."
                className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t">
              <button
                type="button"
                onClick={() => handleResolve('dismissed')}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-100 font-bold text-xs"
              >
                Şikayeti Reddet (Geçersiz)
              </button>
              <button
                type="button"
                onClick={() => handleResolve('resolved')}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
              >
                Çözüldü Olarak İşaretle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
