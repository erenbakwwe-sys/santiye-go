'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  HardHat,
  Building2,
  User,
  Mail,
  Lock,
  Phone,
  MapPin,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { CITIES, DISTRICTS } from '@/lib/mock-data';
import KvkkModal from '@/components/kvkk/KvkkModal';
import { UserRole } from '@/types/database';
import { normalizeTurkishPhone, sendPhoneOtp } from '@/lib/services/sms-service';
import { isDisposableEmail, sendEmailVerification } from '@/lib/services/email-service';
import { checkRateLimit } from '@/lib/security/rate-limiter';

export default function RegisterPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('buyer');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [phone, setPhone] = useState('');
  const [cityId, setCityId] = useState('');
  const [districtId, setDistrictId] = useState('');

  // Legal Consents
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [kvkkModalOpen, setKvkkModalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  // Şifre Gücü Denetimi
  const isPasswordValid =
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // 1. KVKK ve Şartlar Kontrolü
    if (!kvkkAccepted || !termsAccepted) {
      setErrorMsg('Lütfen KVKK Aydınlatma Metnini ve Kullanım Koşullarını onaylayınız.');
      return;
    }

    // 2. Şifre Kuralları
    if (!isPasswordValid) {
      setErrorMsg('Şifreniz en az 8 karakter olmalı, en az bir büyük harf, bir küçük harf ve bir rakam içermelidir.');
      return;
    }

    // 3. Tek Kullanımlık E-posta Engeli
    if (isDisposableEmail(email)) {
      setErrorMsg('Güvenlik nedeniyle geçici / tek kullanımlık e-posta adresleri kabul edilmemektedir.');
      return;
    }

    // 4. Telefon Numarası Normalizasyonu (+90)
    const phoneCheck = normalizeTurkishPhone(phone);
    if (!phoneCheck.valid) {
      setErrorMsg('Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (Örn: 0532 123 45 67).');
      return;
    }

    // 5. Firma Alanları Denetimi
    if (role === 'company') {
      if (!companyName.trim()) {
        setErrorMsg('Lütfen firmanızın resmi ticari unvanını giriniz.');
        return;
      }
      const cleanTax = taxNumber.replace(/\D/g, '');
      if (cleanTax.length !== 10 && cleanTax.length !== 11) {
        setErrorMsg('Vergi Kimlik Numarası (VKN) 10 hane, Şahıs şirketi için T.C. Kimlik No 11 hane olmalıdır.');
        return;
      }
    }

    // 6. Rate Limit Denetimi (Kayıt spam koruması)
    const rateCheck = checkRateLimit(`register_${phoneCheck.formatted}`, 3, 300000);
    if (!rateCheck.allowed) {
      setErrorMsg('Çok fazla kayıt denemesi yapıldı. Lütfen birkaç dakika sonra tekrar deneyiniz.');
      return;
    }

    setLoading(true);

    try {
      const isSupabaseConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (!isSupabaseConfigured) {
        throw new Error('Veritabanı bağlantısı yapılandırılmamıştır. Lütfen sistem yöneticisiyle iletişime geçiniz.');
      }

      // A. Supabase Auth Kaydı
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role: role,
            phone: phoneCheck.formatted,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('already registered')) {
          throw new Error('Bu e-posta adresiyle kayıtlı bir hesap zaten bulunmaktadır. Lütfen giriş yapınız.');
        }
        throw authError;
      }

      if (authData?.user) {
        const userId = authData.user.id;
        const nowIso = new Date().toISOString();

        // B. Profiles Tablosu Kaydı (KVKK Sürümü v1.0 ile)
        const { error: profileError } = await supabase.from('profiles').insert({
          id: userId,
          role: role,
          full_name: fullName.trim(),
          phone: phoneCheck.formatted,
          kvkk_accepted_at: nowIso,
          kvkk_version: 'v1.0',
          is_email_verified: false,
          is_phone_verified: false,
        });

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // C. Firma Rolü ise Companies Tablosuna Ekle
        if (role === 'company') {
          await supabase.from('companies').insert({
            user_id: userId,
            name: companyName.trim(),
            tax_number: taxNumber.trim(),
            tax_office: taxOffice.trim() || null,
            phone: phoneCheck.formatted,
            city_id: cityId ? Number(cityId) : null,
            district_id: districtId ? Number(districtId) : null,
            is_verified: false,
            is_demo: false,
            onboarding_step: 'documents_pending',
          });
        }

        // D. E-posta ve SMS Doğrulama Kodlarını Tetikle
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const verifyEmailLink = `${baseUrl}/dogrula/eposta?userId=${userId}&email=${encodeURIComponent(email.trim())}`;
        await sendEmailVerification(email.trim(), fullName.trim(), verifyEmailLink);
        await sendPhoneOtp(phoneCheck.formatted);

        setSuccessMsg('Hesabınız başarıyla oluşturuldu! Telefon doğrulama ekranına yönlendiriliyorsunuz...');
        setTimeout(() => {
          router.push(
            `/dogrula/telefon?phone=${encodeURIComponent(phoneCheck.formatted)}&email=${encodeURIComponent(email.trim())}`
          );
        }, 1200);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kayıt işlemi sırasında bir hata oluştu.';
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const filteredDistricts = DISTRICTS.filter((d) => !cityId || d.city_id === Number(cityId));

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-slate-50 flex items-center justify-center">
      <div className="max-w-xl w-full bg-white p-6 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-navy-900 text-orange-500 items-center justify-center shadow-lg shadow-navy-900/10">
            <HardHat className="w-7 h-7" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-navy-900 tracking-tight">
            Şantiye GO&apos;ya Katılın
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            İş makineleri, yapı malzemeleri ve şantiye hizmetleri için tek hesap
          </p>
        </div>

        {/* Rol Seçimi */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setRole('buyer')}
            className={`py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              role === 'buyer'
                ? 'bg-white text-navy-900 shadow-sm'
                : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            <User className="w-4 h-4 text-orange-500" />
            <span>Alıcı / Müteahhit</span>
          </button>
          <button
            type="button"
            onClick={() => setRole('company')}
            className={`py-3 px-4 rounded-xl text-xs font-black transition flex items-center justify-center gap-2 ${
              role === 'company'
                ? 'bg-navy-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-navy-900'
            }`}
          >
            <Building2 className="w-4 h-4 text-orange-400" />
            <span>Tedarikçi / Firma</span>
          </button>
        </div>

        {errorMsg && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
          {/* Ad Soyad */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ad Soyad / Yetkili Kişi *
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ahmet Yılmaz"
                className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
              />
            </div>
          </div>

          {/* Firma Özel Alanları */}
          {role === 'company' && (
            <div className="p-4 bg-orange-50/60 rounded-2xl border border-orange-100 space-y-3">
              <div>
                <label className="block text-xs font-bold text-navy-900 mb-1">
                  Resmi Firma Unvanı *
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Örn: Anadolu İş Makineleri Ltd. Şti."
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Vergi Kimlik No (VKN / TCKN) *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={11}
                    value={taxNumber}
                    onChange={(e) => setTaxNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="10 veya 11 hane"
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-mono focus:border-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">
                    Vergi Dairesi
                  </label>
                  <input
                    type="text"
                    value={taxOffice}
                    onChange={(e) => setTaxOffice(e.target.value)}
                    placeholder="Örn: Tuzla V.D."
                    className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:border-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">İl *</label>
                  <select
                    required
                    value={cityId}
                    onChange={(e) => {
                      setCityId(e.target.value);
                      setDistrictId('');
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-orange-500 focus:outline-none"
                  >
                    <option value="">İl Seçiniz</option>
                    {CITIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-navy-900 mb-1">İlçe</label>
                  <select
                    value={districtId}
                    onChange={(e) => setDistrictId(e.target.value)}
                    disabled={!cityId}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold focus:border-orange-500 focus:outline-none disabled:opacity-50"
                  >
                    <option value="">İlçe Seçiniz</option>
                    {filteredDistricts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* İletişim Bilgileri */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                E-posta Adresi *
              </label>
              <div className="relative flex items-center">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ad@sirket.com"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Cep Telefonu (SMS OTP için) *
              </label>
              <div className="relative flex items-center">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0532 123 45 67"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
                />
              </div>
            </div>
          </div>

          {/* Şifre */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Şifre (En az 8 karakter, büyük-küçük harf ve rakam) *
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:border-orange-500 focus:bg-white focus:outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-slate-400 hover:text-slate-600 p-1"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Yasal Onaylar */}
          <div className="space-y-2.5 pt-2 text-xs">
            <label className="flex items-start gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                required
                checked={kvkkAccepted}
                onChange={(e) => setKvkkAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
              />
              <span>
                <button
                  type="button"
                  onClick={() => setKvkkModalOpen(true)}
                  className="font-bold text-orange-600 hover:underline"
                >
                  KVKK Aydınlatma Metni
                </button>
                &apos;ni okudum, kişisel verilerimin işlenmesini onaylıyorum (v1.0).
              </span>
            </label>

            <label className="flex items-start gap-2 cursor-pointer text-slate-600">
              <input
                type="checkbox"
                required
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 w-4 h-4 text-orange-500 rounded border-slate-300 focus:ring-orange-500"
              />
              <span>
                <Link href="/kullanim-kosullari" target="_blank" className="font-bold text-orange-600 hover:underline">
                  Kullanım Koşulları
                </Link>
                &apos;nı ve Pazaryeri Üyelik Şartlarını kabul ediyorum.
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-lg shadow-orange-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Hesabınız Oluşturuluyor...
              </span>
            ) : (
              'Hesabımı Oluştur ve Devam Et'
            )}
          </button>
        </form>

        <div className="text-center pt-2 text-xs text-slate-500">
          Zaten bir hesabınız var mı?{' '}
          <Link href="/giris" className="font-bold text-orange-600 hover:underline">
            Giriş Yapın
          </Link>
        </div>
      </div>

      <KvkkModal isOpen={kvkkModalOpen} onClose={() => setKvkkModalOpen(false)} />
    </div>
  );
}
