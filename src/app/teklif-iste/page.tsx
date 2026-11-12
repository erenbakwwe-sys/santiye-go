'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
  Info,
  Clock,
  Layers,
} from 'lucide-react';
import { CATEGORIES, CITIES, DISTRICTS } from '@/lib/mock-data';
import { createQuoteRequest } from '@/lib/services/quote-service';
import { getActiveProfile } from '@/lib/services/auth-service';

export default function MultiVendorQuotePage() {
  const router = useRouter();

  const [selectedMainCat, setSelectedMainCat] = useState(CATEGORIES[0].id);
  const currentCategory = CATEGORIES.find((c) => c.id === selectedMainCat) || CATEGORIES[0];
  const [selectedSubCat, setSelectedSubCat] = useState(currentCategory.subcategories?.[0]?.id || '');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
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

  const availableDistricts = DISTRICTS.filter((d) => d.city_id === Number(cityId));

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      setErrorMessage('Lütfen talep başlığı ve açıklama alanlarını doldurun.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const profile = await getActiveProfile();
    if (!profile) {
      setErrorMessage('Teklif talebi oluşturabilmek için lütfen giriş yapınız.');
      setLoading(false);
      router.push('/giris?redirect=/teklif-iste');
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
      quantity: Number(quantity) || 1,
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
            İlan Aramaya Dön
          </Link>
        </div>

        {/* Header Hero Banner */}
        <div className="bg-navy-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl mb-8 relative overflow-hidden">
          <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 rounded-full bg-orange-500 text-white text-[11px] font-black uppercase tracking-wider inline-block mb-3">
              Çoklu Firma Teklif Dağıtımı
            </span>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight leading-snug">
              İhtiyacınızı Bir Kez Yazın, Bölgenizdeki En İyi Firmalardan Teklif Alın!
            </h1>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              İş makinesi, yapı malzemesi veya nakliye ihtiyacınızı belirtin. Sistem seçtiğiniz
              yarıçaptaki en fazla 10 onaylı firmaya talebinizi otomatik iletsin. Gelen teklifleri
              karşılaştırıp en uygun olanı seçin.
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {success && (
          <div className="p-6 bg-emerald-50 border-2 border-emerald-500 text-emerald-900 rounded-2xl mb-8 shadow-sm flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">Teklif Talebiniz Başarıyla Oluşturuldu!</h3>
              <p className="text-xs text-emerald-700 mt-1">
                Talebiniz bölgenizdeki uygun tedarikçilere iletildi. Firmaların yanıtlarını
                karşılaştırmak üzere Tekliflerim sayfasına yönlendiriliyorsunuz...
              </p>
            </div>
          </div>
        )}

        {/* Form Container */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-8">
          {errorMessage && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Kategori Seçimi */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-orange-500" />
                1. Kategori & Alt Kategori Seçimi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Talebinizin hangi alandaki uzman firmalara ulaştırılacağını belirleyin.
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Alt Kategori / Makine / Hizmet Türü *
                </label>
                <select
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

          {/* 2. Talep Detayları */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-orange-500" />
                2. İhtiyaç ve Şantiye Detayları
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Firmaların size en doğru fiyatı verebilmesi için detayları belirtin.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Talep Başlığı * (Örn: 30 Günlük 22 Ton Ekskavatör Kiralama)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="İhtiyacınızı özetleyen net bir başlık yazın"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Adet / Miktar / Tonaj
                </label>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Başlangıç / İhtiyaç Tarihi *
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Bitiş Tarihi (Opsiyonel)
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                İş Açıklaması ve Özel Şartlar *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Zemin yapısı, çalışma koşulları, varsa şantiye kural ve gereksinimlerinizi detaylandırın..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                required
              />
            </div>
          </div>

          {/* 3. Konum ve Dağıtım Yarıçapı */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-orange-500" />
                3. Şantiye Konumu ve Firma Dağıtım Yarıçapı
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                PostGIS mesafe motorumuz belirlediğiniz yarıçaptaki en yakın onaylı tedarikçileri filtreler.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">İl *</label>
                <select
                  value={cityId}
                  onChange={(e) => handleCityChange(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">İlçe *</label>
                <select
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
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Firma Arama Yarıçapı
                </label>
                <select
                  value={searchRadiusKm}
                  onChange={(e) => setSearchRadiusKm(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 bg-orange-50 font-bold text-orange-900"
                >
                  <option value={5}>5 km (En Yakın)</option>
                  <option value={10}>10 km</option>
                  <option value={25}>25 km</option>
                  <option value={50}>50 km (Önerilen)</option>
                  <option value={100}>100 km (Bölgesel)</option>
                  <option value={500}>Tüm Bölge (500 km)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Şantiye / Teslimat Adres Detayı
              </label>
              <input
                type="text"
                value={addressDetail}
                onChange={(e) => setAddressDetail(e.target.value)}
                placeholder="Örn: Organize Sanayi Bölgesi 4. Cadde No: 12"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>

          {/* 4. Fiyata Dahil Edilmesi İstenen Hizmetler */}
          <div className="space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-extrabold text-navy-900 flex items-center gap-2">
                <Wrench className="w-5 h-5 text-orange-500" />
                4. Teklif Kapsamına Dahil Olacak Hizmetler
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Firmalardan fiyat alırken fiyata dahil olmasını istediğiniz kalemleri işaretleyin.
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
                <span className="text-xs font-bold text-slate-800">Operatör Dahil Olsun</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={needFuel}
                  onChange={(e) => setNeedFuel(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-xs font-bold text-slate-800">Mazot / Yakıt Dahil Olsun</span>
              </label>

              <label className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition">
                <input
                  type="checkbox"
                  checked={needTransport}
                  onChange={(e) => setNeedTransport(e.target.checked)}
                  className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                />
                <span className="text-xs font-bold text-slate-800">Şantiye Nakliyesi Dahil</span>
              </label>
            </div>
          </div>

          {/* Submit Actions */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Info className="w-4 h-4 text-slate-400 shrink-0" />
              <span>
                Teklif talebiniz spam koruması kapsamında filtrelenir ve en fazla 10 firmaya iletilir.
              </span>
            </div>

            <button
              type="submit"
              disabled={loading || success}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm tracking-wide shadow-lg shadow-orange-500/30 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Teklif Talebi Dağıtılıyor...' : 'TEKLİF TALEBİNİ GÖNDER'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
