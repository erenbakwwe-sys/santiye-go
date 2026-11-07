-- ==============================================================================
-- ŞANTİYE GO – MIGRATION 10: AUTO CREATE PROFILES & COMPANIES TRIGGER
-- Kullanıcı kaydolduğunda profiles ve companies kayıtlarını otomatik ve yetki
-- sorunu yaşamadan (SECURITY DEFINER) oluşturan PostgreSQL tetikleyicisi.
-- ==============================================================================

-- 1. YENİ KULLANICI TETİKLEYİCİ FONKSİYONU
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_raw_role TEXT;
    v_role public.user_role;
    v_full_name TEXT;
    v_phone TEXT;
    v_company_name TEXT;
    v_tax_number TEXT;
    v_tax_office TEXT;
    v_city_id INT;
    v_district_id INT;
BEGIN
    -- Rolü belirle ('company', 'buyer', 'admin', 'super_admin')
    v_raw_role := COALESCE(new.raw_user_meta_data->>'role', 'buyer');
    IF v_raw_role NOT IN ('buyer', 'company', 'admin', 'super_admin') THEN
        v_raw_role := 'buyer';
    END IF;
    v_role := v_raw_role::public.user_role;

    v_full_name := COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
    v_phone := new.raw_user_meta_data->>'phone';
    v_company_name := new.raw_user_meta_data->>'company_name';
    v_tax_number := new.raw_user_meta_data->>'tax_number';
    v_tax_office := new.raw_user_meta_data->>'tax_office';

    BEGIN
        v_city_id := (new.raw_user_meta_data->>'city_id')::INT;
    EXCEPTION WHEN OTHERS THEN
        v_city_id := NULL;
    END;

    BEGIN
        v_district_id := (new.raw_user_meta_data->>'district_id')::INT;
    EXCEPTION WHEN OTHERS THEN
        v_district_id := NULL;
    END;

    -- 1. Profiles tablosuna ekle / güncelle
    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        phone,
        kvkk_accepted_at,
        kvkk_version,
        is_email_verified,
        is_phone_verified
    ) VALUES (
        new.id,
        v_role,
        v_full_name,
        v_phone,
        NOW(),
        'v1.0',
        (new.email_confirmed_at IS NOT NULL),
        (new.phone_confirmed_at IS NOT NULL)
    )
    ON CONFLICT (id) DO UPDATE
    SET
        role = CASE 
            WHEN public.profiles.role IN ('admin', 'super_admin') THEN public.profiles.role 
            ELSE EXCLUDED.role 
        END,
        full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
        phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
        is_email_verified = CASE WHEN new.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_email_verified END;

    -- 2. Eğer rol 'company' ise companies tablosuna ekle
    IF v_role = 'company' THEN
        INSERT INTO public.companies (
            user_id,
            name,
            tax_number,
            tax_office,
            phone,
            city_id,
            district_id,
            is_verified,
            is_demo
        ) VALUES (
            new.id,
            COALESCE(v_company_name, v_full_name, 'Firma Hesabı'),
            v_tax_number,
            v_tax_office,
            COALESCE(v_phone, ''),
            v_city_id,
            v_district_id,
            false,
            false
        )
        ON CONFLICT (user_id) DO UPDATE
        SET
            name = COALESCE(EXCLUDED.name, public.companies.name),
            tax_number = COALESCE(EXCLUDED.tax_number, public.companies.tax_number),
            tax_office = COALESCE(EXCLUDED.tax_office, public.companies.tax_office);
    END IF;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. AUTH.USERS TETİKLEYİCİSİ
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. MEVCUT KULLANICILARI GERİYE DÖNÜK DÜZELTME (BACKFILL)
DO $$
DECLARE
    r RECORD;
    v_raw_role TEXT;
    v_role public.user_role;
BEGIN
    FOR r IN SELECT * FROM auth.users LOOP
        v_raw_role := COALESCE(r.raw_user_meta_data->>'role', 'buyer');
        IF v_raw_role NOT IN ('buyer', 'company', 'admin', 'super_admin') THEN
            v_raw_role := 'buyer';
        END IF;
        v_role := v_raw_role::public.user_role;

        -- Profiles tablosunu güncelle veya oluştur
        INSERT INTO public.profiles (
            id,
            role,
            full_name,
            phone,
            kvkk_accepted_at,
            kvkk_version,
            is_email_verified,
            is_phone_verified
        )
        VALUES (
            r.id,
            v_role,
            COALESCE(r.raw_user_meta_data->>'full_name', split_part(r.email, '@', 1)),
            r.raw_user_meta_data->>'phone',
            NOW(),
            'v1.0',
            (r.email_confirmed_at IS NOT NULL),
            (r.phone_confirmed_at IS NOT NULL)
        )
        ON CONFLICT (id) DO UPDATE
        SET
            role = CASE 
                WHEN public.profiles.role IN ('admin', 'super_admin') THEN public.profiles.role 
                ELSE EXCLUDED.role 
            END,
            full_name = COALESCE(public.profiles.full_name, EXCLUDED.full_name),
            phone = COALESCE(public.profiles.phone, EXCLUDED.phone),
            is_email_verified = CASE WHEN r.email_confirmed_at IS NOT NULL THEN true ELSE public.profiles.is_email_verified END;

        -- Eğer firma ise companies tablosuna ekle
        IF v_role = 'company' THEN
            INSERT INTO public.companies (
                user_id,
                name,
                tax_number,
                tax_office,
                phone,
                city_id,
                district_id,
                is_verified,
                is_demo
            )
            VALUES (
                r.id,
                COALESCE(r.raw_user_meta_data->>'company_name', r.raw_user_meta_data->>'full_name', split_part(r.email, '@', 1)),
                r.raw_user_meta_data->>'tax_number',
                r.raw_user_meta_data->>'tax_office',
                COALESCE(r.raw_user_meta_data->>'phone', ''),
                CASE WHEN (r.raw_user_meta_data->>'city_id') ~ '^[0-9]+$' THEN (r.raw_user_meta_data->>'city_id')::INT ELSE NULL END,
                CASE WHEN (r.raw_user_meta_data->>'district_id') ~ '^[0-9]+$' THEN (r.raw_user_meta_data->>'district_id')::INT ELSE NULL END,
                false,
                false
            )
            ON CONFLICT (user_id) DO NOTHING;
        END IF;
    END LOOP;
END $$;
