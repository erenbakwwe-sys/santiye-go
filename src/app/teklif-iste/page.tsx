'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Send,
  Building2,
  Calendar,
  MapPin,
  Wrench,
  Fuel,
  Truck,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Info,
  Clock,
  Layers,
  Calculator,
} from 'lucide-react';
import { CATEGORIES, CITIES, DISTRICTS } from '@/lib/mock-data';
import { createQuoteRequest } from '@/lib/services/quote-service';
import { getActiveProfile } from '@/lib/services/auth-service';
import { sortByTurkishName } from '@/lib/utils/city-sort';
import { serializeDraft, parseDraft } from '@/lib/utils/form-draft';

const DRAFT_KEY = 'santiyego_teklif_taslak';
const DRAFT_FIELDS = [
  'selectedMainCat', 'selectedSubCat', 'title', 'description', 'quantity', 'startDate', 'endDate',
  'cityId', 'districtId', 'addressDetail', 'searchRadiusKm', 'needOperator', 'needFuel', 'needTransport',
] as const;

const MAX_TITLE_LEN = 250; // quote_requests.title VARCHAR(250)
const MAX_DESC_LEN = 5000;
const MAX_QTY = 1_000_000; // quote_requests.quantity INT; makul üst sınır

function clampQty(n: number): number {
  if (!Number.isFinite(n)) return 1;
  return Math.min(Math.max(Math.floor(n), 1), MAX_QTY);
}

/** Hesaplayıcının gönderdiği kategori slug'ını (alt kategori) form kategorisine çevirir. */
function resolveCategoryBySlug(slug: string | null): { mainId: string; subId: string } | null {
  if (!slug) return null;
  for (const cat of CATEGORIES) {
    const sub = cat.subcategories?.find((sc) => sc.slug === slug);
    if (sub) return { mainId: cat.id, subId: sub.id };
  }
  return null;
}

const STEPS = ['Ne lazım?', 'Ayrıntılar', 'Nerede?', 'Fiyata neler dahil?'];

function MultiVendorQuoteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // ── Hesaplayıcıdan gelen parametreler (from_calc=1) ──────
  // searchParams.get() değeri zaten çözer; ikinci kez decodeURIComponent çağrılmaz
  // (kalan '%' karakterinde URIError fırlatıp sayfayı çökertirdi).
  const fromCalc = searchParams.get('from_calc') === '1';
  const calcTitle = fromCalc ? (searchParams.get('title') ?? '').slice(0, MAX_TITLE_LEN) : '';
  const calcDescription = fromCalc ? (searchParams.get('description') ?? '').slice(0, MAX_DESC_LEN) : '';
  const calcQty = fromCalc ? clampQty(parseInt(searchParams.get('qty') ?? '1', 10)) : 1;
  const calcCat = fromCalc ? resolveCategoryBySlug(searchParams.get('cat')) : null;

  const [selectedMainCat, setSelectedMainCat] = useState(calcCat?.mainId ?? CATEGORIES[0].id);
  const currentCategory = CATEGORIES.find((c) => c.id === selectedMainCat) || CATEGORIES[0];
  const [selectedSubCat, setSelectedSubCat] = useState(
    calcCat?.subId ?? currentCategory.subcategories?.[0]?.id ?? ''
  );

  const [title, setTitle] = useState(calcTitle || '');
  const [description, setDescription] = useState(calcDescription || '');
  const [quantity, setQuantity] = useState(calcQty || 1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [cityId, setCityId] = useState<number>(34); // İstanbul default
  const [districtId, setDistrictId] = useState<number>(104); // Tuzla default
  const [addressDetail, setAddressDetail] = useState('');
  const [searchRadiusKm, setSearchRadiusKm] = useState<number>(50);

  const [needOperator, setNeedOperator] = useState(false);
  const [needFuel, setNeedFuel] = useState(false);
  const [needTransport, setNeedTransport] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [draftRestored, setDraftRestored] = useState(false);
  const [loggedOut, setLoggedOut] = useState(false);

  // Giriş durumunu sayfa açılışında öğren (yalnız bilgi satırı için)
  useEffect(() => {
    let cancelled = false;
    getActiveProfile()
      .then((p) => {
        if (!cancelled && !p) setLoggedOut(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Girişten dönünce taslağı geri yükle (adres parametresinden gelen değerler öncelikli)
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = sessionStorage.getItem(DRAFT_KEY);
    } catch {}
    const d = parseDraft(raw, DRAFT_FIELDS);
    // parseDraft geçerli alan yoksa null verir; boş taslakta "geri yüklendi" satırı çıkmaz.
    if (!d || Object.keys(d).length === 0) return;
    const str = (k: string) => (typeof d[k] === 'string' ? (d[k] as string) : null);
    const bool = (k: string) => (typeof d[k] === 'boolean' ? (d[k] as boolean) : null);

    if (!calcCat) {
      const main = CATEGORIES.find((c) => c.id === str('selectedMainCat'));
      if (main) {
        setSelectedMainCat(main.id);
        const sub = main.subcategories?.find((sc) => sc.id === str('selectedSubCat'));
        if (sub) setSelectedSubCat(sub.id);
        else if (main.subcategories?.[0]) setSelectedSubCat(main.subcategories[0].id);
      }
    }
    if (!calcTitle && str('title') !== null) setTitle(str('title')!.slice(0, MAX_TITLE_LEN));
    if (!calcDescription && str('description') !== null) setDescription(str('description')!.slice(0, MAX_DESC_LEN));
    if (!fromCalc && typeof d.quantity === 'number') setQuantity(clampQty(d.quantity));
    if (str('startDate') !== null) setStartDate(str('startDate')!);
    if (str('endDate') !== null) setEndDate(str('endDate')!);
    const city = CITIES.find((c) => c.id === Number(d.cityId));
    if (city) {
      setCityId(city.id);
      const dist = DISTRICTS.find((x) => x.id === Number(d.districtId) && x.city_id === city.id);
      if (dist) setDistrictId(dist.id);
      else {
        const first = DISTRICTS.find((x) => x.city_id === city.id);
        if (first) setDistrictId(first.id);
      }
    }
    if (str('addressDetail') !== null) setAddressDetail(str('addressDetail')!);
    if (typeof d.searchRadiusKm === 'number' && [5, 10, 25, 50, 100, 500].includes(d.searchRadiusKm)) {
      setSearchRadiusKm(d.searchRadiusKm);
    }
    if (bool('needOperator') !== null) setNeedOperator(bool('needOperator')!);
    if (bool('needFuel') !== null) setNeedFuel(bool('needFuel')!);
    if (bool('needTransport') !== null) setNeedTransport(bool('needTransport')!);
    setDraftRestored(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const availableDistricts = sortByTurkishName(DISTRICTS.filter((d) => d.city_id === Number(cityId)));

  const handleCityChange = (newCityId: number) => {
    setCityId(newCityId);
    const firstDistrict = DISTRICTS.find((d) => d.city_id === newCityId);
    if (firstDistrict) {
      setDistrictId(firstDistrict.id);
    }
  };

  const handleMainCatChange = (catId: string) => {
    setSelectedMainCat(catId);
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (cat?.subcategories?.[0]) {
      setSelectedSubCat(cat.subcategories[0].id);
    }
  };

  const [step, setStep] = useState(0);

  const validateStep = (i: number): string => {
    if (i === 1) {
      if (!title.trim()) return 'Lütfen neye ihtiyacınız olduğunu kısaca yazın (başlık).';
      if (!description.trim()) return 'Lütfen işi birkaç cümleyle anlatın (açıklama).';
      if (title.trim().length > MAX_TITLE_LEN) return `Başlık en fazla ${MAX_TITLE_LEN} karakter olabilir.`;
      if (description.trim().length > MAX_DESC_LEN) return `Açıklama en fazla ${MAX_DESC_LEN} karakter olabilir.`;
    }
    return '';
  };

  const scrollToForm = () => {
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setErrorMessage(err);
      return;
    }
    setErrorMessage('');
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
    scrollToForm();
  };

  const goBack = () => {
    setErrorMessage('');
    setStep((s) => Math.max(s - 1, 0));
    scrollToForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Enter tuşu son adımdan önce formu göndermesin; bir sonraki adıma geçsin.
    if (step < STEPS.length - 1) {
      goNext();
      return;
    }
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Lütfen talep başlığı ve açıklama alanlarını doldurun.');
      setStep(1);
      return;
    }
    if (title.trim().length > MAX_TITLE_LEN) {
      setErrorMessage(`Talep başlığı en fazla ${MAX_TITLE_LEN} karakter olabilir.`);
      return;
    }
    if (description.trim().length > MAX_DESC_LEN) {
      setErrorMessage(`İş açıklaması en fazla ${MAX_DESC_LEN} karakter olabilir.`);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const profile = await getActiveProfile();
    if (!profile) {
      setErrorMessage('Teklif talebi oluşturabilmek için lütfen giriş yapınız.');
      setLoading(false);
      // Yazılanlar girişten sonra korunsun (yalnız form alanları, sekme kapanınca silinir)
      try {
        sessionStorage.setItem(
          DRAFT_KEY,
          serializeDraft({
            selectedMainCat, selectedSubCat, title, description, quantity, startDate, endDate,
            cityId, districtId, addressDetail, searchRadiusKm, needOperator, needFuel, needTransport,
          }),
        );
      } catch {}
      // Hesaplayıcıdan gelen parametreler giriş sonrası kaybolmasın
      const qs = searchParams.toString();
      router.push(`/giris?redirect=${encodeURIComponent(qs ? `/teklif-iste?${qs}` : '/teklif-iste')}`);
      return;
    }

    const targetCity = CITIES.find((c) => c.id === Number(cityId));
    const targetDistrict = DISTRICTS.find((d) => d.id === Number(districtId));

    const res = await createQuoteRequest({
      buyer_id: profile.id,
      request_type: 'multi_vendor',
      listing_id: null,
      category_id: selectedSubCat || selectedMainCat,
      title: title.trim(),
      description: description.trim(),
      quantity: clampQty(Number(quantity)),
      start_date: startDate || new Date().toISOString().split('T')[0],
      end_date: endDate || null,
      city_id: Number(cityId),
      district_id: Number(districtId),
      address_detail: addressDetail.trim() || `${targetDistrict?.name || ''}, ${targetCity?.name || ''}`,
      lat: targetDistrict?.lat || targetCity?.lat || 41.0,
      lng: targetDistrict?.lng || targetCity?.lng || 29.0,
      need_operator: needOperator,
      need_fuel: needFuel,
      need_transport: needTransport,
      search_radius_km: Number(searchRadiusKm),
      max_recipients: 10,
    });

    setLoading(false);

    if (res.success) {
      try {
        sessionStorage.removeItem(DRAFT_KEY);
      } catch {}
      setSuccess(true);
      setTimeout(() => {
        router.push('/alici-paneli/taleplerim');
      }, 2000);
    } else {
      setErrorMessage(res.error || 'Teklif talebi gönderilemedi.');
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen py-8 sm:py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/ilanlar"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            İlan aramaya dön
          </Link>
        </div>

        {/* Hesaplayıcıdan Geldi Bildirimi */}
        <Link href="/kesif-yukle" className="mb-6 block rounded-2xl border border-orange-300 bg-orange-50 p-4 text-sm font-bold text-navy-900 hover:border-orange-500">
          Elinizde 10’dan fazla kalemlik Excel veya malzeme listesi mi var? Tek tek yazmayın; listenizi yükleyin, biz firmalara dağıtalım. →
        </Link>
        {fromCalc && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-300 rounded-2xl flex items-start gap-3">
            <Calculator className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-navy-900">
                Metraj hesaplayıcıdan otomatik dolduruldu
              </p>
              <p className="text-xs text-slate-600 mt-0.5">
                Başlık, açıklama ve miktar alanları hesaplama sonucunuzdan aktarıldı.
                Konumunuzu belirleyip doğrudan gönderebilirsiniz.
              </p>
            </div>
          </div>
        )}

        {draftRestored && (
          <div role="status" className="mb-6 p-4 bg-orange-50 border border-orange-300 rounded-2xl flex items-start gap-3 text-sm font-bold text-navy-900">
            <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <span>Yazdıklarınız geri yüklendi.</span>
          </div>
        )}
        {loggedOut && (
          <div className="mb-6 p-4 bg-orange-50 border border-orange-300 rounded-2xl flex items-start gap-3 text-sm font-bold text-navy-900">
            <Info className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
            <span>Talep göndermek için giriş yapmanız gerekir. Formu doldurabilirsiniz; yazdıklarınız girişten sonra korunur.</span>
          </div>
        )}

        {/* Header Hero Banner */}
        <div className="bg-navy-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              İhtiyacınızı bir kez yazın, bölgenizdeki firmalardan teklif alın
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              İş makinesi, yapı malzemesi veya nakliye ihtiyacınızı belirtin. Talebiniz seçtiğiniz
              yarıçaptaki en fazla 10 firmaya iletilir. Gelen teklifleri
              karşılaştırıp size uygun olanı seçin.
            </p>
            <Link href="/operatorler" className="mt-3 inline-block font-bold text-orange-400 hover:underline">Makineniz için operatör bulun →</Link>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="p-6 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-2xl mb-8 shadow-sm flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">Teklif talebiniz başarıyla oluşturuldu!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Talebiniz bölgenizdeki tedarikçilere iletildi. Firmaların yanıtlarını
                karşılaştırmak üzere Tekliflerim sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white rounded-md border border-slate-200 p-5 sm:p-8 space-y-6">
          {/* Adım göstergesi */}
          <div>
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-base font-semibold text-navy-900">
                Adım {step + 1} / {STEPS.length}: {STEPS[step]}
              </span>
            </div>
            <ol className="mt-3 grid grid-cols-4 gap-1.5" aria-label="Adımlar">
              {STEPS.map((label, i) => (
                <li key={label}>
                  <span
                    className={`block h-2 rounded-full ${i <= step ? 'bg-orange-500' : 'bg-slate-200'}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`hidden sm:block mt-1.5 text-sm ${i === step ? 'text-navy-900 font-medium' : 'text-slate-500'}`}
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ol>
          </div>

          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Kategori Seçimi */}
          {step === 0 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-500" />
                Neye ihtiyacınız var?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Aşağıdan size uyan türü seçin. Talebiniz bu alanda çalışan firmalara gider.
              </p>
            </div>

            {/* Main Categories Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => handleMainCatChange(cat.id)}
                  className={`p-4 rounded-xl border text-left font-bold transition flex items-center justify-between ${
                    selectedMainCat === cat.id
                      ? 'border-orange-500 bg-orange-50/50 text-navy-900 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-white'
                  }`}
                >
                  <span className="text-sm">{cat.name}</span>
                  {selectedMainCat === cat.id && (
                    <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Subcategories Dropdown */}
            {currentCategory.subcategories && (
              <div>
                <label htmlFor="teklif-alt-kategori" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alt kategori / makine / hizmet türü *
                </label>
                <select
                  id="teklif-alt-kategori"
                  value={selectedSubCat}
                  onChange={(e) => setSelectedSubCat(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-slate-50"
                  required
                >
                  {currentCategory.subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          )}

          {/* 2. Talep Detayları */}
          {step === 1 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-500" />
                İhtiyacınızı anlatın
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ne kadar, ne zaman lazım? Firmalar doğru fiyat verebilsin diye birkaç cümleyle anlatın.
              </p>
            </div>

            <div>
              <label htmlFor="teklif-baslik" className="block text-xs font-bold text-slate-700 mb-1.5">
                Talep başlığı * (Örn: 30 Günlük 22 Ton Ekskavatör Kiralama)
              </label>
              <input
                id="teklif-baslik"
                type="text"
                value={title}
                maxLength={MAX_TITLE_LEN}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="İhtiyacınızı özetleyen net bir başlık yazın"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="teklif-miktar" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Adet / miktar / tonaj
                </label>
                <input
                  id="teklif-miktar"
                  type="number"
                  min="1"
                  max={MAX_QTY}
                  value={quantity}
                  onChange={(e) => setQuantity(clampQty(parseInt(e.target.value, 10)))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="teklif-baslangic" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Başlangıç / ihtiyaç tarihi *
                </label>
                <input
                  id="teklif-baslangic"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="teklif-bitis" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bitiş tarihi (opsiyonel)
                </label>
                <input
                  id="teklif-bitis"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="teklif-aciklama" className="block text-xs font-bold text-slate-700 mb-1.5">
                İş açıklaması ve özel şartlar *
              </label>
              <textarea
                id="teklif-aciklama"
                rows={4}
                value={description}
                maxLength={MAX_DESC_LEN}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Zemin yapısı, çalışma koşulları, varsa şantiye kural ve gereksinimlerinizi detaylandırın..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>
          )}

          {/* 3. Konum ve Dağıtım Yarıçapı */}
          {step === 2 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                İş nerede yapılacak?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Şantiyenizin il ve ilçesini seçin. Talebiniz bu bölgedeki firmalara iletilir.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="teklif-il" className="block text-xs font-bold text-slate-700 mb-1.5">İl *</label>
                <select
                  id="teklif-il"
                  value={cityId}
                  onChange={(e) => handleCityChange(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {sortByTurkishName(CITIES).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="teklif-ilce" className="block text-xs font-bold text-slate-700 mb-1.5">İlçe *</label>
                <select
                  id="teklif-ilce"
                  value={districtId}
                  onChange={(e) => setDistrictId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {availableDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="teklif-yaricap" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Firma arama yarıçapı
                </label>
                <select
                  id="teklif-yaricap"
                  value={searchRadiusKm}
                  onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50 font-bold text-orange-900"
                >
                  <option value={5}>5 km (en yakın)</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km (önerilen)</option>
                  <option value={100}>100 km (bölgesel)</option>
                  <option value={500}>Tüm bölge (500 km)</option>
                </select>
              </div>
            </div>

            <div>
              <label htmlFor="teklif-adres" className="block text-xs font-bold text-slate-700 mb-1.5">
                Şantiye / teslimat adres detayı
              </label>
              <input
                id="teklif-adres"
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Örn: Organize Sanayi Bölgesi 4. Cadde No: 12"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          )}

          {/* 4. Fiyata Dahil Edilmesi İstenen Hizmetler */}
          {step === 3 && (
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                Fiyata neler dahil olsun?
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                İstediklerinizi işaretleyin. Emin değilseniz boş bırakabilirsiniz; firmalar tekliflerinde belirtir.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={needOperator}
                  onChange={(e) => setNeedOperator(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-xs font-bold text-slate-800">Operatör dahil olsun</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={needFuel}
                  onChange={(e) => setNeedFuel(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-xs font-bold text-slate-800">Mazot / yakıt dahil olsun</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={needTransport}
                  onChange={(e) => setNeedTransport(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-xs font-bold text-slate-800">Şantiye nakliyesi dahil</span>
              </label>
            </div>
          </div>
          )}

          {/* Adım düğmeleri */}
          <div className="pt-5 border-t border-slate-200 space-y-4">
            {step === STEPS.length - 1 && (
              <div className="flex items-start gap-2 text-sm text-slate-600">
                <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <span>
                  Talebiniz bölgenizdeki en fazla 10 uygun firmaya iletilir. Teklif istemek ücretsizdir ve sizi
                  hiçbir firmayla anlaşmaya zorlamaz.
                </span>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-between">
              {step > 0 ? (
                <button type="button" onClick={goBack} className="btn-secondary">
                  <ArrowLeft className="w-5 h-5" />
                  Geri
                </button>
              ) : (
                <span />
              )}
              {step < STEPS.length - 1 ? (
                <button type="button" onClick={goNext} className="btn-primary sm:min-w-[200px]">
                  İleri: {STEPS[step + 1]}
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button type="submit" disabled={loading || success} className="btn-primary sm:min-w-[240px] disabled:opacity-50">
                  <Send className="w-5 h-5" />
                  {loading ? 'Gönderiliyor...' : 'Teklif talebimi gönder'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function MultiVendorQuotePage() {
  return (
    <Suspense fallback={<div className="bg-slate-50 min-h-screen py-12 flex items-center justify-center"><div className="text-slate-400 text-sm">Yükleniyor…</div></div>}>
      <MultiVendorQuoteForm />
    </Suspense>
  );
}
