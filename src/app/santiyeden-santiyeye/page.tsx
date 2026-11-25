'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowRight, BadgePercent, CalendarDays, ClipboardList, MapPin, Package, Phone, Plus, Recycle, Truck, X } from 'lucide-react';
import { ALL_81_CITIES } from '@/lib/all-cities';
import { isDemoFallbackAllowed } from '@/lib/config/runtime';
import { realCount, visibleItems } from '@/lib/utils/sample-content';
import {
  LIMITS, LISTING_TYPE_LABEL, MarketListing, MyListing, Inquiry, ListingType, NewListing,
  addDays, categoriesFor, createListing, currentUserId, discountPercent, exampleListings, fetchInquiriesFor, fetchListings,
  fetchMyListings, formatDate, formatPrice, isDemo, markListingSold, phoneHref, sendInquiry, today, validateInquiry,
} from '@/lib/circular-market-service';

const CITY_NAMES = ALL_81_CITIES.map(c => c.name).sort((a, b) => a.localeCompare(b, 'tr'));
const input = 'w-full rounded-lg border border-slate-300 bg-white p-2 text-navy-900 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30';
const action = 'inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-4 py-3 font-bold text-navy-900 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50';
const TABS: ListingType[] = ['SURPLUS_MATERIAL', 'BACKHAUL_TRUCK'];

export default function CircularMarketPage() {
  const [tab, setTab] = useState<ListingType>('SURPLUS_MATERIAL');
  const [rows, setRows] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState('');
  const [city, setCity] = useState('');
  const [category, setCategory] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [inquiryFor, setInquiryFor] = useState<MarketListing | null>(null);
  const [creating, setCreating] = useState(false);
  const [showMine, setShowMine] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchListings()
      .then(data => { if (active) { setRows(data); setNotice(''); } })
      .catch(() => { if (active) { setRows([]); setNotice(isDemoFallbackAllowed() ? 'Canlı ilanlar alınamadı. Örnek ilanlar gösteriliyor.' : 'Canlı ilanlar alınamadı. Lütfen daha sonra tekrar deneyin.'); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reloadKey]);

  useEffect(() => {
    let active = true;
    currentUserId().then(id => { if (active) setUserId(id); });
    return () => { active = false; };
  }, []);

  const demoAllowed = isDemoFallbackAllowed();
  const realRows = rows.filter(r => !isDemo(r.id));
  const shownRows = visibleItems(realRows, exampleListings(), demoAllowed);
  const onlyExamples = realRows.length === 0 && shownRows.length > 0;
  const inTab = shownRows.filter(r => r.listing_type === tab);
  const results = inTab.filter(r =>
    (!city || r.origin_city === city || r.dest_city === city) && (!category || r.category === category));
  const count = (t: ListingType) => realCount(realRows.filter(r => r.listing_type === t));
  const truck = tab === 'BACKHAUL_TRUCK';

  return (
    <main className="mx-auto max-w-7xl space-y-5 px-4 py-8 text-navy-900">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-2xl bg-navy-900 p-6 text-white">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-orange-400"><Recycle className="h-4 w-4" aria-hidden /> Döngüsel Lojistik Pazarı</p>
          <h1 className="text-3xl font-black">Şantiyeden Şantiyeye</h1>
          <p className="mt-1 max-w-2xl text-slate-300">
            Şantiyede artan malzemeyi indirimli alın ya da satın; boş dönen kamyon ve lowbed araçlarını güzergahına göre ucuza değerlendirin.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {userId && (
            <button type="button" onClick={() => setShowMine(v => !v)} aria-expanded={showMine}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-3 font-bold text-white hover:bg-navy-800">
              <ClipboardList className="h-4 w-4" aria-hidden /> İlanlarım &amp; Gelen Talepler
            </button>
          )}
          <button type="button" onClick={() => setCreating(true)} className={action}>
            <Plus className="h-4 w-4" aria-hidden /> Artan Mal / Boş Araç İlanı Ver
          </button>
        </div>
      </header>

      {showMine && userId && <MyPanel refreshKey={reloadKey} />}

      <div role="tablist" aria-label="İlan türü" className="flex flex-wrap gap-2">
        {TABS.map(t => (
          <button key={t} type="button" role="tab" id={`tab-${t}`} aria-selected={tab === t} aria-controls="market-panel"
            onClick={() => { setTab(t); setCategory(''); }}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-3 font-black transition ${tab === t ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-300 bg-white text-navy-900 hover:border-orange-500'}`}>
            {t === 'SURPLUS_MATERIAL' ? <Package className="h-4 w-4" aria-hidden /> : <Truck className="h-4 w-4" aria-hidden />}
            {LISTING_TYPE_LABEL[t]}
            <span className={`rounded-full px-2 py-0.5 text-xs ${tab === t ? 'bg-orange-500 text-navy-900' : 'bg-slate-100'}`}>{count(t)}</span>
          </button>
        ))}
      </div>

      <section id="market-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="space-y-4">
        <div aria-label="Filtreler" className="grid gap-3 rounded-2xl border bg-white p-5 sm:grid-cols-3">
          <label className="text-sm font-bold">{truck ? 'Şehir (kalkış veya varış)' : 'Şehir'}
            <select className={input + ' mt-1 font-normal'} value={city} onChange={e => setCity(e.target.value)}>
              <option value="">Tüm şehirler</option>
              {CITY_NAMES.map(n => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">Kategori
            <select className={input + ' mt-1 font-normal'} value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">Tüm kategoriler</option>
              {categoriesFor(tab).map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <div className="flex items-end">
            <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 font-bold hover:bg-slate-50 disabled:opacity-40"
              disabled={!city && !category} onClick={() => { setCity(''); setCategory(''); }}>Filtreleri temizle</button>
          </div>
        </div>

        {loading && <p role="status">Yükleniyor…</p>}
        {!loading && notice && <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{notice}</p>}
        {!loading && !notice && onlyExamples && (
          <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">Henüz yayında ilan yok. Aşağıdakiler örnek ilandır; talep gönderilemez.</p>
        )}
        {!loading && !notice && !results.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            {shownRows.length === 0 ? (
              <>
                <h2 className="text-xl font-black">Henüz yayında ilan yok</h2>
                <p className="mt-2">Artan malzeme ve boş dönüş araç ilanları yayınlandıkça burada listelenecek.</p>
              </>
            ) : <p className="font-bold">Bu filtrelerle eşleşen ilan bulunamadı.</p>}
            <button type="button" className={action + ' mt-4'} onClick={() => setCreating(true)}>İlk ilanı siz verin</button>
          </div>
        )}
        <div className="grid gap-5 pt-2 sm:grid-cols-2 lg:grid-cols-3">
          {results.map(item => <ListingCard key={item.id} item={item} onInquire={() => setInquiryFor(item)} />)}
        </div>
        <p className="text-xs text-slate-500">
          ŞantiyeGO bu ilanlarda taraf değildir. Ödeme yapmadan önce malzemeyi/aracı ve belgeleri yerinde kontrol edin; ilan sahibiyle fiyat ve teslim şartlarını kendiniz netleştirin.
        </p>
      </section>

      {inquiryFor && <InquiryDialog item={inquiryFor} userId={userId} close={() => setInquiryFor(null)} />}
      {creating && (
        <CreateDialog userId={userId} close={() => setCreating(false)}
          onCreated={type => { setTab(type); setCity(''); setCategory(''); setReloadKey(k => k + 1); setShowMine(true); }} />
      )}
    </main>
  );
}

// ---------------------------------------------------------------- Kart
function ListingCard({ item, onInquire }: { item: MarketListing; onInquire: () => void }) {
  const pct = discountPercent(item.discount_note);
  const truck = item.listing_type === 'BACKHAUL_TRUCK';
  const place = (city: string, district?: string | null) => (district ? `${district}, ${city}` : city);
  return (
    <article className="relative flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {pct !== null && (
        <span className="absolute -top-3 right-4 inline-flex items-center gap-1 rounded-full bg-orange-500 px-3 py-1 text-xs font-black text-navy-900 shadow">
          <BadgePercent className="h-3.5 w-3.5" aria-hidden /> −%{pct}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold">{item.category}</span>
        {isDemo(item.id) && <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">Örnek ilan</span>}
        {item.is_mine && <span className="rounded-md bg-navy-900 px-2 py-1 text-xs font-bold text-white">Sizin ilanınız</span>}
      </div>
      <h2 className="text-lg font-black leading-snug">{item.title}</h2>
      <p className="flex items-center gap-2 text-sm font-semibold">
        {truck ? <Truck className="h-4 w-4 shrink-0 text-orange-600" aria-hidden /> : <Package className="h-4 w-4 shrink-0 text-orange-600" aria-hidden />}
        {item.quantity_info}
      </p>
      {truck && item.dest_city ? (
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-slate-50 p-2 text-sm font-bold" aria-label="Güzergah">
          <MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
          <span>{place(item.origin_city, item.origin_district)}</span>
          <ArrowRight className="h-4 w-4 shrink-0 text-orange-600" aria-label="ile" />
          <span>{place(item.dest_city, item.dest_district)}</span>
        </p>
      ) : (
        <p className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden /> {place(item.origin_city, item.origin_district)}</p>
      )}
      {item.description && <p className="line-clamp-3 text-sm text-slate-600">{item.description}</p>}
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <CalendarDays className="h-3.5 w-3.5" aria-hidden /> {formatDate(item.available_until)} tarihine kadar {truck ? 'müsait' : 'geçerli'}
      </p>
      <div className="mt-auto">
        <p className="text-xs font-bold text-slate-500">{truck ? 'Nakliye bedeli' : 'Toplam fiyat'}</p>
        <p className="text-2xl font-black">{formatPrice(item.price)}</p>
        {item.discount_note && <p className="text-xs font-semibold text-emerald-700">{item.discount_note}</p>}
      </div>
      {!isDemo(item.id) && (
        <button type="button" className={action} onClick={onInquire} disabled={item.is_mine}>
          {item.is_mine ? 'Bu sizin ilanınız' : 'Hemen Talep Gönder / İletişime Geç'}
        </button>
      )}
    </article>
  );
}

// ---------------------------------------------------------------- Modal çerçevesi
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { ref.current?.showModal(); }, []);
  return (
    <dialog ref={ref} onClose={onClose} aria-labelledby="circular-modal-title" className="w-full max-w-lg rounded-2xl p-0 text-navy-900 backdrop:bg-navy-900/60">
      <div className="flex items-center justify-between gap-3 bg-navy-900 px-5 py-3 text-white">
        <h2 id="circular-modal-title" className="text-lg font-black">{title}</h2>
        <button type="button" aria-label="Kapat" onClick={() => ref.current?.close()} className="rounded p-1 hover:bg-navy-800"><X className="h-5 w-5" /></button>
      </div>
      <div className="max-h-[80vh] overflow-y-auto p-5">{children}</div>
    </dialog>
  );
}

function LoginPrompt({ what }: { what: string }) {
  return (
    <div className="space-y-3">
      <p>{what} için giriş yapmanız gerekir.</p>
      <Link className={action} href="/giris?redirect=/santiyeden-santiyeye">Giriş Yap</Link>
      <p className="text-sm text-slate-600">Hesabınız yoksa <Link className="font-bold underline" href="/kayit">kayıt olun</Link>.</p>
    </div>
  );
}

// ---------------------------------------------------------------- Talep modalı
function InquiryDialog({ item, userId, close }: { item: MarketListing; userId: string | null; close: () => void }) {
  const demo = isDemo(item.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [phone, setPhone] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const offerRaw = String(f.get('offer') ?? '').trim();
    const values = { message: String(f.get('message') ?? ''), requester_phone: String(f.get('phone') ?? ''), offered_price: offerRaw ? Number(offerRaw) : null };
    setBusy(true); setError('');
    try {
      if (demo) {
        const problem = validateInquiry(values);
        if (problem) throw new Error(problem);
      } else {
        setPhone(await sendInquiry(item.id, values));
      }
      setDone(true);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Talep Gönder / İletişime Geç" onClose={close}>
      <p className="mb-3 font-bold">{item.title}</p>
      {!userId && !demo ? <LoginPrompt what="Talep göndermek" /> : done ? (
        <div className="space-y-3" role="status">
          {demo ? <p>Bu bir örnek ilandır; talep gönderilmedi. Deneme tamamlandı.</p> : <p className="font-bold text-emerald-700">Talebiniz ilan sahibine iletildi.</p>}
          {phone && (
            <p className="flex items-center gap-2 rounded-lg bg-slate-50 p-3">
              <Phone className="h-4 w-4 text-orange-600" aria-hidden /> İlan sahibi:
              <a className="font-black underline" href={phoneHref(phone)}>{phone}</a>
            </p>
          )}
          <button type="button" className={action} onClick={close}>Kapat</button>
        </div>
      ) : (
        <form className="grid gap-3" onSubmit={submit}>
          {demo && <p className="rounded-lg bg-amber-50 p-2 text-sm text-amber-900">Örnek ilan · gönderilen deneme talebi kaydedilmez.</p>}
          <label className="text-sm font-bold">Mesajınız
            <textarea name="message" required minLength={5} maxLength={LIMITS.message} rows={4} className={input + ' mt-1 font-normal'}
              placeholder="Ürün/araç hâlâ müsait mi? Yükleme için ne zaman uygunsunuz?" />
          </label>
          <label className="text-sm font-bold">Size ulaşılacak telefon
            <input name="phone" type="tel" required minLength={7} maxLength={25} pattern="[0-9+\s\(\)\-]+" inputMode="tel" autoComplete="tel" className={input + ' mt-1 font-normal'} />
          </label>
          <label className="text-sm font-bold">Teklifiniz (₺, isteğe bağlı)
            <input name="offer" type="number" min="0.01" max="1000000000" step="0.01" className={input + ' mt-1 font-normal'} />
          </label>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}
          <button disabled={busy} className={action}>{busy ? 'Gönderiliyor…' : 'Talebi Gönder'}</button>
        </form>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- İlan verme modalı
function CreateDialog({ userId, close, onCreated }: { userId: string | null; close: () => void; onCreated: (type: ListingType) => void }) {
  const [type, setType] = useState<ListingType>('SURPLUS_MATERIAL');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const truck = type === 'BACKHAUL_TRUCK';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const f = new FormData(e.currentTarget);
    const text = (k: string) => String(f.get(k) ?? '');
    const values: NewListing = {
      listing_type: type, title: text('title'), category: text('category'), quantity_info: text('quantity_info'),
      price: Number(text('price')), discount_note: text('discount_note'), origin_city: text('origin_city'), origin_district: text('origin_district'),
      dest_city: truck ? text('dest_city') : '', dest_district: truck ? text('dest_district') : '', available_until: text('available_until'),
      contact_phone: text('contact_phone'), description: text('description'),
    };
    setBusy(true); setError('');
    try {
      await createListing(values);
      onCreated(type);
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Artan Mal / Boş Araç İlanı Ver" onClose={close}>
      {!userId ? <LoginPrompt what="İlan vermek" /> : (
        <form className="grid gap-3" onSubmit={submit}>
          <div role="radiogroup" aria-label="İlan türü" className="grid grid-cols-2 gap-2">
            {TABS.map(t => (
              <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}
                className={`rounded-lg border px-3 py-2 text-sm font-black ${type === t ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-300 hover:border-orange-500'}`}>
                {t === 'SURPLUS_MATERIAL' ? 'Artan Malzeme' : 'Boş Dönüş Aracı'}
              </button>
            ))}
          </div>
          <label className="text-sm font-bold">Başlık
            <input name="title" required minLength={3} maxLength={LIMITS.title} className={input + ' mt-1 font-normal'}
              placeholder={truck ? 'Gebze - Ankara Boş Dönen Lowbed Tır' : '4 Palet Ytong Gazbeton'} />
          </label>
          <label className="text-sm font-bold">Kategori
            <select key={type} name="category" required defaultValue="" className={input + ' mt-1 font-normal'}>
              <option value="" disabled>Seçin</option>
              {categoriesFor(type).map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="text-sm font-bold">{truck ? 'Kapasite' : 'Miktar'}
            <input name="quantity_info" required maxLength={LIMITS.quantity} className={input + ' mt-1 font-normal'}
              placeholder={truck ? '28 Ton Kapasite' : '4 Palet / ~240 Adet'} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">{truck ? 'Nakliye bedeli (₺)' : 'Fiyat (₺)'}
              <input name="price" type="number" required min="0.01" max="1000000000" step="0.01" className={input + ' mt-1 font-normal'} />
            </label>
            <label className="text-sm font-bold">İndirim notu
              <input name="discount_note" maxLength={LIMITS.discount} className={input + ' mt-1 font-normal'} placeholder="Piyasa fiyatının %35 altı" />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">{truck ? 'Kalkış şehri' : 'Bulunduğu şehir'}
              <select name="origin_city" required defaultValue="" className={input + ' mt-1 font-normal'}>
                <option value="" disabled>Seçin</option>
                {CITY_NAMES.map(n => <option key={n}>{n}</option>)}
              </select>
            </label>
            <label className="text-sm font-bold">{truck ? 'Kalkış ilçesi' : 'İlçe'}
              <input name="origin_district" maxLength={LIMITS.district} className={input + ' mt-1 font-normal'} />
            </label>
          </div>
          {truck && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-sm font-bold">Varış şehri
                <select name="dest_city" required defaultValue="" className={input + ' mt-1 font-normal'}>
                  <option value="" disabled>Seçin</option>
                  {CITY_NAMES.map(n => <option key={n}>{n}</option>)}
                </select>
              </label>
              <label className="text-sm font-bold">Varış ilçesi
                <input name="dest_district" maxLength={LIMITS.district} className={input + ' mt-1 font-normal'} />
              </label>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-bold">{truck ? 'Araç şu tarihe kadar müsait' : 'İlan şu tarihe kadar geçerli'}
              <input name="available_until" type="date" required min={today()} max={addDays(LIMITS.maxDays)} defaultValue={addDays(14)} className={input + ' mt-1 font-normal'} />
            </label>
            <label className="text-sm font-bold">İletişim telefonu
              <input name="contact_phone" type="tel" required minLength={7} maxLength={25} pattern="[0-9+\s\(\)\-]+" inputMode="tel" autoComplete="tel" className={input + ' mt-1 font-normal'} />
            </label>
          </div>
          <label className="text-sm font-bold">Açıklama <span className="font-normal text-slate-500">({description.length}/{LIMITS.description})</span>
            <textarea name="description" rows={3} maxLength={LIMITS.description} value={description} onChange={e => setDescription(e.target.value)} className={input + ' mt-1 font-normal'} />
          </label>
          <p className="text-xs text-slate-500">Telefon numaranız herkese açık listelenmez; yalnızca size talep gönderen üyelere gösterilir.</p>
          {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}
          <button disabled={busy} className={action}>{busy ? 'Yayınlanıyor…' : 'İlanı Yayınla'}</button>
        </form>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------- İlanlarım & gelen talepler
function MyPanel({ refreshKey }: { refreshKey: number }) {
  const [items, setItems] = useState<MyListing[] | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const mine = await fetchMyListings();
      setItems(mine);
      setInquiries(await fetchInquiriesFor(mine.map(m => m.id)));
      setError('');
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);
  useEffect(() => { void load(); }, [load, refreshKey]);

  async function sold(id: string) {
    try { await markListingSold(id); setConfirming(null); await load(); } catch (err) { setError((err as Error).message); }
  }
  const when = (iso: string) => new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Istanbul' });

  return (
    <section aria-label="İlanlarım ve gelen talepler" className="space-y-3 rounded-2xl border-2 border-navy-900 bg-white p-5">
      <h2 className="text-xl font-black">İlanlarım &amp; Gelen Talepler</h2>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-2 text-sm font-semibold text-red-700">{error}</p>}
      {items === null && !error && <p role="status">Yükleniyor…</p>}
      {items?.length === 0 && <p>Henüz ilanınız yok.</p>}
      {items?.map(l => {
        const mine = inquiries.filter(q => q.listing_id === l.id);
        return (
          <article key={l.id} className="space-y-2 rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-black">{l.title}</p>
                <p className="text-sm text-slate-600">{LISTING_TYPE_LABEL[l.listing_type]} · {formatPrice(l.price)} · {formatDate(l.available_until)} tarihine kadar</p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-bold ${l.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'}`}>
                {l.status === 'ACTIVE' ? 'Yayında' : 'Satıldı / Kapandı'}
              </span>
            </div>
            {l.status === 'ACTIVE' && (confirming === l.id ? (
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                İlan yayından kalkacak ve geri alınamaz.
                <button type="button" className="rounded-lg bg-navy-900 px-3 py-1.5 text-white" onClick={() => sold(l.id)}>Evet, kapat</button>
                <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5" onClick={() => setConfirming(null)}>Vazgeç</button>
              </p>
            ) : (
              <button type="button" className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-bold hover:bg-slate-50" onClick={() => setConfirming(l.id)}>
                Satıldı / Tamamlandı olarak işaretle
              </button>
            ))}
            <p className="text-sm font-bold">Gelen talepler ({mine.length})</p>
            {mine.length === 0 ? <p className="text-sm text-slate-500">Bu ilana henüz talep gelmedi.</p> : (
              <ul className="divide-y divide-slate-100">
                {mine.map(q => (
                  <li key={q.id} className="space-y-1 py-2 text-sm">
                    <p>{q.message}</p>
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                      <a className="inline-flex items-center gap-1 font-bold text-navy-900 underline" href={phoneHref(q.requester_phone)}><Phone className="h-3.5 w-3.5" aria-hidden /> {q.requester_phone}</a>
                      {q.offered_price !== null && <span>Teklif: <strong>{formatPrice(q.offered_price)}</strong></span>}
                      <span>{when(q.created_at)}</span>
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        );
      })}
    </section>
  );
}
