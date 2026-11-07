'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Contract } from '@/types/database';
import {
  getContracts,
  approveContract,
  requestContractRevision,
} from '@/lib/services/contract-service';
import { getActiveProfile } from '@/lib/services/auth-service';

export default function AliciSozlesmelerPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Revizyon modalı
  const [revisionModalContractId, setRevisionModalContractId] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const profile = await getActiveProfile();
      const currentUserId = profile?.id || '6f3d3513-66cc-4180-a3af-bc6bcf3db658';
      setUserId(currentUserId);

      const data = await getContracts(currentUserId, 'buyer');
      setContracts(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(contractId: string) {
    if (!confirm('Sözleşme maddelerini okuduğunuzu ve onayladığınızı onaylıyor musunuz?')) return;
    setActionLoading(contractId);
    try {
      const res = await approveContract(contractId, userId, 'buyer');
      if (res.success) {
        alert('Sözleşme başarıyla onaylandı!');
        await loadData();
      } else {
        alert(res.error || 'Onay işlemi başarısız.');
      }
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRevisionSubmit() {
    if (!revisionModalContractId || !revisionNotes.trim()) return;
    setActionLoading(revisionModalContractId);
    try {
      const res = await requestContractRevision(revisionModalContractId, userId, 'buyer', revisionNotes);
      if (res.success) {
        alert('Revizyon talebiniz firmaya iletildi.');
        setRevisionModalContractId(null);
        setRevisionNotes('');
        await loadData();
      } else {
        alert(res.error || 'İşlem başarısız.');
      }
    } finally {
      setActionLoading(null);
    }
  }

  const filteredContracts = contracts.filter((c) => {
    const matchesStatus = filterStatus === 'all' || c.status === filterStatus;
    const matchesSearch =
      c.contract_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.data_snapshot?.company?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.data_snapshot?.subject?.title?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link
                href="/alici-paneli/taleplerim"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Taleplerime Dön
              </Link>
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Sözleşmelerim
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Anlaştığınız firma ile adınıza otomatik oluşturulan resmi kiralama ve hizmet sözleşmeleri.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className="w-4 h-4" />
              Yenile
            </button>
          </div>
        </div>

        {/* Bilgilendirme Kartı */}
        <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-1">
            <p className="font-bold">Güvenli Sözleşme Bildirimi:</p>
            <p>
              Sözleşme, sipariş onay anında dondurularak SHA-256 kriptografik özeti ile güvence altına alınmıştır.
              ŞantiyeGO aracı hizmet sağlayıcı olup sözleşmenin tarafı veya kefili değildir.
            </p>
          </div>
        </div>

        {/* Filtre ve Arama */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Sözleşme no, firma veya ilan adı ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending_approval">Onay Bekliyor</option>
            <option value="mutual_approved">Karşılıklı Onaylandı</option>
            <option value="revision_requested">Revizyon İstendi</option>
            <option value="superseded">Eski Sürüm</option>
          </select>
        </div>

        {/* Sözleşmeler Listesi */}
        {loading ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400 text-xs">
            Sözleşmeler yükleniyor...
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <FileText className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">Henüz sözleşmeniz bulunmuyor.</p>
            <p className="text-xs text-slate-500">
              Teklif veya rezervasyon onaylandığında sözleşmeniz burada görüntülenecektir.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((cnt) => {
              const isBuyerApproved = Boolean(cnt.buyer_approved_at);
              const isCompanyApproved = Boolean(cnt.company_approved_at);
              const isMutual = cnt.status === 'mutual_approved';

              return (
                <div
                  key={cnt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-900 text-sm">{cnt.contract_number}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                            v{cnt.template_version}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          {cnt.contract_type === 'rental' ? 'İş Makineleri Kiralama' : 'Ağır Nakliye & Hizmet'} •{' '}
                          {new Date(cnt.created_at).toLocaleDateString('tr-TR')}
                        </p>
                      </div>
                    </div>

                    {/* Durum Rozeti */}
                    <div>
                      {cnt.status === 'mutual_approved' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Karşılıklı Onaylandı
                        </span>
                      )}
                      {cnt.status === 'pending_approval' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          Onay Bekliyor
                        </span>
                      )}
                      {cnt.status === 'revision_requested' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Revizyon İstendi
                        </span>
                      )}
                      {cnt.status === 'superseded' && (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                          Eski Sürüm
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Detay Özeti */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs bg-slate-50/70 p-4 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Hizmet Veren Firma:</span>
                      <p className="font-bold text-slate-800">{cnt.data_snapshot?.company?.name || '-'}</p>
                      <p className="text-slate-500 text-[11px]">
                        Yetkili: {cnt.data_snapshot?.company?.authorized_person || '-'} • {cnt.data_snapshot?.company?.phone || '-'}
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">İlan & Şantiye:</span>
                      <p className="font-bold text-slate-800 truncate">{cnt.data_snapshot?.subject?.title}</p>
                      <p className="text-slate-500 text-[11px]">
                        {cnt.data_snapshot?.subject?.worksite_address} ({cnt.data_snapshot?.subject?.city_name || ''})
                      </p>
                    </div>

                    <div>
                      <span className="text-slate-400 block mb-0.5 font-medium">Sözleşme Bedeli:</span>
                      <p className="font-black text-slate-900 text-sm">
                        {cnt.data_snapshot?.pricing?.total_price?.toLocaleString('tr-TR')}{' '}
                        {cnt.data_snapshot?.pricing?.currency || 'TL'}
                      </p>
                      <p className="text-slate-500 text-[11px]">
                        {cnt.data_snapshot?.pricing?.vat_included ? 'KDV Dahil' : '+ KDV Hariç'}
                      </p>
                    </div>
                  </div>

                  {/* Onay Durum Göstergesi */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs pt-1">
                    <div className="flex items-center gap-4 text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isBuyerApproved ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span>
                          Siz:{' '}
                          <strong className={isBuyerApproved ? 'text-emerald-700' : 'text-slate-500'}>
                            {isBuyerApproved ? 'Onayladınız' : 'Onayınız Bekleniyor'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isCompanyApproved ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span>
                          Firma:{' '}
                          <strong className={isCompanyApproved ? 'text-emerald-700' : 'text-slate-500'}>
                            {isCompanyApproved ? 'Onayladı' : 'Onay Bekliyor'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
                      SHA256: {cnt.pdf_sha256?.slice(0, 16)}...
                    </div>
                  </div>

                  {/* Revizyon Notu Varsa */}
                  {cnt.revision_notes && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl text-xs">
                      <strong>Revizyon Notu:</strong> {cnt.revision_notes}
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <a
                      href={`/api/contracts/${cnt.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      PDF İncele / İndir
                    </a>

                    {!isMutual && (
                      <button
                        onClick={() => setRevisionModalContractId(cnt.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition"
                      >
                        Revizyon İste
                      </button>
                    )}

                    {!isBuyerApproved && (
                      <button
                        onClick={() => handleApprove(cnt.id)}
                        disabled={actionLoading === cnt.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {actionLoading === cnt.id ? 'Onaylanıyor...' : 'Okudum, Onaylıyorum'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Revizyon Modalı */}
        {revisionModalContractId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-rose-500" />
                Sözleşme Revizyon Talebi
              </h3>
              <p className="text-xs text-slate-500">
                Sözleşmede güncellenmesini talep ettiğiniz koşul veya detayları yazınız. Karşı tarafa iletilecektir.
              </p>
              <textarea
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Örn: Çalışma saatleri ve teslim saati hakkında detay eklenmesi rica olunur..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500/20"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setRevisionModalContractId(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Vazgeç
                </button>
                <button
                  onClick={handleRevisionSubmit}
                  disabled={!revisionNotes.trim() || !!actionLoading}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Revizyon İsteğini Gönder
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
