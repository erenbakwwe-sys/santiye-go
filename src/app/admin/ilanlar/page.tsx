'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Layers,
  Search,
  CheckCircle2,
  XCircle,
  Eye,
  AlertTriangle,
  ArrowLeft,
  Check,
  X,
} from 'lucide-react';
import {
  getAdminListings,
  moderateListing,
} from '@/lib/services/admin-service';
import { Listing } from '@/types/database';

export default function AdminListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const loadData = async () => {
    setLoading(true);
    const data = await getAdminListings(selectedStatus);
    setListings(data);
    setSelectedIds([]);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus]);

  const handleAction = async (
    id: string,
    action: 'approve' | 'reject' | 'remove',
    reason: string = ''
  ) => {
    await moderateListing(id, action, reason, 'admin-super-001');
    setNotice(`İlan işlemi (${action}) başarıyla uygulandı.`);
    loadData();
    setTimeout(() => setNotice(''), 3000);
  };

  const handleBatchRemove = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Seçili ${selectedIds.length} ilanı yayından kaldırmak istediğinize emin misiniz?`)) {
      for (const id of selectedIds) {
        await moderateListing(id, 'remove', 'Toplu moderasyon işlemi', 'admin-super-001');
      }
      setNotice(`${selectedIds.length} ilan toplu olarak yayından kaldırıldı.`);
      loadData();
      setTimeout(() => setNotice(''), 3000);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((l) => l.id));
    }
  };

  const filtered = listings.filter((l) => {
    return (
      l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.city_name?.toLowerCase().includes(searchQuery.toLowerCase())
    );
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
            <span className="text-xs text-orange-600 font-bold">İlan Moderasyonu</span>
          </div>
          <h1 className="text-2xl font-black text-navy-900 mt-1">İlan İnceleme & Moderasyon</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Platformdaki ilanları denetleyin, şüpheli ilanları yayından kaldırın.
          </p>
        </div>

        {selectedIds.length > 0 && (
          <button
            type="button"
            onClick={handleBatchRemove}
            className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-md transition"
          >
            Seçili {selectedIds.length} İlanı Yayından Kaldır
          </button>
        )}
      </div>

      {notice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {['all', 'active', 'inactive'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                selectedStatus === st
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {st === 'all' ? 'Tüm İlanlar' : st === 'active' ? 'Yayındakiler' : 'Pasif / Kaldırılan'}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="İlan başlığı veya şehir ara..."
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
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filtered.length && filtered.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded text-orange-600"
                  />
                </th>
                <th className="py-3 px-4">Görsel & Başlık</th>
                <th className="py-3 px-4">Kategori / Fiyat</th>
                <th className="py-3 px-4">Konum</th>
                <th className="py-3 px-4">Durum</th>
                <th className="py-3 px-4 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((l) => {
                const isSelected = selectedIds.includes(l.id);

                return (
                  <tr key={l.id} className={`hover:bg-slate-50 ${isSelected ? 'bg-orange-50/50' : ''}`}>
                    <td className="py-3 px-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          if (isSelected) {
                            setSelectedIds(selectedIds.filter((id) => id !== l.id));
                          } else {
                            setSelectedIds([...selectedIds, l.id]);
                          }
                        }}
                        className="rounded text-orange-600"
                      />
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative w-12 h-10 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                          <Image
                            src={
                              l.images?.[0] ||
                              'https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?auto=format&fit=crop&w=400&q=80'
                            }
                            alt={l.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-extrabold text-navy-900 text-sm line-clamp-1">
                            {l.title}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            #{l.id.slice(0, 8)}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-navy-900">
                        {l.price_daily
                          ? `${Number(l.price_daily).toLocaleString('tr-TR')} ₺/gün`
                          : l.price_sale
                          ? `${Number(l.price_sale).toLocaleString('tr-TR')} ₺`
                          : 'Teklif Usulü'}
                      </div>
                      <div className="text-[10px] text-slate-400 capitalize">
                        {l.listing_type === 'rental' ? 'Kiralık' : 'Satılık'}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div>{l.city_name || 'İstanbul'}</div>
                      <div className="text-[11px] text-slate-500">{l.district_name || ''}</div>
                    </td>

                    <td className="py-3 px-4">
                      {l.status === 'active' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          Yayında
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                          Pasif / Gizli
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/ilan/${l.slug || l.id}`}
                          target="_blank"
                          className="p-1.5 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100"
                          title="İlanı İncele"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {l.status === 'active' ? (
                          <button
                            type="button"
                            onClick={() => handleAction(l.id, 'remove', 'Moderatör kararı')}
                            className="px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold"
                          >
                            Kaldır
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAction(l.id, 'approve', 'İncelendi onaylandı')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                          >
                            Yayınla
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
