'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  ShieldCheck,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { Contract, ContractTemplate, ContractType } from '@/types/database';
import {
  getContracts,
  getContractTemplates,
  createNewTemplateVersion,
} from '@/lib/services/contract-service';
import { getActiveProfile } from '@/lib/services/auth-service';

export default function AdminSozlesmelerPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'contracts' | 'templates'>('contracts');

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Yeni Şablon Modalı
  const [showNewTemplateModal, setShowNewTemplateModal] = useState(false);
  const [newTemplateType, setNewTemplateType] = useState<ContractType>('rental');
  const [newTemplateTitle, setNewTemplateTitle] = useState('');
  const [newTemplateTerms, setNewTemplateTerms] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  // Snapshot Önizleme Modalı
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [cntData, tmplData] = await Promise.all([
        getContracts('admin-user', 'admin'),
        getContractTemplates(),
      ]);
      setContracts(cntData);
      setTemplates(tmplData);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTemplateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplateTitle.trim() || !newTemplateTerms.trim()) return;

    setSavingTemplate(true);
    try {
      const profile = await getActiveProfile();
      const adminId = profile?.id || 'admin-super-001';

      const res = await createNewTemplateVersion({
        templateType: newTemplateType,
        title: newTemplateTitle,
        standardTerms: newTemplateTerms,
        adminId,
      });

      if (res.success) {
        alert('Yeni sözleşme şablon sürümü başarıyla kaydedildi.');
        setShowNewTemplateModal(false);
        setNewTemplateTitle('');
        setNewTemplateTerms('');
        await loadData();
      } else {
        alert(res.error || 'Şablon oluşturulamadı.');
      }
    } finally {
      setSavingTemplate(false);
    }
  }

  const filteredContracts = contracts.filter((c) => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesType = filterType === 'all' || c.contract_type === filterType;
    const matchesSearch =
      c.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.data_snapshot?.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.data_snapshot?.buyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.data_snapshot?.subject?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Başlık ve Sekmeler */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-navy-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-amber-500" />
            Otomatik Sözleşmeler & Şablonlar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Dondurulmuş veri anlık görüntüleri, SHA-256 özetleri, çift taraflı onaylar ve şablon sürüm yönetimi.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center text-xs font-bold text-slate-600">
            <button
              onClick={() => setActiveTab('contracts')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'contracts' ? 'bg-white text-navy-900 shadow-sm' : 'hover:text-navy-900'
              }`}
            >
              Sözleşmeler ({contracts.length})
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3.5 py-1.5 rounded-lg transition ${
                activeTab === 'templates' ? 'bg-white text-navy-900 shadow-sm' : 'hover:text-navy-900'
              }`}
            >
              Şablon Yönetimi ({templates.length})
            </button>
          </div>
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* SEKME 1: SÖZLEŞMELER LİSTESİ */}
      {activeTab === 'contracts' && (
        <div className="space-y-4">
          {/* Filtre ve Arama */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                placeholder="Sözleşme no, firma, alıcı veya ilan adı..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-medium"
            >
              <option value="all">Tüm Türler</option>
              <option value="rental">Kiralama</option>
              <option value="service">Hizmet</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-medium"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="pending_approval">Onay Bekliyor</option>
              <option value="mutual_approved">Karşılıklı Onaylandı</option>
              <option value="revision_requested">Revizyon İstendi</option>
              <option value="superseded">Eski Sürüm</option>
            </select>
          </div>

          {/* Tablo */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Sözleşme No & Tür</th>
                    <th className="py-3 px-4">Firma</th>
                    <th className="py-3 px-4">Alıcı</th>
                    <th className="py-3 px-4">İş / Konu</th>
                    <th className="py-3 px-4">Toplam Bedel</th>
                    <th className="py-3 px-4">Onay Durumu</th>
                    <th className="py-3 px-4 text-right">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredContracts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400">
                        Sözleşme kaydı bulunamadı.
                      </td>
                    </tr>
                  ) : (
                    filteredContracts.map((cnt) => (
                      <tr key={cnt.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4">
                          <span className="font-bold text-slate-900 block">{cnt.contract_number}</span>
                          <span className="text-[10px] text-slate-400">
                            v{cnt.template_version} • {cnt.contract_type === 'rental' ? 'Kiralama' : 'Hizmet'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {cnt.data_snapshot?.company?.name || '-'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {cnt.data_snapshot?.company?.city || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {cnt.data_snapshot?.buyer?.company_name || cnt.data_snapshot?.buyer?.full_name || '-'}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {cnt.data_snapshot?.buyer?.phone || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium text-slate-800 block max-w-xs truncate">
                            {cnt.data_snapshot?.subject?.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {cnt.data_snapshot?.subject?.start_date}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {cnt.data_snapshot?.pricing?.total_price?.toLocaleString('tr-TR')}{' '}
                          {cnt.data_snapshot?.pricing?.currency || 'TL'}
                        </td>
                        <td className="py-3 px-4">
                          {cnt.status === 'mutual_approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="w-3 h-3" /> Onaylandı
                            </span>
                          )}
                          {cnt.status === 'pending_approval' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
                              <Clock className="w-3 h-3" /> Onay Bekliyor
                            </span>
                          )}
                          {cnt.status === 'revision_requested' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
                              <AlertCircle className="w-3 h-3" /> Revizyon
                            </span>
                          )}
                          {cnt.status === 'superseded' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-500">
                              Eski Sürüm
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            onClick={() => setSelectedContract(cnt)}
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition"
                            title="Snapshot Verilerini Görüntüle"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <a
                            href={`/api/contracts/${cnt.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 inline-flex items-center transition"
                            title="PDF İndir"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SEKME 2: ŞABLON YÖNETİMİ */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Sözleşme şablonları sürümlü saklanır. Yeni sürüm eklendiğinde mevcut sözleşmeler dondurulduğu için
              etkilenmez.
            </p>
            <button
              onClick={() => setShowNewTemplateModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-navy-900 hover:bg-navy-800 text-white font-bold text-xs shadow-sm transition"
            >
              <Plus className="w-4 h-4" />
              Yeni Şablon Sürümü Ekle
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {templates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 space-y-3 shadow-sm hover:border-slate-300 transition"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{tmpl.title}</h3>
                    <span className="text-[11px] text-slate-400">
                      Tür: {tmpl.template_type === 'rental' ? 'Kiralama' : 'Hizmet'} • Sürüm: v{tmpl.version}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
                    Aktif
                  </span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-[11px] text-slate-600 font-mono max-h-48 overflow-y-auto whitespace-pre-wrap">
                  {tmpl.standard_terms}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Snapshot Detay Modalı */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Dondurulmuş Sözleşme Anlık Görüntüsü (Snapshot)
                </h3>
                <p className="text-xs text-slate-400">
                  Sözleşme No: {selectedContract.contract_number} • SHA256: {selectedContract.pdf_sha256}
                </p>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                Kapat
              </button>
            </div>

            <div className="bg-slate-900 text-emerald-400 p-4 rounded-xl text-xs font-mono overflow-x-auto max-h-96">
              <pre>{JSON.stringify(selectedContract.data_snapshot, null, 2)}</pre>
            </div>
          </div>
        </div>
      )}

      {/* Yeni Şablon Modalı */}
      {showNewTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-500" />
              Yeni Şablon Sürümü Tanımla
            </h3>
            <form onSubmit={handleCreateTemplateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Şablon Türü</label>
                <select
                  value={newTemplateType}
                  onChange={(e) => setNewTemplateType(e.target.value as ContractType)}
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="rental">İş Makineleri & Ekipman Kiralama</option>
                  <option value="service">Ağır Nakliye & İnşaat Hizmeti</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Şablon Başlığı</label>
                <input
                  type="text"
                  value={newTemplateTitle}
                  onChange={(e) => setNewTemplateTitle(e.target.value)}
                  placeholder="Örn: 2026 Standart Ekipman Kiralama Sözleşmesi"
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Standart Şartlar ve Maddeler
                </label>
                <textarea
                  rows={8}
                  value={newTemplateTerms}
                  onChange={(e) => setNewTemplateTerms(e.target.value)}
                  placeholder="1. TARAFLAR... 2. KONU... NOT: İşbu metin TASLAK niteliğinde olup..."
                  className="w-full p-2.5 border border-slate-200 rounded-xl text-xs font-mono"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewTemplateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={savingTemplate}
                  className="px-4 py-2 bg-navy-900 hover:bg-navy-800 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  {savingTemplate ? 'Kaydediliyor...' : 'Yeni Sürümü Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
