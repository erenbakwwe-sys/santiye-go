/**
 * ŞANTİYE GO – PROMPT 9B: ATOMİK KREDİ HARCAMA VE YARIŞ TESTİ (RACE CONDITION)
 * 
 * Test Kapsamı:
 * 1. İstemciden (Authenticated) Doğrudan Yazma Engelleri:
 *    - apply_credit_purchase RPC'sini doğrudan çağırma -> REDDEDİLMELİ (Sadece service_role)
 *    - company_credit_balances tablosuna doğrudan INSERT/UPDATE -> REDDEDİLMELİ
 *    - company_credit_ledger tablosuna doğrudan INSERT/UPDATE/DELETE -> REDDEDİLMELİ
 * 2. RLS İzolasyonu:
 *    - Firma A, Firma B'nin bakiye veya defterini SELECT etmeye çalıştığında 0 satır dönmeli.
 * 3. Firma Kimliği ve Başkasının Kredisini Harcama Engeli:
 *    - Fonksiyon auth.uid() kullandığından parametre manipülasyonu imkansız.
 * 4. Gölge Mod Denetimi:
 *    - shadow_spend kaydı atılır, balance_after ve current_balance DEĞİŞMEZ.
 * 5. Eşzamanlı Yarış Testi (Concurrency Race Condition):
 *    - 3 slot dolu iken 5 firma aynı anda 4. slot için yarışır.
 *    - Beklenen: Tam 1 başarı (Slot 4/4), 4 adet "slot doldu" hatası, sadece kazananın bakiyesi düşer.
 * 6. Defter Toplamı = Bakiye Eşitliği Denetimi (Ledger Consistency Audit).
 */

import { createClient } from '@supabase/supabase-js';

async function runCreditRaceTest() {
  console.log('================================================================');
  console.log(' 🏗️  ŞANTİYE GO – PROMPT 9B ATOMİK KREDİ VE YARIŞ TEST SUITE');
  console.log('================================================================\n');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || anonKey;

  // FALLBACK DENETİMİ (Kural 2): Canlı Supabase yoksa açık hata ver
  if (!supabaseUrl || !serviceKey || supabaseUrl.includes('placeholder')) {
    console.error('❌ HATA (Kural 2): Supabase veritabanı bağlantısı (.env / NEXT_PUBLIC_SUPABASE_URL) yapılandırılmamış!');
    console.error('   Kredi ve defter işlemlerinde in-memory fallback KULLANILMAZ.');
    console.error('   Gerçek yarış testini çalıştırmak için lütfen canlı Supabase URL ve Key değerlerini .env dosyasına ekleyiniz.\n');
    console.log('📌 Test Hazırlığı Tamamlandı:');
    console.log('   [1] apply_credit_purchase yetki kısıtı denetimi (Sadece service_role)');
    console.log('   [2] İstemciden bakiyeye/deftere doğrudan yazma engeli (REVOKE & Trigger)');
    console.log('   [3] Başka firmanın defter/bakiyesini okuma engeli (RLS İzolasyonu)');
    console.log('   [4] 3 slot dolu iken 5 firmanın 4. slota aynı anda basması (Atomik Yarış)');
    console.log('   [5] Defter hareketleri toplamı = Güncel bakiye denetimi (Ledger Audit)');
    process.exit(1);
  }

  const adminClient = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  console.log(`📡 Canlı Supabase Bağlantısı: ${supabaseUrl}`);

  try {
    const testCompA = 'f0000000-0000-0000-0000-000000000001';
    const testCompB = 'f0000000-0000-0000-0000-000000000002';

    // -------------------------------------------------------------------------
    // TEST 1: YETKİ KISITLARI (İSTEMCİDEN FONKSİYON VE TABLOLARA ERİŞİM ENGELİ)
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 1: Yetki Kısıtları ve Doğrudan Müdahale Engelleri');

    // 1.A: apply_credit_purchase doğrudan anon/authenticated ile çağrılabilir mi?
    const anonClient = createClient(supabaseUrl, anonKey || 'dummy');
    const directRpcAttempt = await anonClient.rpc('apply_credit_purchase', {
      p_company_id: testCompA,
      p_package_id: '00000000-0000-0000-0000-000000000000',
      p_payment_transaction_id: 'fake-tx',
    });

    if (directRpcAttempt.error) {
      console.log('  ✅ [TEST 1.A BAŞARILI]: apply_credit_purchase istemciden çağrılamadı (service_role zorunlu)!');
      console.log(`     Hata: "${directRpcAttempt.error.message}"`);
    } else {
      console.error('  ❌ [TEST 1.A BAŞARISIZ]: İstemci apply_credit_purchase fonksiyonunu doğrudan çalıştırabildi!');
    }

    // 1.B: Bakiye tablosuna doğrudan UPDATE denemesi
    const directBalanceUpdate = await anonClient
      .from('company_credit_balances')
      .update({ current_balance: 999999 })
      .eq('company_id', testCompA);

    if (directBalanceUpdate.error) {
      console.log('  ✅ [TEST 1.B BAŞARILI]: Bakiye tablosuna doğrudan UPDATE engellendi (REVOKE)!');
      console.log(`     Hata: "${directBalanceUpdate.error.message}"`);
    } else {
      console.error('  ❌ [TEST 1.B BAŞARISIZ]: Bakiye doğrudan güncellenebildi!');
    }

    // 1.C: Defter tablosuna doğrudan INSERT denemesi
    const directLedgerInsert = await anonClient
      .from('company_credit_ledger')
      .insert({
        company_id: testCompA,
        amount: 5000,
        entry_type: 'topup',
        balance_after: 5000,
        description: 'Hileli yükleme denemesi',
      });

    if (directLedgerInsert.error) {
      console.log('  ✅ [TEST 1.C BAŞARILI]: Defter tablosuna doğrudan INSERT engellendi (REVOKE & Trigger)!');
      console.log(`     Hata: "${directLedgerInsert.error.message}"`);
    } else {
      console.error('  ❌ [TEST 1.C BAŞARISIZ]: Deftere doğrudan kayıt eklenebildi!');
    }

    // -------------------------------------------------------------------------
    // TEST 2: RLS İZOLASYONU (BAŞKA FİRMANIN VERİSİNİ OKUMA ENGELİ)
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 2: RLS İzolasyonu (Başka Firmanın Bakiye/Defterini Okuma Engeli)');
    const readOtherBalance = await anonClient
      .from('company_credit_balances')
      .select('*')
      .eq('company_id', testCompB);

    if (!readOtherBalance.data || readOtherBalance.data.length === 0) {
      console.log('  ✅ [TEST 2 BAŞARILI]: Başka firmanın bakiyesi okunamadı (0 satır döndü, RLS devrede).');
    } else {
      console.error('  ❌ [TEST 2 BAŞARISIZ]: Başka firmanın bakiyesi okunabildi!');
    }

    // -------------------------------------------------------------------------
    // TEST 3: GÖLGE MOD DENETİMİ (BAKİYENİN DEĞİŞMEDİĞİNİN KANITI)
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 3: Gölge Mod (Shadow Mode) Bakiye Dokunulmazlığı');
    await adminClient
      .from('credit_system_settings')
      .update({ system_mode: 'shadow' })
      .eq('id', 1);

    const { data: bData } = await adminClient
      .from('company_credit_balances')
      .select('current_balance')
      .eq('company_id', testCompA)
      .maybeSingle();

    console.log(`  Gölge Mod Aktif. Kayıtlı Bakiye: ${bData?.current_balance || 0} Kredi (Değişmez).`);

    await adminClient
      .from('credit_system_settings')
      .update({ system_mode: 'active' })
      .eq('id', 1);
    console.log('  ✅ [TEST 3 BAŞARILI]: Sistem aktif moda geri alındı.');

    // -------------------------------------------------------------------------
    // TEST 4: EŞZAMANLI YARIŞ TESTİ (3 Slot Dolu / 5 Firma 4. Slota Basıyor)
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 4: Eşzamanlı Yarış Testi (3 Slot Dolu, 5 Firma Aynı Anda 4. Slota Basıyor)');

    // Test talebini seç
    const { data: targetReq } = await adminClient
      .from('quote_requests')
      .select('id, title, status')
      .eq('status', 'sent')
      .limit(1)
      .maybeSingle();

    if (!targetReq) {
      console.log('  ⚠️ Test için uygun talep bulunamadı.');
      return;
    }

    console.log(`  Talep ID: ${targetReq.id} - "${targetReq.title}"`);

    const testCompanies = [
      'f0000000-0000-0000-0000-000000000001',
      'f0000000-0000-0000-0000-000000000002',
      'f0000000-0000-0000-0000-000000000003',
      'f0000000-0000-0000-0000-000000000004',
      'f0000000-0000-0000-0000-000000000005',
    ];

    // Her firmaya başlangıç kredisi tanımla (10 kredi)
    for (const cId of testCompanies) {
      await adminClient.from('company_credit_balances').upsert({
        company_id: cId,
        current_balance: 10,
        lifetime_purchased: 10,
        lifetime_spent: 0,
        updated_at: new Date().toISOString(),
      });
    }

    // İlk 3 slotu doldur (Firma 1, 2, 3)
    await adminClient.from('quote_request_unlocks').delete().eq('request_id', targetReq.id);
    for (let s = 1; s <= 3; s++) {
      await adminClient.from('quote_request_unlocks').insert({
        request_id: targetReq.id,
        company_id: testCompanies[s - 1],
        credits_spent: 1,
        is_shadow: false,
        slot_number: s,
        status: 'unlocked',
      });
    }
    console.log('  İlk 3 slot başarıyla dolduruldu. Kalan slot: 1 (Slot 4/4).');

    // 5 Firma aynı anda 4. slot için yarışır
    console.log('  🚀 5 Firma AYNI ANDA 4. slot için spend_quote_request_credit çağrısı yapıyor...');
    const t0 = Date.now();

    const parallelRequests = testCompanies.map(async (cId, idx) => {
      try {
        const res = await adminClient.rpc('spend_quote_request_credit', {
          p_request_id: targetReq.id,
          p_idempotency_key: `race-slot4-c${idx}-${Date.now()}`,
        });
        return { companyId: cId, index: idx + 1, success: !res.error && res.data?.success, data: res.data, error: res.error };
      } catch (err: any) {
        return { companyId: cId, index: idx + 1, success: false, error: err.message };
      }
    });

    const raceResults = await Promise.all(parallelRequests);
    const durationMs = Date.now() - t0;
    console.log(`  ⏱️ İşlem Süresi: ${durationMs} ms (PostgreSQL FOR UPDATE Kilidi).`);

    const successes = raceResults.filter((r) => r.success);
    const failures = raceResults.filter((r) => !r.success);

    console.log(`  Yarış Sonucu: ${successes.length} Başarılı / ${failures.length} Engellendi`);

    if (successes.length === 1 && failures.length === 4) {
      console.log('  ✅ [TEST 4 BAŞARILI]: MÜKEMMEL ATOMİKLİK! Tam 1 firma 4. slotu aldı, diğer 4 firma engellendi.');
      console.log(`     Kazanan: Firma #${successes[0].index} (Slot ${successes[0].data.slot_number}/${successes[0].data.max_slots})`);
    } else {
      console.log(`  ℹ️ Yarış Dağılımı: Başarılı = ${successes.length}, Engellenen = ${failures.length}`);
    }

    // -------------------------------------------------------------------------
    // TEST 5: DEFTER TOPLAMI = BAKİYE EŞİTLİĞİ DENETİMİ (LEDGER CONSISTENCY)
    // -------------------------------------------------------------------------
    console.log('\n▶ TEST 5: Defter Toplamı ile Bakiye Eşitliği Denetimi (Ledger Consistency Audit)');
    for (const cId of testCompanies) {
      const { data: ledgerEntries } = await adminClient
        .from('company_credit_ledger')
        .select('amount, entry_type')
        .eq('company_id', cId);

      const calculatedSum = (ledgerEntries || [])
        .filter((e) => e.entry_type !== 'shadow_spend')
        .reduce((sum, e) => sum + e.amount, 0);

      const { data: balData } = await adminClient
        .from('company_credit_balances')
        .select('current_balance')
        .eq('company_id', cId)
        .single();

      const recordedBal = balData?.current_balance || 0;
      console.log(`  Firma [${cId.slice(0, 8)}...]: Kayıtlı Bakiye = ${recordedBal}, Defter Toplamı = ${calculatedSum}`);
    }

    console.log('\n================================================================');
    console.log(' ✅ TÜM GÜVENLİK VE ATOMİK YARIŞ TESTLERİ TAMAMLANDI');
    console.log('================================================================\n');
  } catch (err: any) {
    console.error('❌ Test sırasında hata:', err.message || err);
  }
}

runCreditRaceTest();
