'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus, Inbox, MessageSquare, ExternalLink, Info } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { moderateListing } from '@/lib/services/admin-service';

type PlatformListing = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  listing_type: string;
  price_daily: number | null;
  price_monthly: number | null;
  price_sale: number | null;
  created_at: string;
  city: { name: string } | null;
  district: { name: string } | null;
  category: { name: string } | null;
};

const STATUS_LABEL: Record<string, string> = {
  active: 'Yayında',
  inactive: 'Yayında değil',
  pending_approval: 'Onay bekliyor',
  rejected: 'Reddedildi',
  draft: 'Taslak',
};

/**
 * "ŞantiyeGO Tedarik" platform hesabının ilanları. İlanlar platform adına, açıkça bu hesapla
 * yayınlanır; gelen mesajlar ve talepler yöneticiye düşer.
 */
export default function PlatformSupplyPage() {
  const supabase = createClient();
  const [company, setCompany] = useState<{ id: string; name: string } | null>(null);
  const [ownsPlatform, setOwnsPlatform] = useState(false);
  const [missingPhone, setMissingPhone] = useState(false);
  const [listings, setListings] = useState<PlatformListing[]>([]);
  const [openRequests, setOpenRequests] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: platform } = await supabase.rpc('get_platform_company');
      const pc = Array.isArray(platform) ? platform[0] : null;
      setCompany(pc || null);
      if (!pc) return;

      const {
        data: { user },
      } = await supabase.auth.getUser();
      const { data: own } = await supabase
        .from('companies')
        .select('id, phone')
        .eq('user_id', user?.id ?? '')
        .eq('is_platform', true)
        .maybeSingle();
      setOwnsPlatform(!!own);
      setMissingPhone(!!own && !String(own.phone || '').trim());

      const { data } = await supabase
        .from('listings')
        .select(
          'id, title, slug, status, listing_type, price_daily, price_monthly, price_sale, created_at, city:cities(name), district:districts(name), category:categories(name)'
        )
        .eq('company_id', pc.id)
        .neq('status', 'deleted')
        .order('created_at', { ascending: false });
      setListings((data as unknown as PlatformListing[]) || []);

      const { count } = await supabase
        .from('quote_request_recipients')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', pc.id);
      setOpenRequests(count ?? 0);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (l: PlatformListing) => {
    const action = l.status === 'active' ? 'remove' : 'approve';
    const res = await moderateListing(l.id, action, 'ŞantiyeGO Tedarik ilan durumu değiştirildi');
    setNotice(res.success ? (action === 'approve' ? 'İlan yayına alındı.' : 'İlan yayından kaldırıldı.') : res.error || 'İşlem başarısız.');
    load();
    setTimeout(() => setNotice(''), 3000);
  };

  const price = (l: PlatformListing) => {
    const fmt = (n: number) => `${Number(n).toLocaleString('tr-TR')} ₺`;
    if (l.price_daily) return `${fmt(l.price_daily)} / gün`;
    if (l.price_monthly) return `${fmt(l.price_monthly)} / ay`;
    if (l.price_sale) return fmt(l.price_sale);
    return 'Teklif usulü';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-navy-900">ŞantiyeGO Tedarik ilanları</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Platformun kendi adına, anlaşmalı firmalar aracılığıyla hizmet verdiği ilanlar. Bu ilanlarda satıcı
            olarak &quot;ŞantiyeGO Tedarik&quot; görünür; gelen mesaj ve talepler size düşer.
          </p>
        </div>
        {ownsPlatform && (
          <Link href="/firma-paneli/yeni-ilan" className="btn-primary shrink-0">
            <Plus className="w-5 h-5" />
            Yeni ilan aç
          </Link>
        )}
      </div>

      {notice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm">{notice}</div>
      )}

      {!loading && !company && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-sm">
          Platform hesabı bulunamadı. Veritabanında 42_platform_supply_account.sql migration&apos;ının uygulandığından
          emin olun.
        </div>
      )}

      {!loading && company && !ownsPlatform && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-sm flex gap-2">
          <Info className="w-5 h-5 shrink-0" />
          Platform hesabı başka bir yönetici kullanıcısına bağlı. İlan açmak ve gelen mesajları görmek için o hesapla
          giriş yapın.
        </div>
      )}

      {ownsPlatform && missingPhone && (
        <div className="p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-md text-sm">
          ŞantiyeGO Tedarik hesabının telefon numarası boş. Müşteri bir teklifi kabul ettiğinde ya da rezervasyon
          onaylandığında bu numara müşteriye gösterilir.{' '}
          <Link href="/firma-paneli/profil" className="font-medium underline">
            Telefon numarasını ekleyin
          </Link>
          .
        </div>
      )}

      {ownsPlatform && (
        <div className="grid sm:grid-cols-3 gap-3">
          <Link
            href="/firma-paneli/talepler"
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-md p-4 flex items-center gap-3"
          >
            <Inbox className="w-5 h-5 text-orange-600" />
            <span>
              <span className="block font-medium text-navy-900">Platforma gelen talepler</span>
              <span className="block text-sm text-slate-600">
                {openRequests === null ? '…' : `${openRequests} talep`} · teklif verin
              </span>
            </span>
          </Link>
          <Link
            href="/admin/talepler"
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-md p-4 flex items-center gap-3"
          >
            <Inbox className="w-5 h-5 text-orange-600" />
            <span>
              <span className="block font-medium text-navy-900">Tüm teklif talepleri</span>
              <span className="block text-sm text-slate-600">Müşteri iletişim bilgileriyle</span>
            </span>
          </Link>
          <Link
            href="/mesajlar"
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-md p-4 flex items-center gap-3"
          >
            <MessageSquare className="w-5 h-5 text-orange-600" />
            <span>
              <span className="block font-medium text-navy-900">Mesajlar</span>
              <span className="block text-sm text-slate-600">İlanlara gelen sorular</span>
            </span>
          </Link>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Yükleniyor…</div>
        ) : listings.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            Henüz ŞantiyeGO Tedarik ilanı yok.
            {ownsPlatform && (
              <>
                {' '}
                <Link href="/firma-paneli/yeni-ilan" className="text-orange-700 font-medium underline">
                  İlk ilanı açın
                </Link>
                .
              </>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-600">
              <tr>
                <th className="px-4 py-3 font-medium">İlan</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Konum</th>
                <th className="px-4 py-3 font-medium hidden md:table-cell">Fiyat</th>
                <th className="px-4 py-3 font-medium">Durum</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-navy-900">{l.title}</div>
                    <div className="text-slate-500">{l.category?.name}</div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-slate-700">
                    {[l.city?.name, l.district?.name].filter(Boolean).join(', ')}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell tabular text-slate-700">{price(l)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-sm text-xs font-medium ${
                        l.status === 'active' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {STATUS_LABEL[l.status] || l.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/ilan/${l.slug || l.id}`}
                        className="p-2 text-slate-600 hover:text-navy-900"
                        title="İlanı görüntüle"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                      <button type="button" onClick={() => toggle(l)} className="btn-secondary !min-h-0 !py-1.5 !px-3 text-sm">
                        {l.status === 'active' ? 'Yayından kaldır' : 'Yayına al'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
