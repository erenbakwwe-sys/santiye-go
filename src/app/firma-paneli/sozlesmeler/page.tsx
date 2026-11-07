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
  Upload,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Contract } from '@/types/database';
import {
  getContracts,
  approveContract,
  requestContractRevision,
  uploadSignedContract,
} from '@/lib/services/contract-service';
import { getActiveProfile } from '@/lib/services/auth-service';

export default function FirmaSozlesmelerPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Revizyon modalı
  const [revisionModalContractId, setRevisionModalContractId] = useState<string | null>(null);
  const [revisionNotes, setRevisionNotes] = useState('');

  // Islak imza modalı
  const [uploadModalContractId, setUploadModalContractId] = useState<string | null>(null);
  const [uploadUrl, setUploadUrl] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const profile = await getActiveProfile();
      const currentUserId = profile?.id || 'f0000000-0000-0000-0000-000000000001';
      setUserId(currentUserId);

      const data = await getContracts(currentUserId, 'company');
      setContracts(data);
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(contractId: string) {
    if (!confirm('Sözleşme şartlarını okuduğunuzu ve onayladığınızı onaylıyor musunuz?')) return;
    setActionLoading(contractId);
    try {
      const res = await approveContract(contractId, userId, 'company');
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
      const res = await requestContractRevision(revisionModalContractId, userId, 'company', revisionNotes);
      if (res.success) {
        alert('Revizyon talebi kaydedildi, karşı tarafa bildirim gönderildi.');
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

  async function handleSignedUploadSubmit() {
    if (!uploadModalContractId || !uploadUrl.trim()) return;
    setActionLoading(uploadModalContractId);
    try {
      const res = await uploadSignedContract(uploadModalContractId, userId, 'company', uploadUrl);
      if (res.success) {
        alert('Islak imzalı belge başarıyla kaydedildi.');
        setUploadModalContractId(null);
        setUploadUrl('');
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
      c.data_snapshot?.buyer?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
                href="/firma-paneli"
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Firma Paneline Dön
              </Link>
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-6 h-6 text-amber-500" />
              Sözleşmelerim (Otomatik PDF)
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Onaylanan kiralama ve hizmet işleri için iki tarafın verileriyle üretilmiş resmi sözleşmeler.
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

        {/* Yasal Uyarı Kartı */}
        <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-bold">Hukuki İnceleme Notu (TASLAK):</p>
            <p>
              Sözleşmeler tarafların platformdaki beyanlarına göre otomatik dondurulmuştur. ŞantiyeGO 6563 sayılı Kanun
              kapsamında Aracı Hizmet Sağlayıcıdır; sözleşmenin tarafı veya garantörü değildir. Platform komisyonu sözleşme
              metninde yer almaz.
            </p>
          </div>
        </div>

        {/* Filtre ve Arama */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Sözleşme no, alıcı veya ilan adı ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-amber-500/20"
          >
            <option value="all">Tüm Durumlar</option>
            <option value="pending_approval">Onay Bekliyor</option>
            <option value="mutual_approved">Karşılıklı Onaylandı</option>
            <option value="revision_requested">Revizyon İstendi</option>
            <option value="superseded">Eski Sürüm (Geçersiz)</option>
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
              Rezervasyon veya teklif kabul edilip iletişim açılışı gerçekleştiğinde sözleşmeniz otomatik üretilecektir.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((cnt) => {
              const isCompanyApproved = Boolean(cnt.company_approved_at);
              const isBuyerApproved = Boolean(cnt.buyer_approved_at);
              const isMutual = cnt.status === 'mutual_approved';

              return (
                <div
                  key={cnt.id}
                  className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:border-slate-300 transition space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
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
                          Revizyon Talep Edildi
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
                      <span className="text-slate-400 block mb-0.5 font-medium">Alıcı (Kiracı / Müşteri):</span>
                      <p className="font-bold text-slate-800">
                        {cnt.data_snapshot?.buyer?.company_name || cnt.data_snapshot?.buyer?.full_name || '-'}
                      </p>
                      <p className="text-slate-500 text-[11px]">{cnt.data_snapshot?.buyer?.phone || '-'}</p>
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
                            isCompanyApproved ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span>
                          Firmanız:{' '}
                          <strong className={isCompanyApproved ? 'text-emerald-700' : 'text-slate-500'}>
                            {isCompanyApproved ? 'Onayladı' : 'Onay Bekliyor'}
                          </strong>
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            isBuyerApproved ? 'bg-emerald-500' : 'bg-slate-300'
                          }`}
                        />
                        <span>
                          Alıcı:{' '}
                          <strong className={isBuyerApproved ? 'text-emerald-700' : 'text-slate-500'}>
                            {isBuyerApproved ? 'Onayladı' : 'Onay Bekliyor'}
                          </strong>
                        </span>
                      </div>
                    </div>

                    {/* SHA-256 Rozeti */}
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

                  {/* Islak İmzalı Kopya Varsa */}
                  {cnt.signed_copy_url && (
                    <div className="bg-slate-100 p-2.5 rounded-xl text-xs flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                        <FileCheck className="w-4 h-4 text-emerald-600" />
                        Islak İmzalı Belge Sisteme Yüklenmiştir.
                      </span>
                      <a
                        href={cnt.signed_copy_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-amber-600 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                      >
                        Görüntüle <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  )}

                  {/* Aksiyon Butonları */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    {/* PDF Görüntüle / İndir */}
                    <a
                      href={`/api/contracts/${cnt.id}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                    >
                      <Download className="w-3.5 h-3.5 text-slate-500" />
                      PDF Sözleşmeyi İndir
                    </a>

                    {/* Islak İmzalı Yükle Butonu */}
                    <button
                      onClick={() => setUploadModalContractId(cnt.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition"
                    >
                      <Upload className="w-3.5 h-3.5 text-slate-500" />
                      Islak İmza Yükle
                    </button>

                    {/* Revizyon İste */}
                    {!isMutual && (
                      <button
                        onClick={() => setRevisionModalContractId(cnt.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition"
                      >
                        Revizyon İste
                      </button>
                    )}

                    {/* Okudum Onaylıyorum Butonu */}
                    {!isCompanyApproved && (
                      <button
                        onClick={() => handleApprove(cnt.id)}
                        disabled={actionLoading === cnt.id}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs shadow-sm transition disabled:opacity-50"
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
                Sözleşmede değiştirilmesini istediğiniz madde veya koşulları (tarih, bedel, şantiye adresi vb.) belirtiniz.
                Onaylar sıfırlanacak ve alıcıya bildirim iletilecektir.
              </p>
              <textarea
                rows={4}
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Örn: Çalışma başlangıç tarihinin 18 Kasım olarak güncellenmesi rica olunur..."
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
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

        {/* Islak İmza Yükleme Modalı */}
        {uploadModalContractId && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-amber-500" />
                Islak İmzalı Sözleşme Yükle
              </h3>
              <p className="text-xs text-slate-500">
                PDF sözleşmeyi indirip kaşe/imza attıktan sonra taratarak veya fotoğraflayarak oluşturduğunuz belge bağlantısını
                giriniz.
              </p>
              <input
                type="text"
                value={uploadUrl}
                onChange={(e) => setUploadUrl(e.target.value)}
                placeholder="https://... veya dosya bağlantısı"
                className="w-full p-3 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-amber-500/20"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setUploadModalContractId(null)}
                  className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  İptal
                </button>
                <button
                  onClick={handleSignedUploadSubmit}
                  disabled={!uploadUrl.trim() || !!actionLoading}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-bold disabled:opacity-50"
                >
                  Kaydet ve Onayla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
