/**
 * ŞANTİYE GO – BİRLEŞİK KİMLİK DOĞRULAMA VE HESAP YÖNETİMİ (AUTH SERVICE)
 * Hem canlı Supabase bağlantısı hem de yerel/demo ortamında sıfır kesintiyle çalışan
 * kurumsal kayıt, giriş, profil ve oturum yöneticisi.
 */

import { createClient } from '@/lib/supabase/client';
import { Profile, Company, UserRole } from '@/types/database';
import { sendPhoneOtp, verifyPhoneOtp } from './sms-service';
import { sendEmailVerification } from './email-service';

export interface LocalAuthUser {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  full_name: string;
  phone: string;
  is_email_verified: boolean;
  is_phone_verified: boolean;
  company?: {
    id: string;
    name: string;
    tax_number?: string;
    tax_office?: string;
    city_id?: number;
    district_id?: number;
  };
}

const STORAGE_USERS_KEY = 'santiyego_users_store';
const STORAGE_CURRENT_USER_KEY = 'santiyego_current_session_user';

// Varsayılan Önceden Tanımlı Süper Admin ve Test Hesapları
const DEFAULT_PRESET_USERS: LocalAuthUser[] = [
  {
    id: 'super-admin-001',
    email: 'admin@santiyego.com',
    passwordHash: 'Admin123456!',
    role: 'super_admin',
    full_name: 'Platform Süper Yöneticisi',
    phone: '+905320000000',
    is_email_verified: true,
    is_phone_verified: true,
  },
  {
    id: 'demo-company-user-001',
    email: 'firma@santiyego.com',
    passwordHash: 'Firma123456!',
    role: 'company',
    full_name: 'Kemal Demir (Anadolu İş Makineleri)',
    phone: '+905320000101',
    is_email_verified: true,
    is_phone_verified: true,
    company: {
      id: 'f0000000-0000-0000-0000-000000000001',
      name: 'Anadolu İş Makineleri Parkı',
      tax_number: '1234567890',
      tax_office: 'Tuzla V.D.',
      city_id: 34,
      district_id: 104,
    },
  },
  {
    id: 'demo-buyer-user-001',
    email: 'alici@santiyego.com',
    passwordHash: 'Alici123456!',
    role: 'buyer',
    full_name: 'Ahmet Yılmaz (Müteahhit)',
    phone: '+905321112233',
    is_email_verified: true,
    is_phone_verified: true,
  },
];

function getStoredUsers(): LocalAuthUser[] {
  if (typeof window === 'undefined') return DEFAULT_PRESET_USERS;
  try {
    const raw = localStorage.getItem(STORAGE_USERS_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(DEFAULT_PRESET_USERS));
      return DEFAULT_PRESET_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_PRESET_USERS;
  } catch {
    return DEFAULT_PRESET_USERS;
  }
}

function saveStoredUsers(users: LocalAuthUser[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.error('Save users store error:', err);
  }
}

/**
 * 1. KULLANICI KAYDI (REGISTER)
 */
export async function registerUser({
  email,
  password,
  fullName,
  role,
  phone,
  companyName,
  taxNumber,
  taxOffice,
  cityId,
  districtId,
}: {
  email: string;
  password: string;
  fullName: string;
  role: UserRole;
  phone: string;
  companyName?: string;
  taxNumber?: string;
  taxOffice?: string;
  cityId?: string;
  districtId?: string;
}): Promise<{ success: boolean; user?: LocalAuthUser; otpMessage?: string; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const supabase = createClient();
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  // A. Canlı Supabase Varsa
  if (isSupabaseConfigured) {
    try {
      // 1. Telefon mükerrerlik kontrolü (Aynı telefonla ikinci hesap açılamaz)
      if (phone) {
        const { data: existingPhone } = await supabase
          .from('profiles')
          .select('id')
          .eq('phone', phone)
          .maybeSingle();

        if (existingPhone) {
          return {
            success: false,
            error: 'Bu telefon numarası ile kayıtlı bir hesap zaten bulunmaktadır. Lütfen giriş yapınız.',
          };
        }
      }

      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://santiyego.com').replace(/\/$/, '');
      const redirectUrl = `${siteUrl}/auth/callback`;

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            role,
            phone,
            company_name: role === 'company' ? (companyName?.trim() || fullName.trim()) : undefined,
            tax_number: role === 'company' ? taxNumber?.trim() : undefined,
            tax_office: role === 'company' ? taxOffice?.trim() : undefined,
            city_id: role === 'company' && cityId ? Number(cityId) : null,
            district_id: role === 'company' && districtId ? Number(districtId) : null,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (authError) {
        if (authError.message?.toLowerCase().includes('rate limit')) {
          throw new Error('Supabase varsayılan e-posta gönderim sınırına ulaşıldı. Lütfen Supabase Dashboard > Authentication > Providers > Email altındaki "Confirm email" ayarını kapatınız (Zaten Resend OTP sistemi aktiftir).');
        }
        throw authError;
      }

      if (authData.user) {
        const userId = authData.user.id;
        const nowIso = new Date().toISOString();

        // İstemci tarafı kayıt (Veritabanı tetikleyicisi yoksa veya oturum açılmışsa çalışır)
        try {
          await supabase.from('profiles').upsert({
            id: userId,
            role,
            full_name: fullName.trim(),
            phone,
            kvkk_accepted_at: nowIso,
            kvkk_version: 'v1.0',
            is_email_verified: false,
            is_phone_verified: false,
          });

          if (role === 'company') {
            await supabase.from('companies').upsert({
              user_id: userId,
              name: companyName?.trim() || fullName.trim(),
              tax_number: taxNumber?.trim() || null,
              tax_office: taxOffice?.trim() || null,
              phone,
              city_id: cityId ? Number(cityId) : null,
              district_id: districtId ? Number(districtId) : null,
              is_verified: false,
              is_demo: false,
            });
          }
        } catch {
          // Anonim RLS kısıtlaması durumunda veritabanı tetikleyicisi ve giriş anındaki otomatik onarım devreye girer
        }

        const otpRes = await sendPhoneOtp(phone);
        return { success: true, otpMessage: otpRes.message };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  // B. Yerel Güvenli Kayıt Motoru (Local Resilient Engine)
  const users = getStoredUsers();
  const existsEmail = users.find((u) => u.email === cleanEmail);
  if (existsEmail) {
    return {
      success: false,
      error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten bulunmaktadır. Lütfen giriş yapınız.',
    };
  }

  const existsPhone = users.find((u) => u.phone === phone);
  if (existsPhone) {
    return {
      success: false,
      error: 'Bu telefon numarası ile kayıtlı bir hesap zaten bulunmaktadır. Lütfen giriş yapınız.',
    };
  }

  const newUserId = `user-${Date.now()}`;
  const newUser: LocalAuthUser = {
    id: newUserId,
    email: cleanEmail,
    passwordHash: password,
    role,
    full_name: fullName.trim(),
    phone,
    is_email_verified: false,
    is_phone_verified: false,
    company:
      role === 'company'
        ? {
            id: `comp-${Date.now()}`,
            name: companyName?.trim() || fullName.trim(),
            tax_number: taxNumber?.trim(),
            tax_office: taxOffice?.trim(),
            city_id: cityId ? Number(cityId) : 34,
            district_id: districtId ? Number(districtId) : 104,
          }
        : undefined,
  };

  users.push(newUser);
  saveStoredUsers(users);

  // Oturumu hazırla
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(newUser));
    document.cookie = `santiyego_auth=true; path=/; max-age=86400; SameSite=Lax`;
  }

  // OTP gönderimi tetikle
  const otpRes = await sendPhoneOtp(phone);

  return {
    success: true,
    user: newUser,
    otpMessage: otpRes.message,
  };
}

/**
 * 2. KULLANICI GİRİŞİ (LOGIN)
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ success: boolean; user?: LocalAuthUser; profile?: Profile; error?: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const supabase = createClient();
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  // A. Canlı Supabase Varsa
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error) {
        return { success: false, error: 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol ediniz.' };
      }

      if (data?.user) {
        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.user.id)
          .maybeSingle();

        const meta = (data.user.user_metadata || {}) as Record<string, any>;
        const metaRole = (meta.role as UserRole) || 'buyer';

        // 1. Profil yoksa: Kullanıcı authenticated olduğundan RLS'e takılmadan otomatik oluştur
        if (!profile) {
          const newProfile = {
            id: data.user.id,
            role: metaRole,
            full_name: meta.full_name || cleanEmail.split('@')[0],
            phone: meta.phone || null,
            kvkk_accepted_at: new Date().toISOString(),
            kvkk_version: 'v1.0',
            is_email_verified: !!data.user.email_confirmed_at,
            is_phone_verified: !!data.user.phone_confirmed_at,
          };
          const { data: createdProf } = await supabase
            .from('profiles')
            .upsert(newProfile)
            .select()
            .maybeSingle();

          profile = (createdProf || newProfile) as Profile;
        } else if (profile.role === 'buyer' && metaRole === 'company') {
          // Eğer profil buyer olarak kalmış ama kayıt company ise role güncelle
          const { data: updatedProf } = await supabase
            .from('profiles')
            .update({ role: 'company' })
            .eq('id', data.user.id)
            .select()
            .maybeSingle();
          if (updatedProf) profile = updatedProf as Profile;
        }

        const effectiveRole: UserRole = (profile?.role || metaRole) as UserRole;

        // 2. Eğer rol 'company' ise ve companies tablosunda kayıt yoksa oluştur
        if (effectiveRole === 'company') {
          const { data: existingCompany } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', data.user.id)
            .maybeSingle();

          if (!existingCompany) {
            await supabase.from('companies').upsert({
              user_id: data.user.id,
              name: meta.company_name || meta.full_name || profile.full_name || 'Firma Hesabı',
              tax_number: meta.tax_number || null,
              tax_office: meta.tax_office || null,
              phone: meta.phone || profile.phone || '',
              city_id: meta.city_id ? Number(meta.city_id) : null,
              district_id: meta.district_id ? Number(meta.district_id) : null,
              is_verified: false,
              is_demo: false,
            });
          }
        }

        // 3. Cookie & Local Storage senkronizasyonu
        if (typeof window !== 'undefined') {
          const sessionUser: LocalAuthUser = {
            id: profile.id,
            email: cleanEmail,
            passwordHash: '***',
            role: effectiveRole,
            full_name: profile.full_name,
            phone: profile.phone || '',
            is_email_verified: profile.is_email_verified,
            is_phone_verified: profile.is_phone_verified,
          };
          localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(sessionUser));
          document.cookie = `santiyego_auth=true; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `santiyego_role=${effectiveRole}; path=/; max-age=86400; SameSite=Lax`;
        }

        return {
          success: true,
          profile: { ...profile, role: effectiveRole } as Profile,
          user: {
            id: profile.id,
            email: cleanEmail,
            passwordHash: '***',
            role: effectiveRole,
            full_name: profile.full_name,
            phone: profile.phone || '',
            is_email_verified: profile.is_email_verified,
            is_phone_verified: profile.is_phone_verified,
          },
        };
      }
    } catch {
      return { success: false, error: 'Giriş yapılamadı. Lütfen tekrar deneyiniz.' };
    }
  }

  // B. Yerel Güvenli Giriş Motoru
  const users = getStoredUsers();
  const matched = users.find(
    (u) => u.email === cleanEmail && u.passwordHash === password
  );

  if (!matched) {
    return {
      success: false,
      error: 'E-posta veya şifre hatalı. Lütfen bilgilerinizi kontrol ediniz.',
    };
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(matched));
    document.cookie = `santiyego_auth=true; path=/; max-age=86400; SameSite=Lax`;
    document.cookie = `santiyego_role=${matched.role}; path=/; max-age=86400; SameSite=Lax`;
  }

  const mockProfile: Profile = {
    id: matched.id,
    role: matched.role,
    full_name: matched.full_name,
    phone: matched.phone,
    is_email_verified: matched.is_email_verified,
    is_phone_verified: matched.is_phone_verified,
    kvkk_accepted_at: new Date().toISOString(),
    kvkk_version: 'v1.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return {
    success: true,
    user: matched,
    profile: mockProfile,
  };
}

/**
 * 3. AKTİF OTURUMU GETİR (GET CURRENT USER)
 */
export async function getActiveProfile(): Promise<Profile | null> {
  const supabase = createClient();
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isSupabaseConfigured) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        let { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        const meta = (user.user_metadata || {}) as Record<string, any>;
        const metaRole = (meta.role as UserRole) || 'buyer';

        // Profil yoksa veya buyer kalmış ama kullanıcı company ise düzelt
        if (!data) {
          const newProfile = {
            id: user.id,
            role: metaRole,
            full_name: meta.full_name || user.email?.split('@')[0] || 'Kullanıcı',
            phone: meta.phone || null,
            kvkk_accepted_at: new Date().toISOString(),
            kvkk_version: 'v1.0',
            is_email_verified: !!user.email_confirmed_at,
            is_phone_verified: !!user.phone_confirmed_at,
          };
          const { data: created } = await supabase
            .from('profiles')
            .upsert(newProfile)
            .select()
            .maybeSingle();
          data = created || (newProfile as Profile);
        } else if (data.role === 'buyer' && metaRole === 'company') {
          const { data: updated } = await supabase
            .from('profiles')
            .update({ role: 'company' })
            .eq('id', user.id)
            .select()
            .maybeSingle();
          if (updated) data = updated;
        }

        if (data) {
          if (typeof window !== 'undefined') {
            document.cookie = `santiyego_auth=true; path=/; max-age=86400; SameSite=Lax`;
            document.cookie = `santiyego_role=${data.role}; path=/; max-age=86400; SameSite=Lax`;
          }
          return data as Profile;
        }
      }
    } catch {
      // fallback
    }
  }

  // Local storage session fallback
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
      if (raw) {
        const u: LocalAuthUser = JSON.parse(raw);
        return {
          id: u.id,
          role: u.role,
          full_name: u.full_name,
          phone: u.phone,
          is_email_verified: u.is_email_verified,
          is_phone_verified: u.is_phone_verified,
          kvkk_accepted_at: new Date().toISOString(),
          kvkk_version: 'v1.0',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * 4. GÜVENLİ ÇIKIŞ (SIGN OUT)
 */
export async function logoutUser(): Promise<void> {
  const supabase = createClient();
  try {
    await supabase.auth.signOut();
  } catch {
    // ignore
  }

  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_CURRENT_USER_KEY);
    document.cookie = 'santiyego_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'santiyego_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}

/**
 * 5. TELEFON DOĞRULAMASINI TAMAMLAMA
 */
export async function markPhoneVerified(phone: string): Promise<void> {
  const supabase = createClient();
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  if (isSupabaseConfigured) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        await supabase
          .from('profiles')
          .update({ is_phone_verified: true, phone_verified_at: new Date().toISOString() })
          .eq('id', user.id);
      }
    } catch {
      // ignore
    }
  }

  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem(STORAGE_CURRENT_USER_KEY);
    if (raw) {
      const u: LocalAuthUser = JSON.parse(raw);
      u.is_phone_verified = true;
      localStorage.setItem(STORAGE_CURRENT_USER_KEY, JSON.stringify(u));

      const users = getStoredUsers();
      const idx = users.findIndex((x) => x.id === u.id);
      if (idx !== -1) {
        users[idx].is_phone_verified = true;
        saveStoredUsers(users);
      }
    }
  }
}
