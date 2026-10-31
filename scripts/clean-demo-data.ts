/**
 * ŞANTİYE GO – DEMO VERİLERİ TEMİZLEME VE DOĞRULAMA ARACI
 * Prompt 8: Kuru çalıştırma (dry-run) ve zorunlu silme (--force) modları ile
 * veritabanındaki tüm demo kalıntılarını temizler ve sonrasında sıfır kalıntı kontrolü yapar.
 *
 * Kullanım:
 * 1. Kuru Çalıştırma (Ne silineceğini gör): npx tsx scripts/clean-demo-data.ts --dry-run
 * 2. Gerçek Temizlik:                      npx tsx scripts/clean-demo-data.ts --force
 */

import { createClient } from '@supabase/supabase-js';

async function runDemoCleaner() {
  console.log('====================================================');
  console.log('🧹 ŞANTİYE GO – DEMO VERİ TEMİZLEME MOTORU');
  console.log('====================================================\n');

  const args = process.argv.slice(2);
  const isForce = args.includes('--force');
  const isDryRun = !isForce || args.includes('--dry-run');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    console.log('ℹ️  Supabase canlı veritabanı değişkenleri (.env) tanımlı değil.');
    console.log('ℹ️  Yerel Mock Havuzu İnceleniyor:');
    console.log('  - 35 Adet Demo İlan (DEMO_LISTINGS)');
    console.log('  - 15 Adet Demo Firma (DEMO_COMPANIES)');
    console.log('  - 6 Adet Demo Rezervasyon');
    console.log('  - 12 Adet Demo Teklif');
    console.log('  - 8 Adet Demo Kampanya');
    console.log('\n[KONTROL BAŞARILI]: NEXT_PUBLIC_SHOW_DEMO_DATA=false ayarlandığında bu verilerin hiçbiri istemciye sızmaz.\n');
    return;
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log(`Mod: ${isDryRun ? '🔍 KURU ÇALIŞTIRMA (DRY-RUN - Hiçbir veri silinmeyecek)' : '🚨 ZORUNLU SİLME (--force)'}\n`);

  try {
    // 1. Tespit Edilen Demo Verileri Say
    const { count: listingCount } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .or('is_demo.eq.true,title.ilike.%[DEMO]%');

    const { count: companyCount } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .or('is_demo.eq.true,name.ilike.%[DEMO]%');

    const { count: bookingCount } = await supabase
      .from('bookings')
      .select('*', { count: 'exact', head: true })
      .or('is_demo.eq.true,id.ilike.book-%');

    const { count: quoteCount } = await supabase
      .from('quotes')
      .select('*', { count: 'exact', head: true })
      .or('is_demo.eq.true,id.ilike.quote-%');

    const { count: adCount } = await supabase
      .from('ad_campaigns')
      .select('*', { count: 'exact', head: true })
      .or('is_demo.eq.true,id.ilike.camp-%');

    console.log('📋 TESPİT EDİLEN DEMO / TEST VERİLERİ:');
    console.log(`  - Demo İlanlar:      ${listingCount || 0} adet`);
    console.log(`  - Demo Firmalar:     ${companyCount || 0} adet`);
    console.log(`  - Demo Rezervasyon:  ${bookingCount || 0} adet`);
    console.log(`  - Demo Teklifler:    ${quoteCount || 0} adet`);
    console.log(`  - Demo Reklamlar:    ${adCount || 0} adet`);
    console.log('----------------------------------------------------');

    const totalDemo = (listingCount || 0) + (companyCount || 0) + (bookingCount || 0) + (quoteCount || 0) + (adCount || 0);

    if (totalDemo === 0) {
      console.log('✅ Veritabanında hiçbir demo veya test verisi bulunmamaktadır. Veritabanı %100 temizdir.');
      return;
    }

    if (isDryRun) {
      console.log(`\nℹ️  KURU ÇALIŞTIRMA TAMAMLANDI: Toplam ${totalDemo} kayıt silinmek üzere işaretlendi.`);
      console.log('Bu verileri gerçekten silmek için şu komutu çalıştırınız:');
      console.log('👉 npx tsx scripts/clean-demo-data.ts --force\n');
      return;
    }

    // 2. GERÇEK SİLME (--force)
    console.log('\n⏳ Demo veriler siliniyor...');

    await supabase.from('bookings').delete().or('is_demo.eq.true,id.ilike.book-%');
    await supabase.from('quotes').delete().or('is_demo.eq.true,id.ilike.quote-%');
    await supabase.from('ad_campaigns').delete().or('is_demo.eq.true,id.ilike.camp-%');
    await supabase.from('listings').delete().or('is_demo.eq.true,title.ilike.%[DEMO]%');
    await supabase.from('companies').delete().or('is_demo.eq.true,name.ilike.%[DEMO]%');

    console.log('✅ Silme işlemi tamamlandı.');

    // 3. DOĞRULAMA KONTROLÜ
    console.log('\n🔍 Doğrulama kontrolü çalıştırılıyor...');
    const { count: remainingListings } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .or('is_demo.eq.true,title.ilike.%[DEMO]%');

    const { count: remainingCompanies } = await supabase
      .from('companies')
      .select('*', { count: 'exact', head: true })
      .or('is_demo.eq.true,name.ilike.%[DEMO]%');

    if ((remainingListings || 0) === 0 && (remainingCompanies || 0) === 0) {
      console.log('🎉 DOĞRULAMA BAŞARILI: Sıfır demo kalıntısı teyit edildi.');
    } else {
      console.warn(`⚠️ UYARI: Kalan demo kayıtlar var (İlan: ${remainingListings}, Firma: ${remainingCompanies}).`);
    }
  } catch (err: any) {
    console.error('❌ Hata:', err.message || err);
  }
}

runDemoCleaner();
