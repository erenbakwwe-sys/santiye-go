-- KREDİ BAKİYESİ KORUMASI TESTİ (migration 41)
-- Boş bir yerel Postgres'te çalışır; Supabase rollerini taklit eder.
-- Çalıştırma: psql -v ON_ERROR_STOP=1 -d <bos_veritabani> -f supabase/tests/credit_guard_test.sql
\set ON_ERROR_STOP 1
SET client_min_messages = warning;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE TABLE public.companies (id int PRIMARY KEY, name text, credit_balance int DEFAULT 0);
CREATE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE AS
  $$ SELECT COALESCE(current_setting('test.admin', true), '') = 'evet' $$;
-- Sunucu tarafı kredi yükleme fonksiyonunu taklit eder (SECURITY DEFINER)
CREATE FUNCTION public.fake_grant(p_id int, p_amount int) RETURNS void LANGUAGE sql SECURITY DEFINER AS
  $$ UPDATE public.companies SET credit_balance = credit_balance + p_amount WHERE id = p_id $$;
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, anon, service_role;

\if :{?skip_migration}
\else
\i supabase/migrations/41_company_credit_guard.sql
\i supabase/migrations/41_company_credit_guard.sql
\endif

CREATE FUNCTION public.t_assert(p_ok boolean, p_name text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF p_ok IS NOT TRUE THEN RAISE EXCEPTION 'BASARISIZ: %', p_name; END IF;
  RAISE WARNING 'GECTI: %', p_name;
END $$;
-- Bir komutun hata verip vermediğini döndürür (çağıranın rolüyle çalışır)
CREATE FUNCTION public.t_fails(p_sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE p_sql; RETURN false;
EXCEPTION WHEN insufficient_privilege THEN RETURN true;
END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO PUBLIC;

-- 1) Yeni firma krediyle açılamaz
SET ROLE authenticated;
INSERT INTO public.companies (id, name, credit_balance) VALUES (1, 'Firma', 500);
RESET ROLE;
SELECT public.t_assert((SELECT credit_balance = 0 FROM public.companies WHERE id = 1), 'yeni firma krediyle acilamaz');

-- 2) Firma tarayıcıdan bakiyesini artıramaz
SET ROLE authenticated;
SELECT public.t_fails('UPDATE public.companies SET credit_balance = 9999 WHERE id = 1') AS engellendi \gset
RESET ROLE;
SELECT public.t_assert(:'engellendi'::boolean AND (SELECT credit_balance = 0 FROM public.companies WHERE id = 1),
  'firma kredi bakiyesini artiramaz');

-- 3) Sunucu (service_role) ve SECURITY DEFINER fonksiyon kredi yükleyebilir
SET ROLE service_role;
UPDATE public.companies SET credit_balance = 10 WHERE id = 1;
RESET ROLE;
SET ROLE authenticated;
SELECT public.fake_grant(1, 5);
RESET ROLE;
SELECT public.t_assert((SELECT credit_balance = 15 FROM public.companies WHERE id = 1),
  'sunucu ve yetkili fonksiyon kredi yukleyebilir');

-- 4) Firma harcayabilir (bakiye düşer) ve diğer alanlarını değiştirebilir
SET ROLE authenticated;
UPDATE public.companies SET credit_balance = 14, name = 'Yeni Ad' WHERE id = 1;
RESET ROLE;
SELECT public.t_assert((SELECT credit_balance = 14 AND name = 'Yeni Ad' FROM public.companies WHERE id = 1),
  'firma kredi harcayabilir ve adini degistirebilir');

-- 5) Oturumu açık yönetici kredi yükleyebilir
SET test.admin = 'evet';
SET ROLE authenticated;
UPDATE public.companies SET credit_balance = 50 WHERE id = 1;
RESET ROLE;
RESET test.admin;
SELECT public.t_assert((SELECT credit_balance = 50 FROM public.companies WHERE id = 1), 'yonetici kredi yukleyebilir');

SELECT 'TUM TESTLER GECTI' AS sonuc;
