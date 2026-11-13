'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Building2,
  ShieldCheck,
  XCircle,
  CheckCircle2,
  Clock,
  FileText,
  ExternalLink,
  AlertCircle,
  Search,
  ArrowLeft,
  X,
} from 'lucide-react';
import {
  getCompaniesForVerification,
  verifyCompany,
} from '@/lib/services/admin-service';
import { Company } from '@/types/database';

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal State for Reviewing Docs
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getCompaniesForVerification();
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (companyId: string) => {
    await verifyCompany(companyId, 'approved', '', 'admin-super-001');
    setActionSuccess('Firma başarıyla onaylandı ve Doğrulanmış Firma rozeti verildi!');
    setActiveCompany(null);
    loadData();
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const handleReject = async (companyId: string) => {
    if (!rejectReason.trim()) {
      alert('Lütfen red sebebini yazınız.');
      return;
    }
    await verifyCompany(companyId, 'rejected', rejectReason, 'admin-super-001');
    setActionSuccess('Firma başvurusu reddedildi ve firmaya bildirildi.');
    setActiveCompany(null);
    setRejectReason('');
    loadData();
    setTimeout(() => setActionSuccess(''), 3000);
  };

  const filtered = companies.filter((c) => {
    const matchesStatus =
      selectedStatus === 'all' ? true : c.verification_status === selectedStatus;
    const matchesSearch =
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tax_number?.includes(searchQuery) ||
      c.city_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
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
            <span className="text-xs text-orange-600 font-bold">Firma Doğrulama</span>
          </div>
          <h1 className="text-2xl font-black text-navy-900 mt-1">
            Firma Doğrulama & Yetkilendirme
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Vergi levhası ve imza sirkülerini inceleyerek firmalara onay verin veya reddedin.
          </p>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {['all', 'pending', 'approved', 'rejected'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ${
                selectedStatus === st
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'all' && `Tümü (${companies.length})`}
              {st === 'pending' &&
                `Onay Bekleyen (${companies.filter((c) => c.verification_status === 'pending').length})`}
              {st === 'approved' &&
                `Onaylı (${companies.filter((c) => c.verification_status === 'approved').length})`}
              {st === 'rejected' &&
                `Reddedilen (${companies.filter((c) => c.verification_status === 'rejected').length})`}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Firma adı, VKN veya şehir..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-orange-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider border-b border-slate-200 text-[10px]">
              <tr>
                <th className="py-3 px-4">Firma & Ünvan</th>
                <th className="py-3 px-4">Vergi Bilgileri</th>
                <th className="py-3 px-4">Konum & İletişim</th>
                <th className="py-3 px-4">Alt Üye İşyeri (iyzico)</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <div className="font-extrabold text-navy-900 text-sm">{c.name}</div>
                    <div className="text-[10px] text-slate-400">{c.legal_type}</div>
                  </td>

                  <td className="py-3 px-4">
                    <div>
                      <strong>VKN:</strong> {c.tax_number || '-'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {c.tax_office || 'Daire Belirtilmedi'}
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div>
                      {c.city_name}, {c.district_name}
                    </div>
                    <div className="text-[11px] text-slate-500">{c.phone}</div>
                  </td>

                  <td className="py-3 px-4 font-mono text-[11px]">
                    {c.sub_merchant_key ? (
                      <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded">
                        {c.sub_merchant_key}
                      </span>
                    ) : (
                      <span className="text-slate-400">Henüz Açılmadı</span>
                    )}
                  </td>

                  <td className="py-3 px-4">
                    {c.verification_status === 'approved' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Doğrulandı
                      </span>
                    )}
                    {c.verification_status === 'pending' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 text-[11px] font-bold">
                        <Clock className="w-3.5 h-3.5" /> İnceleme Bekliyor
                      </span>
                    )}
                    {c.verification_status === 'rejected' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-100 text-red-800 text-[11px] font-bold">
                        <XCircle className="w-3.5 h-3.5" /> Reddedildi
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setActiveCompany(c)}
                      className="px-3 py-1.5 rounded-lg bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs"
                    >
                      Evrakları İncele
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {activeCompany && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/75 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-[10px] font-bold uppercase text-orange-600">
                  Firma Evrak İnceleme Masası
                </span>
                <h3 className="font-black text-navy-900 text-base">{activeCompany.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCompany(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-navy-900 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Company Data Details */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <strong>Vergi Dairesi:</strong> {activeCompany.tax_office || '-'}
                </div>
                <div>
                  <strong>Vergi Kimlik No:</strong> {activeCompany.tax_number || '-'}
                </div>
                <div>
                  <strong>Şirket Türü:</strong> {activeCompany.legal_type || '-'}
                </div>
                <div>
                  <strong>IBAN:</strong> {activeCompany.iban_last4 ? `TR** **** **** **** **** **${activeCompany.iban_last4}` : 'Girilmedi'}
                </div>
              </div>

              {/* Uploaded Documents Preview */}
              <div className="space-y-2">
                <span className="font-bold text-navy-900 block">Yüklenen Resmi Evraklar:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-white">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-orange-500" />
                      Vergi Levhası
                    </div>
                    {activeCompany.tax_plate_url ? (
                      <a
                        href={activeCompany.tax_plate_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block relative aspect-video rounded-lg overflow-hidden border border-slate-200 hover:opacity-90"
                      >
                        <Image
                          src={activeCompany.tax_plate_url}
                          alt="Vergi levhası"
                          fill
                          className="object-cover"
                        />
                      </a>
                    ) : (
                      <div className="text-slate-400 py-6 text-center">Yüklenmemiş</div>
                    )}
                  </div>

                  <div className="border border-slate-200 rounded-xl p-3 space-y-2 bg-white">
                    <div className="font-bold text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-500" />
                      İmza Sirküleri / Yetki Belgesi
                    </div>
                    {activeCompany.signature_circular_url ? (
                      <a
                        href={activeCompany.signature_circular_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block relative aspect-video rounded-lg overflow-hidden border border-slate-200 hover:opacity-90"
                      >
                        <Image
                          src={activeCompany.signature_circular_url}
                          alt="İmza sirküleri"
                          fill
                          className="object-cover"
                        />
                      </a>
                    ) : (
                      <div className="text-slate-400 py-6 text-center">Yüklenmemiş</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Rejection reason textarea */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Reddetme Gerekçesi (Yalnızca reddedildiğinde firmaya iletilir):
                </label>
                <textarea
                  rows={2}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Örn: Vergi levhası geçerlilik tarihi dolmuş, lütfen güncel levha yükleyiniz."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => handleReject(activeCompany.id)}
                  className="px-4 py-2 rounded-xl border border-red-300 hover:bg-red-50 text-red-600 font-bold text-xs"
                >
                  Başvuruyu Reddet
                </button>
                <button
                  type="button"
                  onClick={() => handleApprove(activeCompany.id)}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md"
                >
                  Doğrula & Onayla
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
