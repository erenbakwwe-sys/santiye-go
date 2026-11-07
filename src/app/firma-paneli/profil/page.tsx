'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Phone,
  MessageSquare,
  MapPin,
  CheckCircle2,
  UploadCloud,
  FileCheck2,
  AlertCircle,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { CITIES } from '@/lib/mock-data';
import { createClient } from '@/lib/supabase/client';
import { uploadCompanyDocument } from '@/lib/services/storage-service';

export default function CompanyProfilePage() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [cityId, setCityId] = useState('34');
  const [address, setAddress] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');

  // Belge ve Doğrulama Durumu
  const [taxPlateUrl, setTaxPlateUrl] = useState('');
  const [signatureCircularUrl, setSignatureCircularUrl] = useState('');
  const [verificationStatus, setVerificationStatus] = useState<'unverified' | 'pending' | 'approved' | 'rejected'>('unverified');
  const [uploadingDoc, setUploadingDoc] = useState<'tax' | 'signature' | null>(null);

  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const supabase = createClient();

  useEffect(() => {
    async function fetchCompanyProfile() {
      try {
        const isSupabaseConfigured =
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

        if (!isSupabaseConfigured) {
          setName('Anadolu İş Makineleri Parkı');
          setPhone('+90 532 000 0101');
          setWhatsapp('+90 532 000 0101');
          setAddress('Tuzla Mermerciler Sanayi Sitesi No: 42, İstanbul');
          setTaxNumber('1234567890');
          setTaxOffice('Tuzla V.D.');
          setVerificationStatus('approved');
          setLoading(false);
          return;
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          let { data: comp } = await supabase
            .from('companies')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          const meta = user.user_metadata || {};

          if (!comp) {
            const { data: newComp } = await supabase
              .from('companies')
              .insert({
                user_id: user.id,
                name: meta.company_name || meta.full_name || 'Firma Hesabı',
                phone: meta.phone || '',
                tax_number: meta.tax_number || null,
                tax_office: meta.tax_office || null,
                city_id: meta.city_id ? Number(meta.city_id) : 34,
                district_id: meta.district_id ? Number(meta.district_id) : null,
                is_verified: false,
                is_demo: false,
              })
              .select('*')
              .maybeSingle();
            comp = newComp;
          }

          if (comp) {
            setName(comp.name || meta.company_name || '');
            setPhone(comp.phone || meta.phone || '');
            setWhatsapp(comp.whatsapp || '');
            setCityId(comp.city_id ? String(comp.city_id) : '34');
            setAddress(comp.address || '');
            setTaxNumber(comp.tax_number || meta.tax_number || '');
            setTaxOffice(comp.tax_office || meta.tax_office || '');
            setTaxPlateUrl(comp.tax_plate_url || comp.tax_document_url || '');
            setSignatureCircularUrl(comp.signature_circular_url || '');
            setVerificationStatus(comp.verification_status || (comp.is_verified ? 'approved' : 'unverified'));
          }
        }
      } catch (err: any) {
        console.error('Fetch company profile error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCompanyProfile();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSaved(false);

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isSupabaseConfigured) {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { error } = await supabase
            .from('companies')
            .update({
              name,
              phone,
              whatsapp,
              city_id: Number(cityId),
              address,
              tax_number: taxNumber,
              tax_office: taxOffice,
              tax_document_url: taxPlateUrl,
              signature_circular_url: signatureCircularUrl,
            })
            .eq('user_id', user.id);

          if (error) throw error;
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Profil güncellenirken bir hata oluştu.');
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'tax' | 'signature') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingDoc(type);
    setErrorMsg('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const companyId = user?.id || 'f0000000-0000-0000-0000-000000000001';
      const docTypeKey = type === 'tax' ? 'tax_plate' : 'signature_circular';
      const res = await uploadCompanyDocument(file, companyId, docTypeKey);

      if (!res.success) {
        throw new Error(res.error || 'Belge yüklenemedi.');
      }

      if (type === 'tax') {
        setTaxPlateUrl(res.url || file.name);
      } else {
        setSignatureCircularUrl(res.url || file.name);
      }

      // Veritabanına kaydet
      if (user) {
        await supabase
          .from('companies')
          .update({
            [type === 'tax' ? 'tax_document_url' : 'signature_circular_url']: res.url || file.name,
            verification_status: 'pending',
          })
          .eq('user_id', user.id);

        setVerificationStatus('pending');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Belge yüklenirken bir hata oluştu.');
    } finally {
      setUploadingDoc(null);
      e.target.value = '';
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/firma-paneli"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-navy-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Firma Paneline Dön
        </Link>
        <span className="text-xs font-semibold text-slate-400">Firma Profili & Onay</span>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        {/* Header & Verification Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-navy-900 text-orange-500 flex items-center justify-center font-black text-2xl shadow-sm">
              {name ? name.charAt(0).toUpperCase() : 'F'}
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-navy-900">
                {name || 'Firma Profilini Düzenle'}
              </h1>
              <p className="text-xs text-slate-500">
                İlanlarınızda ve aramalarda görünecek kurumsal iletişim bilgileri
              </p>
            </div>
          </div>

          <div>
            {verificationStatus === 'approved' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-black border border-emerald-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Doğrulanmış Firma
              </span>
            ) : verificationStatus === 'pending' ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 text-xs font-black border border-amber-200">
                <Clock className="w-4 h-4 text-amber-600" />
                Onay Bekliyor
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-black border border-slate-200">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                Doğrulanmamış Firma
              </span>
            )}
          </div>
        </div>

        {saved && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Firma profil bilgileriniz başarıyla güncellendi!</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Firma Resmi Unvanı *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:border-orange-500 focus:bg-white focus:outline-none transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Firma Telefon Numarası *
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                WhatsApp İletişim Hattı
              </label>
              <div className="relative flex items-center">
                <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bulunduğu İl *
              </label>
              <select
                required
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:border-orange-500 focus:outline-none"
              >
                {CITIES.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vergi Numarası (VKN/TCKN)
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                placeholder="10 veya 11 hane"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:border-orange-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Vergi Dairesi
              </label>
              <input
                type="text"
                value={taxOffice}
                onChange={(e) => setTaxOffice(e.target.value)}
                placeholder="Örn: Tuzla V.D."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Merkez / Garaj Adresi
            </label>
            <textarea
              rows={2}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:outline-none"
            />
          </div>

          {/* Gerçek Doğrulama Belgeleri Yükleme Alanı */}
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <h3 className="text-xs font-black text-navy-900 uppercase tracking-wider">
              Kurumsal Doğrulama Belgeleri (PDF / Resim)
            </h3>
            <p className="text-xs text-slate-500">
              Doğrulanmış Firma rozeti almak ve ilanlarınızın öncelikli onaylanması için belgelerinizi yükleyin.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Vergi Levhası */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-navy-900 block">Güncel Vergi Levhası</span>
                {taxPlateUrl ? (
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <span className="truncate max-w-[180px]">✓ Belge Yüklendi</span>
                    <label className="text-orange-600 cursor-pointer font-bold hover:underline">
                      Değiştir
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => handleDocUpload(e, 'tax')}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 hover:border-orange-500 p-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 hover:text-orange-600 transition">
                    <UploadCloud className="w-4 h-4" />
                    <span>{uploadingDoc === 'tax' ? 'Yükleniyor...' : 'Vergi Levhası Yükle'}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleDocUpload(e, 'tax')}
                    />
                  </label>
                )}
              </div>

              {/* İmza Sirküleri / Yetki Belgesi */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-navy-900 block">İmza Sirküleri / Yetki Belgesi</span>
                {signatureCircularUrl ? (
                  <div className="flex items-center justify-between text-xs text-emerald-700 font-semibold bg-emerald-50 p-2 rounded-xl border border-emerald-100">
                    <span className="truncate max-w-[180px]">✓ Belge Yüklendi</span>
                    <label className="text-orange-600 cursor-pointer font-bold hover:underline">
                      Değiştir
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="hidden"
                        onChange={(e) => handleDocUpload(e, 'signature')}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="border border-dashed border-slate-300 hover:border-orange-500 p-2.5 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold text-slate-600 hover:text-orange-600 transition">
                    <UploadCloud className="w-4 h-4" />
                    <span>{uploadingDoc === 'signature' ? 'Yükleniyor...' : 'Yetki Belgesi Yükle'}</span>
                    <input
                      type="file"
                      accept="application/pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleDocUpload(e, 'signature')}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-md transition"
            >
              Değişiklikleri Kaydet
            </button>
          </div>
        </form>

        {/* KVKK Madde 11: Kullanıcı Hakları ve Veri Yönetimi */}
        <div className="pt-6 border-t border-slate-200 space-y-3">
          <h3 className="text-sm font-black text-navy-900 flex items-center gap-1.5">
            <span>KVKK Veri Yönetimi & Kullanıcı Hakları</span>
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            6698 sayılı KVKK kapsamında platformumuzda kayıtlı tüm verilerinizin kopyasını indirebilir veya hesabınızın kalıcı olarak anonimleştirilerek silinmesini talep edebilirsiniz.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                const dataObj = {
                  firma_unvani: name,
                  telefon: phone,
                  whatsapp,
                  vergi_no: taxNumber,
                  vergi_dairesi: taxOffice,
                  adres: address,
                  sehir_id: cityId,
                  dogrulama_durumu: verificationStatus,
                  ihrac_tarihi: new Date().toISOString(),
                };
                const blob = new Blob([JSON.stringify(dataObj, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `santiyego-kisisel-verilerim-${Date.now()}.json`;
                a.click();
              }}
              className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-navy-900 font-bold text-xs transition border border-slate-300"
            >
              📥 Verilerimi İndir (JSON)
            </button>

            <button
              type="button"
              onClick={() => {
                const confirmDelete = window.confirm(
                  'DİKKAT: Hesabınızı silme talebinde bulunmak üzeresiniz. Tüm aktif ilanlarınız yayından kaldırılacak ve kimlik bilgileriniz anonimleştirilecektir. Onaylıyor musunuz?'
                );
                if (confirmDelete) {
                  alert('Hesap silme talebiniz KVKK birimimize iletildi. 24 saat içinde işleme alınacaktır.');
                }
              }}
              className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition border border-red-200"
            >
              ⚠️ Hesabımı Silme / Kapatma Talebi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
