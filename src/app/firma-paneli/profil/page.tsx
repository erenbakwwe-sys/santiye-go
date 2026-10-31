'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Building2, Phone, MessageSquare, MapPin, CheckCircle2 } from 'lucide-react';
import { CITIES } from '@/lib/mock-data';

export default function CompanyProfilePage() {
  const [name, setName] = useState('Anadolu İş Makineleri Parkı');
  const [phone, setPhone] = useState('+90 532 000 0101');
  const [whatsapp, setWhatsapp] = useState('+90 532 000 0101');
  const [cityId, setCityId] = useState('34');
  const [address, setAddress] = useState('Tuzla Mermerciler Sanayi Sitesi No: 42, İstanbul');
  const [taxNumber, setTaxNumber] = useState('1234567890');
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
        <span className="text-xs font-semibold text-slate-400">Firma Profili</span>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
          <div className="w-16 h-16 rounded-2xl bg-navy-900 text-orange-500 flex items-center justify-center font-black text-2xl">
            A
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-navy-900">
              Firma Profilini Düzenle
            </h1>
            <p className="text-xs text-slate-500">
              İlanlarınızda ve aramalarda görünecek kurumsal iletişim bilgileri
            </p>
          </div>
        </div>

        {saved && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Firma profil bilgileriniz başarıyla güncellendi!</span>
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
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
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
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
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bulunduğu İl *
              </label>
              <select
                required
                value={cityId}
                onChange={(e) => setCityId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold"
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
                Vergi Numarası / Dairesi
              </label>
              <input
                type="text"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm"
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
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm"
            />
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
                  adres: address,
                  sehir_id: cityId,
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
