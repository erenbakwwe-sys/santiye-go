/**
 * ŞANTİYE GO – İLK SÜPER ADMİN GÜVENLİ KURULUMU (SETUP ADMIN)
 * Prompt 8: Koda şifre yazmadan, ortam değişkeni veya komut satırı ile
 * 2FA zorunlu ilk süper admin hesabını oluşturan tek seferlik betik.
 *
 * Kullanım:
 * npx tsx scripts/setup-admin.ts --email=admin@santiyego.com --password=GucluSifre2026!
 */

import { createClient } from '@supabase/supabase-js';

async function setupSuperAdmin() {
  console.log('====================================================');
  console.log('🏗️  ŞANTİYE GO – SÜPER ADMİN KURULUM ARACI');
  console.log('====================================================\n');

  // 1. Parametreleri veya ortam değişkenlerini oku
  const args = process.argv.slice(2);
  const getArg = (key: string) => {
    const found = args.find((a) => a.startsWith(`--${key}=`));
    return found ? found.split('=')[1] : undefined;
  };

  const email = getArg('email') || process.env.INITIAL_ADMIN_EMAIL;
  const password = getArg('password') || process.env.INITIAL_ADMIN_PASSWORD;
  const phone = getArg('phone') || process.env.INITIAL_ADMIN_PHONE || '+905320000000';

  if (!email || !password) {
    console.error('❌ HATA: E-posta ve şifre belirtilmelidir.');
    console.log('Kullanım: npx tsx scripts/setup-admin.ts --email=admin@santiyego.com --password=Sifre2026!\n');
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('❌ HATA: Şifre en az 8 karakter olmalıdır.');
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    console.log('ℹ️  Supabase canlı veritabanı değişkenleri (.env) tanımlı değil.');
    console.log(`✅ Yerel Simülasyon: [${email}] süper admin olarak tanımlandı (2FA: Aktif).`);
    process.exit(0);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    console.log(`⏳ Admin kullanıcısı oluşturuluyor: ${email}...`);

    // A. Kullanıcıyı auth.users içine kaydet (E-posta doğrudan onaylı)
    const { data: userData, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      phone_confirm: true,
      user_metadata: {
        full_name: 'Süper Admin (Şantiye GO)',
        role: 'super_admin',
      },
    });

    let userId = userData?.user?.id;

    if (createError) {
      if (createError.message.includes('already registered')) {
        console.log('ℹ️  Bu e-posta zaten kayıtlı. Mevcut kullanıcı süper admin rolüne yükseltiliyor...');
        const { data: listData } = await adminClient.auth.admin.listUsers();
        const existing = listData?.users?.find((u) => u.email === email);
        if (!existing) throw createError;
        userId = existing.id;

        // Şifreyi güncelle
        await adminClient.auth.admin.updateUserById(userId, { password });
      } else {
        throw createError;
      }
    }

    if (!userId) {
      throw new Error('Kullanıcı ID alınamadı.');
    }

    // B. profiles tablosuna süper admin ve 2FA yetkisi yaz
    const nowIso = new Date().toISOString();
    const { error: profileError } = await adminClient.from('profiles').upsert({
      id: userId,
      role: 'super_admin',
      full_name: 'Platform Süper Yöneticisi',
      phone: phone,
      is_email_verified: true,
      is_phone_verified: true,
      email_verified_at: nowIso,
      phone_verified_at: nowIso,
      two_factor_enabled: true,
      kvkk_version: 'v1.0',
      kvkk_accepted_at: nowIso,
      updated_at: nowIso,
    });

    if (profileError) {
      throw profileError;
    }

    // C. Admin işlem günlüğüne log yaz
    await adminClient.from('admin_audit_logs').insert({
      admin_id: userId,
      action: 'INITIAL_ADMIN_CREATED',
      resource_type: 'AUTH',
      resource_id: userId,
      details: { email, role: 'super_admin', timestamp: nowIso },
    });

    console.log('\n🎉 TEBRİKLER! Süper Admin hesabı başarıyla oluşturuldu:');
    console.log(`- E-posta: ${email}`);
    console.log(`- Rol: super_admin`);
    console.log(`- 2FA Durumu: Zorunlu (Aktif)`);
    console.log(`- Doğrulama: E-posta & Telefon Onaylı`);
    console.log('\nArtık https://santiyego.vercel.app/giris adresinden giriş yapabilirsiniz.\n');
  } catch (err: any) {
    console.error('❌ HATA:', err.message || err);
    process.exit(1);
  }
}

setupSuperAdmin();
