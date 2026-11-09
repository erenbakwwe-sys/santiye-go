-- ==============================================================================
-- ŞANTİYE GO – SUPABASE SQL EDITOR ESCROW & RLS DOĞRULAMA TEST SUITE
-- ==============================================================================
-- Bu betik Supabase SQL Editor'de tek seferde çalıştırılabilir.
-- Tüm testler tek bir TRANSACTION içinde koşar ve en sonda ROLLBACK yapılır;
-- veritabanınızda kesinlikle test çöpü (pollution) bırakmaz.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. GEÇİCİ SONUÇ TABLOSU
-- ------------------------------------------------------------------------------
CREATE TEMP TABLE _test_results (
    test_no INT,
    test_name TEXT,
    status TEXT, -- 'PASS' veya 'FAIL'
    details TEXT
);

-- ------------------------------------------------------------------------------
-- 2. TEST ORTAMI VE KULLANICILARIN HAZIRLANMASI (SERVICE_ROLE İLE)
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_buyer_a UUID := 'a0000000-0000-0000-0000-000000000001';
    v_buyer_b UUID := 'b0000000-0000-0000-0000-000000000002';
    v_seller_user UUID := 'c0000000-0000-0000-0000-000000000003';
    v_admin_user UUID := 'd0000000-0000-0000-0000-000000000004';
    v_company_id UUID := 'e0000000-0000-0000-0000-000000000005';
    v_payment_id UUID := 'f0000000-0000-0000-0000-000000000006';

    v_count INT;
    v_test_err TEXT;
    v_rpc_res JSONB;
    v_pay_status TEXT;
    v_buyer_approved BOOLEAN;
BEGIN
    -- Profilleri oluştur
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES 
        (v_buyer_a, 'alici_a@test.com', 'Alıcı A (Yetkili Alıcı)', 'individual'),
        (v_buyer_b, 'alici_b@test.com', 'Alıcı B (Yabancı Alıcı)', 'individual'),
        (v_seller_user, 'satici@test.com', 'Satıcı Yetkili', 'corporate'),
        (v_admin_user, 'admin@test.com', 'Sistem Yöneticisi', 'admin')
    ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role;

    -- Şirketi oluştur
    INSERT INTO public.companies (id, user_id, name, verification_status)
    VALUES (v_company_id, v_seller_user, 'Anadolu İş Makineleri A.Ş.', 'verified')
    ON CONFLICT (id) DO NOTHING;

    -- Test ödeme kaydı oluştur (Escrow: paid_held)
    INSERT INTO public.payment_transactions (
        id,
        user_id,
        company_id,
        amount_cents,
        commission_rate_percent,
        commission_amount_cents,
        net_company_amount_cents,
        escrow_status,
        buyer_approved,
        iyzico_item_id,
        sub_merchant_key
    ) VALUES (
        v_payment_id,
        v_buyer_a,
        v_company_id,
        5000000, -- 50.000,00 TL
        8.0,
        400000,
        4600000,
        'paid_held',
        false,
        'item-test-001',
        'subm-test-001'
    ) ON CONFLICT (id) DO UPDATE SET escrow_status = 'paid_held', buyer_approved = false;

    -- ==========================================================================
    -- TEST 1: FİRMA KENDİ ÖDEMESİNİ SERBEST BIRAKAMAZ
    -- ==========================================================================
    BEGIN
        -- Firma kullanıcısı (v_seller_user) kimliğiyle dene
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_seller_user::text, 'role', 'authenticated')::text, true);

        -- Alıcı onaylama RPC'sini çağırmaya çalış
        SELECT public.buyer_approve_escrow(v_payment_id) INTO v_rpc_res;

        IF (v_rpc_res->>'success')::boolean = true THEN
            INSERT INTO _test_results VALUES (1, 'Firma Kendi Ödemesini Serbest Bırakamaz', 'FAIL', 'Firma kendi lehine olan emanet ödemeyi onaylayabildi! Güvenlik açığı.');
        ELSE
            INSERT INTO _test_results VALUES (1, 'Firma Kendi Ödemesini Serbest Bırakamaz', 'PASS', 'Firma onayı reddedildi: ' || COALESCE(v_rpc_res->>'error', 'Yetkisiz erişim'));
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO _test_results VALUES (1, 'Firma Kendi Ödemesini Serbest Bırakamaz', 'PASS', 'Beklendiği gibi yetki hatası fırlatıldı: ' || SQLERRM);
    END;

    -- ==========================================================================
    -- TEST 2: ALICI BAŞKASININ ÖDEMESİNİ GÖREMEZ (RLS İZOLASYONU)
    -- ==========================================================================
    BEGIN
        -- Alıcı B (v_buyer_b) kimliğiyle Alıcı A'nın ödemesini sorgula
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_buyer_b::text, 'role', 'authenticated')::text, true);

        SELECT COUNT(*) INTO v_count
        FROM public.payment_transactions
        WHERE id = v_payment_id;

        IF v_count = 0 THEN
            INSERT INTO _test_results VALUES (2, 'Alıcı Başkasının Ödemesini Göremez (RLS)', 'PASS', 'Yabancı alıcı ödeme satırını göremedi (Dönen satır: 0).');
        ELSE
            INSERT INTO _test_results VALUES (2, 'Alıcı Başkasının Ödemesini Göremez (RLS)', 'FAIL', 'Yabancı alıcı başkasının ödeme kaydını okuyabildi! RLS ihlali.');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO _test_results VALUES (2, 'Alıcı Başkasının Ödemesini Göremez (RLS)', 'PASS', 'Erişim RLS ile engellendi: ' || SQLERRM);
    END;

    -- ==========================================================================
    -- TEST 3: İSTEMCİ DURUM VEYA TUTAR DEĞİŞTİREMEZ (DIRECT UPDATE DENIED)
    -- ==========================================================================
    BEGIN
        -- Alıcı A (v_buyer_a) doğrudan SQL UPDATE denesin
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_buyer_a::text, 'role', 'authenticated')::text, true);

        UPDATE public.payment_transactions
        SET amount_cents = 100, escrow_status = 'transferred'
        WHERE id = v_payment_id;

        -- Eğer hata atmadıysa bile etkilenen satır 0 olmalı (WITH CHECK / RLS)
        GET DIAGNOSTICS v_count = ROW_COUNT;
        IF v_count = 0 THEN
            INSERT INTO _test_results VALUES (3, 'İstemciden Tutar/Durum Değiştirilemez', 'PASS', 'Doğrudan UPDATE engellendi (0 satır güncellendi).');
        ELSE
            INSERT INTO _test_results VALUES (3, 'İstemciden Tutar/Durum Değiştirilemez', 'FAIL', 'İstemci ödeme durumunu ve tutarını doğrudan güncelleyebildi!');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO _test_results VALUES (3, 'İstemciden Tutar/Durum Değiştirilemez', 'PASS', 'Doğrudan UPDATE yetkisi reddedildi: ' || SQLERRM);
    END;

    -- ==========================================================================
    -- TEST 4: PARA HAREKETİ RPC''LERİ ANON / AUTHENTICATED ROLÜNE KAPALIDIR
    -- ==========================================================================
    BEGIN
        -- Anon veya Authenticated doğrudan execute_escrow_payout çağıramamalıdır
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_buyer_a::text, 'role', 'authenticated')::text, true);

        SELECT public.execute_escrow_payout(v_payment_id, 'fake-transfer-id') INTO v_rpc_res;
        INSERT INTO _test_results VALUES (4, 'Para Hareketi RPC''leri İstemciye Kapalı', 'FAIL', 'execute_escrow_payout authenticated rolü tarafından çalıştırılabildi!');
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO _test_results VALUES (4, 'Para Hareketi RPC''leri İstemciye Kapalı', 'PASS', 'execute_escrow_payout çalıştırma yetkisi (EXECUTE) engellendi: ' || SQLERRM);
    END;

    -- ==========================================================================
    -- TEST 5: ALICI ONAYI VE DOĞRU DURUM GEÇİŞİ (RELEASABLE & BUYER_APPROVED = TRUE)
    -- ==========================================================================
    BEGIN
        -- Gerçek Alıcı A (v_buyer_a) teslimatı onaylar
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims', json_build_object('sub', v_buyer_a::text, 'role', 'authenticated')::text, true);

        SELECT public.buyer_approve_escrow(v_payment_id) INTO v_rpc_res;

        -- Service role olarak sonucu doğrula
        PERFORM set_config('role', 'service_role', true);
        SELECT escrow_status, buyer_approved INTO v_pay_status, v_buyer_approved
        FROM public.payment_transactions WHERE id = v_payment_id;

        IF v_pay_status = 'releasable' AND v_buyer_approved = true THEN
            INSERT INTO _test_results VALUES (5, 'Alıcı Onayı Doğru Durumu Üretiyor', 'PASS', 'Ödeme releasable oldu ve buyer_approved = true olarak mühürlendi.');
        ELSE
            INSERT INTO _test_results VALUES (5, 'Alıcı Onayı Doğru Durumu Üretiyor', 'FAIL', 'Durum: ' || COALESCE(v_pay_status, 'NULL') || ', buyer_approved: ' || COALESCE(v_buyer_approved::text, 'NULL'));
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO _test_results VALUES (5, 'Alıcı Onayı Doğru Durumu Üretiyor', 'FAIL', 'Hata: ' || SQLERRM);
    END;

    -- ==========================================================================
    -- TEST 6: AYNI ÖDEME İKİ KEZ SERBEST BIRAKILAMAZ (İDEMPOTENCY & ÇİFT AKTARIM ENGELİ)
    -- ==========================================================================
    BEGIN
        PERFORM set_config('role', 'service_role', true);

        -- İlk aktarımı simüle et
        SELECT public.execute_escrow_payout(v_payment_id, 'iyzi-tx-first-001') INTO v_rpc_res;

        -- İkinci kez aynı ödemeyi aktarmayı dene
        SELECT public.execute_escrow_payout(v_payment_id, 'iyzi-tx-second-002') INTO v_rpc_res;

        IF (v_rpc_res->>'success')::boolean = false THEN
            INSERT INTO _test_results VALUES (6, 'Aynı Ödeme İki Kez Serbest Bırakılamaz', 'PASS', 'İkinci aktarım denemesi engellendi: ' || (v_rpc_res->>'error'));
        ELSE
            INSERT INTO _test_results VALUES (6, 'Aynı Ödeme İki Kez Serbest Bırakılamaz', 'FAIL', 'Aynı işlem ikinci kez aktarıldı! Mükerrer ödeme riski.');
        END IF;
    EXCEPTION WHEN OTHERS THEN
        INSERT INTO _test_results VALUES (6, 'Aynı Ödeme İki Kez Serbest Bırakılamaz', 'PASS', 'İkinci aktarım istisna ile durduruldu: ' || SQLERRM);
    END;

END $$;

-- ------------------------------------------------------------------------------
-- 3. TEK SONUÇ KÜMESİ ÇIKTISI (PASS / FAIL)
-- ------------------------------------------------------------------------------
SELECT 
    test_no AS "No",
    test_name AS "Test Adı",
    status AS "Durum",
    details AS "Detay / Çıktı"
FROM _test_results
ORDER BY test_no;

-- ------------------------------------------------------------------------------
-- 4. VERİTABANINDA SIFIR ARTIK (ROLLBACK)
-- ------------------------------------------------------------------------------
ROLLBACK;
