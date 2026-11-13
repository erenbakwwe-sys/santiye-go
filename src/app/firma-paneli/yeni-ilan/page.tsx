'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  PlusCircle,
  Building2,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Wrench,
  Fuel,
  Truck,
  Image as ImageIcon,
  ShieldAlert,
  MapPin,
  Layers,
  FileCheck2,
  Briefcase,
  Users,
} from 'lucide-react';
import { CATEGORIES, CITIES, DISTRICTS } from '@/lib/mock-data';
import LocationPicker from '@/components/map/LocationPicker';
import { ListingStatus, ListingType, CategoryAttribute } from '@/types/database';
import { getCategoryAttributes } from '@/lib/services/attribute-service';
import { uploadListingPhoto, deleteListingPhoto } from '@/lib/services/storage-service';
import { createClient } from '@/lib/supabase/client';
import { sanitizeContent } from '@/lib/security/contact-masker';
import { getActiveProfile } from '@/lib/services/auth-service';

export default function NewListingPage() {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [listingType, setListingType] = useState<ListingType>('rental');

  // Dynamic Category Attributes
  const [categoryAttributes, setCategoryAttributes] = useState<CategoryAttribute[]>([]);
  const [dynamicSpecs, setDynamicSpecs] = useState<Record<string, any>>({});

  // Pricing
  const [pricingType, setPricingType] = useState<'fixed' | 'custom_quote' | 'unit_rate'>('fixed');
  const [priceDaily, setPriceDaily] = useState('');
  const [priceWeekly, setPriceWeekly] = useState('');
  const [priceMonthly, setPriceMonthly] = useState('');
  const [priceSale, setPriceSale] = useState('');
  const [priceUnitRate, setPriceUnitRate] = useState('');
  const [priceUnit, setPriceUnit] = useState('m² başına');

  // Material Specifics
  const [minOrderQty, setMinOrderQty] = useState('');
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);
  const [deliveryMaxDistance, setDeliveryMaxDistance] = useState('');

  // Service Specifics
  const [serviceAreaType, setServiceAreaType] = useState<'radius' | 'cities'>('radius');
  const [serviceRadiusKm, setServiceRadiusKm] = useState('100');
  const [serviceCityIds, setServiceCityIds] = useState<number[]>([34, 41]);
  const [scopeDescription, setScopeDescription] = useState('');
  const [teamSize, setTeamSize] = useState('8');
  const [experienceYears, setExperienceYears] = useState('10');
  const [hasLicenseDoc, setHasLicenseDoc] = useState(false);

  // Inclusions
  const [isOperatorIncluded, setIsOperatorIncluded] = useState(false);
  const [isFuelIncluded, setIsFuelIncluded] = useState(false);
  const [isTransportIncluded, setIsTransportIncluded] = useState(false);

  // Status
  const [status, setStatus] = useState<ListingStatus>('active');

  // Location
  const [cityId, setCityId] = useState('34'); // Default Istanbul
  const [districtId, setDistrictId] = useState('104'); // Default Tuzla
  const [addressDetail, setAddressDetail] = useState('');
  const [coords, setCoords] = useState<{ lat: number; lng: number }>({
    lat: 40.8167,
    lng: 29.3014,
  });

  // Images
  const [images, setImages] = useState<string[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState('');

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  // Determine current category object
  const currentCategory = CATEGORIES.find(
    (c) => c.id === categoryId || c.subcategories?.some((s) => s.id === categoryId)
  );

  // Allowed listing types for current category
  const allowedTypes: ListingType[] = currentCategory?.allowed_listing_types || ['rental', 'sale', 'service'];

  // Handle Category Change & Load Dynamic Attributes
  const handleCategoryChange = async (catId: string) => {
    setCategoryId(catId);
    const cat = CATEGORIES.find((c) => c.id === catId || c.subcategories?.some((s) => s.id === catId));
    if (cat) {
      if (cat.slug === 'insaat-hizmetleri') {
        setListingType('service');
        setPricingType('custom_quote');
      } else if (cat.slug === 'yapi-malzemeleri') {
        setListingType('sale');
        setPricingType('fixed');
      }

      const attrs = await getCategoryAttributes(cat.slug);
      setCategoryAttributes(attrs);
      // Pre-fill initial dynamic specs
      const initial: Record<string, any> = {};
      attrs.forEach((a) => {
        initial[a.slug] = a.attribute_type === 'boolean' ? false : a.options ? a.options[0] : '';
      });
      setDynamicSpecs(initial);
    }
  };

  const handleCityChange = (newCityId: string) => {
    setCityId(newCityId);
    const firstDistrict = DISTRICTS.find((d) => d.city_id === Number(newCityId));
    if (firstDistrict) {
      setDistrictId(String(firstDistrict.id));
      setCoords({ lat: firstDistrict.lat, lng: firstDistrict.lng });
    } else {
      const cityObj = CITIES.find((c) => c.id === Number(newCityId));
      if (cityObj) {
        setCoords({ lat: cityObj.lat, lng: cityObj.lng });
      }
    }
  };

  const handleDistrictChange = (newDistId: string) => {
    setDistrictId(newDistId);
    const distObj = DISTRICTS.find((d) => d.id === Number(newDistId));
    if (distObj) {
      setCoords({ lat: distObj.lat, lng: distObj.lng });
    }
  };

  // Gerçek Dosya Yükleme (Supabase Storage)
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (images.length + files.length > 10) {
      setImageError('En fazla 10 adet fotoğraf yükleyebilirsiniz.');
      return;
    }

    setUploadingImage(true);

    try {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const res = await uploadListingPhoto(file);
        if (!res.success) {
          throw new Error(res.error || `${file.name} yüklenemedi.`);
        }
        if (res.url) {
          newUrls.push(res.url);
        }
      }
      setImages((prev) => [...prev, ...newUrls]);
    } catch (err: any) {
      setImageError(err.message || 'Görsel yüklenirken bir hata oluştu.');
    } finally {
      setUploadingImage(false);
      e.target.value = '';
    }
  };

  const handleRemoveImage = async (index: number) => {
    const targetUrl = images[index];
    await deleteListingPhoto(targetUrl);
    setImages(images.filter((_, i) => i !== index));
  };

  const handleDynamicSpecChange = (slug: string, value: any) => {
    setDynamicSpecs((prev) => ({ ...prev, [slug]: value }));
  };

  const isSafetyWarningCategory =
    currentCategory?.slug === 'iskele-kalip' ||
    currentCategory?.slug === 'asansor-platform' ||
    currentCategory?.slug === 'is-makineleri';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setImageError('');

    if (!title.trim() || !categoryId) {
      alert('Lütfen zorunlu alanları (Başlık ve Kategori) doldurunuz.');
      return;
    }

    if (images.length === 0) {
      setImageError('İlan verebilmek için en az 1 adet fotoğraf yüklemeniz zorunludur.');
      alert('Lütfen en az 1 adet ilan fotoğrafı yükleyiniz.');
      const photoSection = document.getElementById('photo-upload-section');
      if (photoSection) {
        photoSection.scrollIntoView({ behavior: 'smooth' });
      }
      return;
    }

    setLoading(true);

    try {
      const profile = await getActiveProfile();
      if (!profile) {
        alert('İlan oluşturabilmek için lütfen giriş yapınız.');
        router.push('/giris?redirect=/firma-paneli/yeni-ilan');
        return;
      }

      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      let companyId = 'f0000000-0000-0000-0000-000000000001';

      if (isSupabaseConfigured) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: company } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (company) {
            companyId = company.id;
          } else {
            // Firma tablosunda kaydı yoksa otomatik oluştur
            const { data: newComp } = await supabase
              .from('companies')
              .insert({
                user_id: user.id,
                name: user.user_metadata?.company_name || profile.full_name || 'Firma Hesabı',
                phone: profile.phone || user.user_metadata?.phone || '',
                city_id: cityId ? Number(cityId) : 34,
                district_id: districtId ? Number(districtId) : 104,
                is_verified: false,
                is_demo: false,
              })
              .select('id')
              .maybeSingle();

            if (newComp?.id) {
              companyId = newComp.id;
            }
          }
        }
      }

      // Slug üretimi
      const baseSlug = title
        .toLowerCase()
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ı/g, 'i')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const uniqueSlug = `${baseSlug || 'ilan'}-${Date.now().toString(36)}`;

      const sanitizedTitle = sanitizeContent(title.trim()).maskedText;
      const sanitizedDesc = sanitizeContent(description.trim()).maskedText;

      const techSpecs = {
        ...dynamicSpecs,
        pricing_type: pricingType,
        unit_price_rate: priceUnitRate ? Number(priceUnitRate) : null,
        unit_price_unit: priceUnit || null,
        min_order_quantity: minOrderQty ? Number(minOrderQty) : null,
        service_area_type: serviceAreaType,
        service_radius_km: serviceRadiusKm ? Number(serviceRadiusKm) : 100,
      };

      const finalImages = images;

      const effectiveCityId = cityId ? Number(cityId) : 34;
      const effectiveDistrictId = districtId ? Number(districtId) : 104;
      const safeLng = coords.lng || 29.0;
      const safeLat = coords.lat || 41.0;

      const listingData = {
        company_id: companyId,
        category_id: categoryId,
        title: sanitizedTitle,
        slug: uniqueSlug,
        description: sanitizedDesc,
        listing_type: listingType,
        price_daily: priceDaily ? Number(priceDaily) : null,
        price_weekly: priceWeekly ? Number(priceWeekly) : null,
        price_monthly: priceMonthly ? Number(priceMonthly) : null,
        price_sale: priceSale ? Number(priceSale) : null,
        currency: 'TRY',
        is_operator_included: isOperatorIncluded,
        is_fuel_included: isFuelIncluded,
        is_transport_included: isTransportIncluded,
        status: status,
        city_id: effectiveCityId,
        district_id: effectiveDistrictId,
        address_detail: addressDetail || null,
        location: `SRID=4326;POINT(${safeLng} ${safeLat})`,
        technical_specs: techSpecs,
        images: finalImages,
        is_demo: false,
      };

      // Canlı Supabase'e ekle
      if (isSupabaseConfigured) {
        const { error: insertError } = await supabase.from('listings').insert(listingData);
        if (insertError) {
          console.error('[yeni-ilan] Supabase insert error:', insertError.message);
          throw new Error('İlan veritabanına kaydedilemedi: ' + insertError.message);
        }
      }

      // Eski yerel demo artıklarını temizle
      try {
        localStorage.removeItem('santiyego_my_listings');
      } catch {}

      setSuccess(true);
      setTimeout(() => {
        router.push('/firma-paneli');
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'İlan kaydedilemedi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link
          href="/firma-paneli"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Firma Paneline Dön
        </Link>
        <span className="text-xs font-semibold text-slate-400">Yeni İlan Girişi (7 Ana Kategori)</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
            Yeni İlan Oluştur
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            İş makinesi, iskele, asansör/platform, şantiye ekipmanı, yapı malzemesi veya inşaat hizmeti ilanı yayınlayın.
          </p>
        </div>

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>İlanınız başarıyla kaydedildi! Firma paneline yönlendiriliyorsunuz...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Kategori ve Tür */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-navy-900 border-b border-slate-100 pb-2">
              1. Kategori ve İlan Türü
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kategori Seçimi *
                </label>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:border-orange-500 focus:outline-none"
                >
                  <option value="">Kategori Seçiniz</option>
                  {CATEGORIES.map((cat) => (
                    <optgroup key={cat.id} label={cat.name}>
                      {cat.subcategories?.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {cat.name} &gt; {sub.name}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  İlan Türü *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    disabled={!allowedTypes.includes('rental')}
                    onClick={() => {
                      setListingType('rental');
                      setPricingType('fixed');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-extrabold border transition ${
                      listingType === 'rental'
                        ? 'bg-navy-900 text-white border-navy-900'
                        : 'bg-slate-50 text-slate-700 border-slate-300 disabled:opacity-30'
                    }`}
                  >
                    Kiralık
                  </button>
                  <button
                    type="button"
                    disabled={!allowedTypes.includes('sale')}
                    onClick={() => {
                      setListingType('sale');
                      setPricingType('fixed');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-extrabold border transition ${
                      listingType === 'sale'
                        ? 'bg-emerald-700 text-white border-emerald-700'
                        : 'bg-slate-50 text-slate-700 border-slate-300 disabled:opacity-30'
                    }`}
                  >
                    Satılık
                  </button>
                  <button
                    type="button"
                    disabled={!allowedTypes.includes('service')}
                    onClick={() => {
                      setListingType('service');
                      setPricingType('custom_quote');
                    }}
                    className={`py-2.5 rounded-xl text-xs font-extrabold border transition ${
                      listingType === 'service'
                        ? 'bg-orange-600 text-white border-orange-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300 disabled:opacity-30'
                    }`}
                  >
                    Hizmet
                  </button>
                </div>
              </div>
            </div>

            {/* Safety & Legal Disclaimer for Scaffolding & Lifting */}
            {isSafetyWarningCategory && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 shadow-sm">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <strong>Önemli Güvenlik ve Mevzuat Uyarısı:</strong>
                  <p className="text-slate-600">
                    Bu ekipmanların kurulum, kullanım ve periyodik kontrolleri ilgili iş sağlığı ve güvenliği mevzuatına uygun olarak yapılmalıdır. Platform ekipmanların saha uygunluğunu ve periyodik kontrol raporunun hukuki geçerliliğini garanti etmez.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Başlık ve Açıklama */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-navy-900 border-b border-slate-100 pb-2">
              2. İlan Detayları
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                İlan Başlığı *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Örn: 24m Eklemli Dizel Manlift Platform veya 1.000 m² Flanşlı Cephe İskelesi"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                İlan Açıklaması *
              </label>
              <textarea
                required
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ekipmanın teknik durumu, şantiye teslimat koşulları, operatör yeterlilikleri ve kurulum detaylarını belirtiniz..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Dinamik Kategori Özellikleri */}
          {categoryAttributes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-extrabold text-navy-900 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-orange-500" />
                  3. Kategoriye Özel Teknik Özellikler
                </h3>
                <span className="text-[11px] text-slate-400">Dinamik Alanlar</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {categoryAttributes.map((attr) => (
                  <div key={attr.id} className="space-y-1">
                    <label className="block text-xs font-bold text-slate-700">
                      {attr.name} {attr.unit ? `(${attr.unit})` : ''} {attr.is_required && '*'}
                    </label>

                    {attr.attribute_type === 'select' && attr.options ? (
                      <select
                        value={dynamicSpecs[attr.slug] || ''}
                        onChange={(e) => handleDynamicSpecChange(attr.slug, e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-orange-500 focus:outline-none"
                      >
                        {attr.options.map((opt, i) => (
                          <option key={i} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : attr.attribute_type === 'boolean' ? (
                      <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!dynamicSpecs[attr.slug]}
                          onChange={(e) => handleDynamicSpecChange(attr.slug, e.target.checked)}
                          className="accent-orange-500 w-4 h-4"
                        />
                        <span className="text-xs font-bold text-navy-900">Evet, Mevcut</span>
                      </label>
                    ) : (
                      <input
                        type={attr.attribute_type === 'number' ? 'number' : 'text'}
                        value={dynamicSpecs[attr.slug] || ''}
                        onChange={(e) => handleDynamicSpecChange(attr.slug, e.target.value)}
                        placeholder={`Örn: ${attr.name}`}
                        className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:border-orange-500 focus:outline-none"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 4: Fiyatlandırma & Hizmet Seçenekleri */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-navy-900 border-b border-slate-100 pb-2">
              4. Fiyatlandırma ve Koşullar
            </h3>

            {listingType === 'service' ? (
              /* Service Pricing Model */
              <div className="space-y-4 p-4 rounded-xl bg-orange-50/40 border border-orange-200">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-900 block">Fiyat Modeli</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPricingType('custom_quote')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition ${
                        pricingType === 'custom_quote'
                          ? 'border-orange-500 bg-white ring-2 ring-orange-500/20 text-orange-600'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div className="font-extrabold">Teklife Göre (Önerilen)</div>
                      <span className="text-[11px] font-normal text-slate-500 block mt-0.5">
                        Şantiye keşfi ve metraja göre özel teklif verilir.
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPricingType('unit_rate')}
                      className={`p-3 rounded-xl border text-left text-xs font-bold transition ${
                        pricingType === 'unit_rate'
                          ? 'border-orange-500 bg-white ring-2 ring-orange-500/20 text-orange-600'
                          : 'border-slate-200 bg-white text-slate-700'
                      }`}
                    >
                      <div className="font-extrabold">Birim / Başlangıç Fiyatı</div>
                      <span className="text-[11px] font-normal text-slate-500 block mt-0.5">
                        m², saatlik veya iş başı taban ücret.
                      </span>
                    </button>
                  </div>
                </div>

                {pricingType === 'unit_rate' && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Birim Fiyat (TL)
                      </label>
                      <input
                        type="number"
                        value={priceUnitRate}
                        onChange={(e) => setPriceUnitRate(e.target.value)}
                        placeholder="Örn: 180"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-700 block mb-1">
                        Birim Ölçüsü
                      </label>
                      <select
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-bold"
                      >
                        <option value="m² başına">m² başına</option>
                        <option value="saatlik">saatlik</option>
                        <option value="günlük">günlük</option>
                        <option value="iş / proje başı">iş / proje başı</option>
                        <option value="ton başına">ton başına</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ) : listingType === 'rental' ? (
              /* Rental Pricing */
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Günlük Fiyat (TL) *
                  </label>
                  <input
                    type="number"
                    required
                    value={priceDaily}
                    onChange={(e) => setPriceDaily(e.target.value)}
                    placeholder="Örn: 8500"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Haftalık Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    value={priceWeekly}
                    onChange={(e) => setPriceWeekly(e.target.value)}
                    placeholder="Örn: 50000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Aylık Fiyat (TL)
                  </label>
                  <input
                    type="number"
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(e.target.value)}
                    placeholder="Örn: 180000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            ) : (
              /* Sale Pricing */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Satış Fiyatı (TL) *
                  </label>
                  <input
                    type="number"
                    required
                    value={priceSale}
                    onChange={(e) => setPriceSale(e.target.value)}
                    placeholder="Örn: 1250000"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Minimum Sipariş Miktarı
                  </label>
                  <input
                    type="number"
                    value={minOrderQty}
                    onChange={(e) => setMinOrderQty(e.target.value)}
                    placeholder="Örn: 10 Palet veya 1 Adet"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Inclusions Checkboxes for equipment/rental */}
            {listingType !== 'service' && (
              <div className="grid grid-cols-3 gap-3 pt-2">
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOperatorIncluded}
                    onChange={(e) => setIsOperatorIncluded(e.target.checked)}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-navy-900">Operatör Dahil</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFuelIncluded}
                    onChange={(e) => setIsFuelIncluded(e.target.checked)}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-navy-900">Yakıt Dahil</span>
                </label>
                <label className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTransportIncluded}
                    onChange={(e) => setIsTransportIncluded(e.target.checked)}
                    className="accent-orange-500 w-4 h-4"
                  />
                  <span className="text-xs font-bold text-navy-900">Nakliye Dahil</span>
                </label>
              </div>
            )}
          </div>

          {/* Section 5: Konum ve Hizmet Bölgesi */}
          <div className="space-y-4">
            <h3 className="text-sm font-extrabold text-navy-900 border-b border-slate-100 pb-2">
              5. Konum ve Hizmet Alanı
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">İl *</label>
                <select
                  value={cityId}
                  onChange={(e) => handleCityChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">İlçe *</label>
                <select
                  value={districtId}
                  onChange={(e) => handleDistrictChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  {DISTRICTS.filter((d) => d.city_id === Number(cityId)).map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Extended Service Radius for Services */}
            {listingType === 'service' && (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-orange-500" />
                  Hizmet Verilen Yarıçap (Şantiye Kapsama Alanı)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="25"
                    max="300"
                    step="25"
                    value={serviceRadiusKm}
                    onChange={(e) => setServiceRadiusKm(e.target.value)}
                    className="flex-1 accent-orange-500"
                  />
                  <span className="text-xs font-black text-navy-900 bg-white px-3 py-1.5 rounded-lg border">
                    {serviceRadiusKm} km Yarıçap
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Bu merkezden {serviceRadiusKm} km mesafe içindeki tüm şantiye aramalarında ilanınız hizmet veren olarak listelenecektir.
                </p>
              </div>
            )}
          </div>

          {/* Section 6: Görseller */}
          <div id="photo-upload-section" className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-extrabold text-navy-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-orange-500" />
                <span>6. Gerçek İlan Fotoğrafları</span>
                <span className="text-red-500 font-black text-xs bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  * Zorunlu (En az 1 Adet)
                </span>
              </h3>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                  images.length === 0
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                }`}
              >
                {images.length === 0 ? 'Henüz Fotoğraf Eklenmedi' : `${images.length}/10 Fotoğraf Yüklendi`}
              </span>
            </div>

            {imageError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-pulse">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span className="font-bold">{imageError}</span>
              </div>
            )}

            {/* Dosya Yükleme Alanı */}
            <label
              className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center group ${
                images.length === 0
                  ? 'border-orange-300 bg-orange-50/20 hover:border-orange-500 hover:bg-orange-50/40'
                  : 'border-slate-300 hover:border-orange-500 bg-slate-50 hover:bg-orange-50/30'
              }`}
            >
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileUpload}
                disabled={uploadingImage || images.length >= 10}
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-orange-500 flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                {uploadingImage ? (
                  <span className="w-5 h-5 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
                ) : (
                  <UploadCloud className="w-6 h-6" />
                )}
              </div>
              <p className="text-xs font-black text-navy-900">
                {uploadingImage ? 'Fotoğraflar Yükleniyor ve Optimize Ediliyor...' : 'Fotoğrafları Seçin veya Buraya Sürükleyin (En az 1 adet zorunlu)'}
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                JPEG, PNG veya WebP formatında, her biri en fazla 10 MB (Maksimum 10 fotoğraf)
              </p>
            </label>

            {/* Yüklenen Fotoğrafların Önizleme Galerisi */}
            {images.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-slate-500">
                  İlk yüklenen fotoğraf arama sonuçlarında <span className="text-orange-600">kapak fotoğrafı</span> olarak kullanılır.
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                  {images.map((img, i) => (
                    <div
                      key={i}
                      className="relative aspect-[16/10] rounded-xl overflow-hidden bg-slate-100 border-2 border-slate-200 group shadow-sm hover:border-orange-400 transition"
                    >
                      <img src={img} alt={`İlan fotoğrafı ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(i)}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-600 text-white text-xs font-black flex items-center justify-center shadow transition"
                        title="Fotoğrafı Sil"
                      >
                        ✕
                      </button>
                      {i === 0 && (
                        <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded bg-navy-900/90 text-white text-[10px] font-black tracking-wider uppercase shadow">
                          Kapak Fotoğrafı
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs">
              {images.length === 0 ? (
                <span className="text-red-600 font-bold flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  İlan yayınlayabilmek için en az 1 adet fotoğraf yüklemeniz gerekir.
                </span>
              ) : (
                <span className="text-emerald-700 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  {images.length} adet fotoğraf hazır.
                </span>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm tracking-wide shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              {loading ? (
                <span>Kaydediliyor...</span>
              ) : (
                <>
                  <PlusCircle className="w-5 h-5" />
                  <span>İLANIMI YAYINA AL</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
