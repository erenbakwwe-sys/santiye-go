-- ==============================================================================
-- ŞANTİYE GO – 41: KREDİ BAKİYESİ KORUMASI
-- Tamamı idempotent; Supabase SQL Editor'de tek seferde çalıştırılabilir.
--
-- Açık: firma sahibi kendi companies satırını güncelleyebildiği için credit_balance
-- alanını da istediği sayıya çekebiliyordu (31'deki koruma yalnız doğrulama
-- sütunlarını kapsıyor).
--
-- Kural: tarayıcıdan gelen istek (current_user = authenticated / anon) bakiyeyi
-- ARTIRAMAZ; düşürebilir (spend_quote_credit çağıranın yetkisiyle çalıştığı için
-- teklif verirken kredi harcama bozulmasın diye). Kredi yüklemeyi yalnız şunlar yapar:
--   - service_role (sunucu), SQL Editor / migration,
--   - SECURITY DEFINER fonksiyonlar (current_user fonksiyon sahibidir),
--   - oturumu açık yönetici (public.is_admin()).
-- credit_balance sütunu yoksa bu dosya hiçbir şey yapmaz.
-- ==============================================================================

do $do$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'companies' and column_name = 'credit_balance') then

    create or replace function public.companies_protect_credit_balance() returns trigger
    language plpgsql set search_path = '' as $fn$
    begin
      if current_user not in ('authenticated', 'anon') or coalesce(public.is_admin(), false) then
        return new;
      end if;
      if tg_op = 'INSERT' then
        new.credit_balance := 0;
      elsif coalesce(new.credit_balance, 0) > coalesce(old.credit_balance, 0) then
        raise exception 'Kredi bakiyesi yalnızca yönetici veya ödeme sistemi tarafından artırılabilir.'
          using errcode = '42501';
      end if;
      return new;
    end;
    $fn$;

    drop trigger if exists trg_companies_protect_credit_balance on public.companies;
    create trigger trg_companies_protect_credit_balance
      before insert or update on public.companies
      for each row execute function public.companies_protect_credit_balance();
  end if;
end
$do$;

-- Denetim sorgusu (elle çalıştırın): bakiyesi defter toplamıyla uyuşmayan firmalar.
--   select c.id, c.name, c.credit_balance, coalesce(sum(l.amount), 0) as defter_toplami
--   from public.companies c left join public.company_credit_ledgers l on l.company_id = c.id
--   group by c.id having c.credit_balance <> coalesce(sum(l.amount), 0);
