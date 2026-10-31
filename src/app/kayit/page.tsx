'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { HardHat, Building2, User, Mail, Lock, Phone, MapPin, ShieldCheck, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CITIES } from '@/lib/mock-data';
import KvkkModal from '@/components/kvkk/KvkkModal';
import { UserRole } from '@/types/database';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('buyer');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [cityId, setCityId] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [kvkkModalOpen, setKvkkModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!kvkkAccepted) {
      setErrorMsg('Lütfen KVKK Aydınlatma Metnini onaylayınız.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (!isSupabaseConfigured) {
        // Mock success for local demo
        setSuccessMsg(
          'Kayıt başarılı! (Demo Modu: Supabase yapılandırıldığında onay e-postası gönderilecektir.)'
        );
        setTimeout(() => {
          router.push(role === 'company' ? '/firma-paneli' : '/alici-paneli');
        }, 1500);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: role,
          },
        },
      });

      if (authError) throw authError;

      if (authData.user) {
        // Insert into profiles
        await supabase.from('profiles').insert({
          id: authData.user.id,
          role: role,
          full_name: fullName,
          phone: phone,
          kvkk_accepted_at: new Date().toISOString(),
        });

        // If company role, insert into companies
        if (role === 'company') {
          await supabase.from('companies').insert({
            user_id: authData.user.id,
            name: companyName || fullName,
            phone: phone,
            city_id: cityId ? Number(cityId) : null,
          });
        }

        setSuccessMsg(
          'Kayıt başarılı! E-posta adresinize doğrulama bağlantısı gönderildi.'
        );
        setTimeout(() => {
          router.push('/giris');
        }, 2000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kayıt işlemi başarısız oldu.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-xl bg-orange-500 text-white items-center justify-center shadow-lg shadow-orange-500/30">
            <HardHat className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-navy-900 tracking-tight">
            Şantiye GO&apos;ya Katılın
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Akıllı şantiye ve yapı marketinizde hemen yerinizi alın
          </p>
        </div>

        {/* Role Toggle Selector */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setRole('buyer')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition ${
              role === 'buyer'
                ? 'bg-navy-900 text-white shadow-sm'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <User className="w-4 h-4" />
            Alıcı / Müteahhit
          </button>
          <button
            type="button"
            onClick={() => setRole('company')}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition ${
              role === 'company'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-600 hover:text-navy-900'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Firma / Satıcı
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ad Soyad
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Örn: Ahmet Yılmaz"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
            />
          </div>

          {role === 'company' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Firma Unvanı
              </label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Örn: Anadolu Hafriyat & İş Makineleri Ltd."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              E-posta Adresi
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ornek@sirket.com"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Telefon Numarası
            </label>
            <div className="relative flex items-center">
              <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+90 532 000 0000"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {role === 'company' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Firma Bulunduğu İl
              </label>
              <div className="relative flex items-center">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <select
                  required
                  value={cityId}
                  onChange={(e) => setCityId(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
                >
                  <option value="">İl Seçiniz</option>
                  {CITIES.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Şifre (En az 6 karakter)
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
              />
            </div>
          </div>

          {/* KVKK Consent Checkbox */}
          <div className="flex items-start gap-2 pt-2">
            <input
              type="checkbox"
              id="kvkk"
              checked={kvkkAccepted}
              onChange={(e) => setKvkkAccepted(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500 cursor-pointer"
            />
            <label htmlFor="kvkk" className="text-xs text-slate-600 leading-normal">
              <button
                type="button"
                onClick={() => setKvkkModalOpen(true)}
                className="text-orange-600 font-bold underline hover:text-orange-700"
              >
                KVKK Aydınlatma Metnini
              </button>{' '}
              ve üyelik sözleşmesini okudum, kişisel verilerimin işlenmesini kabul ediyorum.
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-extrabold text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2"
          >
            {loading ? 'Kaydediliyor...' : 'Kayıt Ol ve Başla'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100 text-xs text-slate-500">
          Zaten hesabınız var mı?{' '}
          <Link href="/giris" className="font-bold text-orange-600 hover:underline">
            Giriş Yapın
          </Link>
        </div>
      </div>

      <KvkkModal
        isOpen={kvkkModalOpen}
        onClose={() => setKvkkModalOpen(false)}
      />
    </div>
  );
}
