-- ==============================================================================
-- ŞANTİYE GO – CANLIYA GEÇİŞ DEMO VERİ TEMİZLEME VE DOĞRULAMA BETİĞİ
-- Bu betik tek komutla çalıştırılır; tüm demo/test kayıtlarını siler ve
-- kalan kayıt sayılarını denetleyerek tam temizliği doğrular.
-- ==============================================================================

BEGIN;

-- 1. Reklam ve Analitik Demo Verilerini Temizle
DELETE FROM ad_campaigns WHERE is_demo = true;
DELETE FROM analytics_daily_summary WHERE target_id LIKE '%000000000001%';
DELETE FROM analytics_events WHERE session_hash LIKE 'hash-demo-%' OR session_hash LIKE 'sg_demo_%';

-- 2. Yönetim, Ödeme, Komisyon ve Üyelik Demo Verilerini Temizle
DELETE FROM admin_audit_logs WHERE target_id LIKE '%000000000001%' OR admin_email = 'eren@santiyego.com';
DELETE FROM payment_transactions WHERE is_demo = true;
DELETE FROM company_subscriptions WHERE id LIKE 'sub-%';
DELETE FROM admin_users WHERE id = 'admin-super-001';

-- 3. Puanlama, Rezervasyon, Takvim, Mesajlaşma ve Teklif Demo Verilerini Temizle
DELETE FROM reviews WHERE is_demo = true;
DELETE FROM bookings WHERE is_demo = true;
DELETE FROM listing_availability WHERE notes LIKE '%[DEMO]%' OR notes LIKE '%Önceden%' OR notes LIKE '%Periyodik%';
DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE is_demo = true);
DELETE FROM conversations WHERE is_demo = true;
DELETE FROM quotes WHERE is_demo = true;
DELETE FROM quote_requests WHERE is_demo = true;

-- 4. İlanlar, Firmalar ve Demo Profilleri Temizle
DELETE FROM listings WHERE is_demo = true;
DELETE FROM companies WHERE is_demo = true;
DELETE FROM profiles WHERE id IN (
    'e0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000006',
    'e0000000-0000-0000-0000-000000000007',
    'buyer-demo-001',
    'buyer-demo-002'
);

COMMIT;

-- 5. DOĞRULAMA RAPORU (TÜM DEĞERLER 0 OLMALIDIR)
SELECT 'listings_remaining' AS tablo_kontrol, COUNT(*) AS kalan_sayi FROM listings WHERE is_demo = true
UNION ALL
SELECT 'companies_remaining', COUNT(*) FROM companies WHERE is_demo = true
UNION ALL
SELECT 'quote_requests_remaining', COUNT(*) FROM quote_requests WHERE is_demo = true
UNION ALL
SELECT 'quotes_remaining', COUNT(*) FROM quotes WHERE is_demo = true
UNION ALL
SELECT 'bookings_remaining', COUNT(*) FROM bookings WHERE is_demo = true
UNION ALL
SELECT 'payments_remaining', COUNT(*) FROM payment_transactions WHERE is_demo = true
UNION ALL
SELECT 'ad_campaigns_remaining', COUNT(*) FROM ad_campaigns WHERE is_demo = true;
