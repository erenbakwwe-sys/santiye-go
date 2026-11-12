import { registerUser } from '../src/lib/services/auth-service';

async function runRegistrationTests() {
  console.log('=== KAYIT VE BİLGİ DOĞRULAMA TESTLERİ ===\n');

  const testPhone = '+905321119988';
  const testEmail1 = 'birincikullanici@example.com';
  const testEmail2 = 'ikincikullanici@example.com';

  // 1. İlk kayıt başarıyla açılmalı
  const firstReg = await registerUser({
    email: testEmail1,
    password: 'Password123!',
    fullName: 'Ahmet Güvenli',
    role: 'buyer',
    phone: testPhone,
  });

  if (firstReg.success) {
    console.log('✅ [PASS] İlk kayıt başarıyla oluşturuldu.');
  } else {
    console.error('❌ [FAIL] İlk kayıt oluşturulamadı:', firstReg.error);
    process.exit(1);
  }

  // 2. Aynı telefon numarası ile İKİNCİ kayıt denemesi REDDEDİLMELİ
  const dupPhoneReg = await registerUser({
    email: testEmail2,
    password: 'Password123!',
    fullName: 'Mehmet Güvenli',
    role: 'buyer',
    phone: testPhone,
  });

  if (!dupPhoneReg.success && dupPhoneReg.error?.includes('Bu telefon numarası ile kayıtlı bir hesap')) {
    console.log('✅ [PASS] Aynı telefon numarasıyla ikinci kayıt başarıyla ENGELLENDİ: ' + dupPhoneReg.error);
  } else {
    console.error('❌ [FAIL] Mükerrer telefon engellenemedi! Sonuç:', dupPhoneReg);
    process.exit(1);
  }

  // 3. Aynı e-posta ile kayıt denemesi REDDEDİLMELİ
  const dupEmailReg = await registerUser({
    email: testEmail1,
    password: 'Password123!',
    fullName: 'Ahmet İkinci',
    role: 'buyer',
    phone: '+905321119999',
  });

  if (!dupEmailReg.success && dupEmailReg.error?.includes('Bu e-posta adresiyle')) {
    console.log('✅ [PASS] Aynı e-posta adresiyle ikinci kayıt başarıyla ENGELLENDİ.');
  } else {
    console.error('❌ [FAIL] Mükerrer e-posta engellenemedi! Sonuç:', dupEmailReg);
    process.exit(1);
  }

  console.log('\n========================================');
  console.log('TÜM KAYIT DOĞRULAMA TESTLERİ BAŞARIYLA GEÇTİ!');
  console.log('========================================\n');
}

runRegistrationTests().catch((e) => {
  console.error('Test hatası:', e);
  process.exit(1);
});
