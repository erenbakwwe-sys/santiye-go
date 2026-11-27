'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Phone, MessageCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type Row = {
  id: string;
  title: string;
  description: string;
  status: string;
  quantity: number | null;
  start_date: string;
  created_at: string;
  buyer_id: string;
  need_operator: boolean | null;
  need_fuel: boolean | null;
  need_transport: boolean | null;
  address_detail: string | null;
  category: { name: string } | null;
  city: { name: string } | null;
  district: { name: string } | null;
};

type Enriched = Row & {
  buyerName: string;
  buyerPhone: string;
  recipientNames: string[];
  onlyPlatform: boolean;
  quoteCount: number;
};

const STATUS_LABEL: Record<string, string> = {
  sent: 'Teklif bekliyor',
  quotes_received: 'Teklif geldi',
  accepted: 'Anlaşıldı',
  rejected: 'İptal edildi',
  expired: 'Süresi doldu',
  draft: 'Taslak',
};

type Filter = 'unmatched' | 'waiting' | 'all';

function waNumber(raw: string) {
  const d = raw.replace(/\D/g, '');
  if (d.startsWith('90')) return d;
  if (d.startsWith('0')) return `9${d}`;
  return `90${d}`;
}

/**
 * Tüm teklif talepleri. Bölgede uygun firma bulunamayan talepler otomatik olarak
 * "ŞantiyeGO Tedarik" platform hesabına düşer; burada müşteriyi arayıp tedarikçi bulursunuz.
 */
export default function AdminQuoteRequestsPage() {
  const supabase = createClient();
  const [rows, setRows] = useState<Enriched[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('unmatched');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data, error: qErr } = await supabase
        .from('quote_requests')
        .select(
          'id, title, description, status, quantity, start_date, created_at, buyer_id, need_operator, need_fuel, need_transport, address_detail, category:categories(name), city:cities(name), district:districts(name)'
        )
        .order('created_at', { ascending: false })
        .limit(300);
      if (qErr) throw qErr;
      const reqs = (data as unknown as Row[]) || [];
      const ids = reqs.map((r) => r.id);
      const buyerIds = Array.from(new Set(reqs.map((r) => r.buyer_id)));

      const [recRes, quoteRes, profRes] = await Promise.all([
        ids.length
          ? supabase
              .from('quote_request_recipients')
              .select('request_id, company:companies(name, is_platform)')
              .in('request_id', ids)
          : Promise.resolve({ data: [] as unknown[] }),
        ids.length
          ? supabase.from('quotes').select('request_id').in('request_id', ids)
          : Promise.resolve({ data: [] as unknown[] }),
        buyerIds.length
          ? supabase.from('profiles').select('id, full_name, phone').in('id', buyerIds)
          : Promise.resolve({ data: [] as unknown[] }),
      ]);

      const recipients = new Map<string, { name: string; is_platform: boolean }[]>();
      for (const r of (recRes.data || []) as { request_id: string; company: { name: string; is_platform: boolean } | null }[]) {
        const list = recipients.get(r.request_id) || [];
        if (r.company) list.push(r.company);
        recipients.set(r.request_id, list);
      }
      const quoteCounts = new Map<string, number>();
      for (const q of (quoteRes.data || []) as { request_id: string }[]) {
        quoteCounts.set(q.request_id, (quoteCounts.get(q.request_id) || 0) + 1);
      }
      const profiles = new Map<string, { full_name: string | null; phone: string | null }>();
      for (const p of (profRes.data || []) as { id: string; full_name: string | null; phone: string | null }[]) {
        profiles.set(p.id, p);
      }

      setRows(
        reqs.map((r) => {
          const recs = recipients.get(r.id) || [];
          return {
            ...r,
            buyerName: profiles.get(r.buyer_id)?.full_name || 'Alıcı',
            buyerPhone: profiles.get(r.buyer_id)?.phone || '',
            recipientNames: recs.filter((c) => !c.is_platform).map((c) => c.name),
            onlyPlatform: recs.length === 0 || recs.every((c) => c.is_platform),
            quoteCount: quoteCounts.get(r.id) || 0,
          };
        })
      );
    } catch {
      setError('Talepler yüklenemedi. Yönetici olarak giriş yaptığınızdan emin olun.');
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    if (filter === 'unmatched') return rows.filter((r) => r.onlyPlatform && ['sent', 'quotes_received'].includes(r.status));
    if (filter === 'waiting') return rows.filter((r) => r.quoteCount === 0 && r.status === 'sent');
    return rows;
  }, [rows, filter]);

  const counts = useMemo(
    () => ({
      unmatched: rows.filter((r) => r.onlyPlatform && ['sent', 'quotes_received'].includes(r.status)).length,
      waiting: rows.filter((r) => r.quoteCount === 0 && r.status === 'sent').length,
      all: rows.length,
    }),
    [rows]
  );

  const tabs: [Filter, string][] = [
    ['unmatched', 'Firma bulunamayanlar'],
    ['waiting', 'Hiç teklif almayanlar'],
    ['all', 'Tümü'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">Teklif talepleri</h1>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Bölgede uygun firma bulunamayan talepler otomatik olarak ŞantiyeGO Tedarik hesabına düşer ve size bildirim
          gelir. Müşteriyi arayıp ihtiyacını netleştirin, tedarikçi bulun; teklifi{' '}
          <Link href="/firma-paneli/talepler" className="underline font-medium">
            platform hesabının talepler sayfasından
          </Link>{' '}
          verin.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-4 py-2 rounded-md border text-sm font-medium transition-colors ${
              filter === key
                ? 'bg-navy-900 border-navy-900 text-white'
                : 'bg-white border-slate-300 text-navy-900 hover:border-slate-500'
            }`}
          >
            {label} ({counts[key]})
          </button>
        ))}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">{error}</div>}

      {loading ? (
        <div className="p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-md">Yükleniyor…</div>
      ) : visible.length === 0 ? (
        <div className="p-8 text-center text-slate-600 bg-white border border-slate-200 rounded-md">
          Bu listede talep yok.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((r) => (
            <div key={r.id} className="bg-white border border-slate-200 rounded-md p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-navy-900">{r.title}</h2>
                    <span className="px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700 text-xs font-medium">
                      {STATUS_LABEL[r.status] || r.status}
                    </span>
                    {r.onlyPlatform && (
                      <span className="px-2 py-0.5 rounded-sm bg-amber-100 text-amber-900 text-xs font-medium inline-flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        Bölgede firma yok
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">
                    {[r.category?.name, [r.city?.name, r.district?.name].filter(Boolean).join(', ')]
                      .filter(Boolean)
                      .join(' · ')}
                    {' · '}Başlangıç: {new Date(r.start_date).toLocaleDateString('tr-TR')}
                    {r.quantity ? ` · Miktar: ${r.quantity}` : ''}
                  </p>
                  <p className="text-sm text-slate-800 mt-2 whitespace-pre-line line-clamp-4">{r.description}</p>
                  {(r.need_operator || r.need_fuel || r.need_transport) && (
                    <p className="text-sm text-slate-600 mt-1.5">
                      Fiyata dahil olsun:{' '}
                      {[r.need_operator && 'operatör', r.need_fuel && 'yakıt', r.need_transport && 'nakliye']
                        .filter(Boolean)
                        .join(', ')}
                    </p>
                  )}
                  <p className="text-xs text-slate-500 mt-2">
                    {new Date(r.created_at).toLocaleString('tr-TR')} ·{' '}
                    {r.recipientNames.length > 0
                      ? `İletilen firmalar: ${r.recipientNames.join(', ')}`
                      : 'Hiçbir firmaya iletilemedi'}{' '}
                    · {r.quoteCount} teklif
                  </p>
                </div>

                <div className="shrink-0 lg:w-64 bg-slate-50 border border-slate-200 rounded-md p-4">
                  <div className="text-xs text-slate-500">Müşteri</div>
                  <div className="font-medium text-navy-900">{r.buyerName}</div>
                  {r.buyerPhone ? (
                    <div className="mt-3 flex flex-col gap-2">
                      <a href={`tel:${r.buyerPhone.replace(/\s/g, '')}`} className="btn-primary !min-h-[42px] text-sm">
                        <Phone className="w-4 h-4" />
                        {r.buyerPhone}
                      </a>
                      <a
                        href={`https://wa.me/${waNumber(r.buyerPhone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary !min-h-[42px] text-sm"
                      >
                        <MessageCircle className="w-4 h-4" />
                        WhatsApp
                      </a>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-600 mt-2">Telefon numarası yok.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
