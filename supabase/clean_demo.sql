-- ==============================================================================
-- ŞANTİYE GO – DEMO VERİLERİ TEMİZLEME BETİĞİ (TEK KOMUTLA TÜM DEMOLARI SİLER)
-- Bu betik 'is_demo = true' olarak işaretlenmiş tüm kayıtları sistemden siler.
-- ==============================================================================

-- Prompt 5: Reklam, Öne Çıkarma & Analitik demo verileri
DELETE FROM ad_campaigns WHERE is_demo = true;
DELETE FROM analytics_daily_summary WHERE target_id LIKE '%000000000001%';
DELETE FROM analytics_events WHERE session_hash LIKE 'hash-demo-%';

-- Prompt 4: Yönetim, Ödeme, Komisyon & Üyelik demo verileri
DELETE FROM admin_audit_logs WHERE target_id LIKE '%000000000001%' OR admin_email = 'eren@santiyego.com';
DELETE FROM payment_transactions WHERE is_demo = true;
DELETE FROM company_subscriptions WHERE id LIKE 'sub-%';
DELETE FROM admin_users WHERE id = 'admin-super-001';

DELETE FROM reviews WHERE is_demo = true;
DELETE FROM bookings WHERE is_demo = true;
DELETE FROM availability_calendar WHERE notes LIKE '%[DEMO]%' OR notes LIKE '%Önceden%' OR notes LIKE '%Periyodik%';
DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE is_demo = true);
DELETE FROM conversations WHERE is_demo = true;
DELETE FROM quotes WHERE is_demo = true;
DELETE FROM quote_requests WHERE is_demo = true;
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
