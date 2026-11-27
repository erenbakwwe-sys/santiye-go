-- ==============================================================================
-- ŞANTİYE GO – 42: "ŞantiyeGO Tedarik" PLATFORM HESABI
-- Tamamı idempotent; Supabase SQL Editor'de tek seferde çalıştırılabilir.
--
-- Amaç: Site yeniyken platformun kendisi, anlaşmalı firmalar aracılığıyla hizmet verdiği
-- ilanları AÇIKÇA "ŞantiyeGO Tedarik" adıyla yayınlayabilsin. İlanlar başka bir firma
-- gibi gösterilmez; platform hesabı olduğu arayüzde belirtilir.
--
--  1) companies.is_platform: tek bir platform hesabı olabilir; yalnızca sunucu/yönetici
--     değiştirebilir.
--  2) Yöneticinin firma kaydı "ŞantiyeGO Tedarik" platform hesabına çevrilir
--     (ilk aktif super_admin'in kaydı; yoksa oluşturulur).
--  3) Ad taklidi koruması: platform hesabı dışındaki firmalar "ŞantiyeGO" içeren ad
--     kullanamaz.
--  4) Teklif talebi dağıtımı: uygun firma bulunamazsa talep platform hesabına iletilir ve
--     yöneticilere bildirim gider. Yöneticiler tüm talepleri görebilir.
-- ==============================================================================

alter table public.companies
  add column if not exists is_platform boolean not null default false;

create unique index if not exists uq_companies_single_platform
  on public.companies (is_platform) where is_platform;

-- ------------------------------------------------------------------------------
-- 1 + 3) is_platform ve ad koruması
-- ------------------------------------------------------------------------------
create or replace function public.companies_protect_platform() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_priv boolean := coalesce(auth.role(), '') = 'service_role'
                    or session_user in ('postgres', 'supabase_admin');
begin
  if not v_priv and not public.is_admin() then
    if tg_op = 'INSERT' then
      new.is_platform := false;
    elsif new.is_platform is distinct from old.is_platform then
      raise exception 'Platform hesabı ayarı yalnızca yönetici tarafından değiştirilebilir.'
        using errcode = '42501';
    end if;
  end if;

  if not coalesce(new.is_platform, false)
     and lower(translate(coalesce(new.name, ''), 'ŞşİıÇçĞğÖöÜü ', 'ssiiccggoouu'))
         ~ 'santiyego' then
    raise exception 'Firma adında "ŞantiyeGO" ifadesi kullanılamaz.' using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function public.companies_protect_platform() from public, anon, authenticated;

drop trigger if exists companies_protect_platform on public.companies;
create trigger companies_protect_platform
  before insert or update on public.companies
  for each row execute function public.companies_protect_platform();

-- ------------------------------------------------------------------------------
-- 2) Platform hesabını oluştur / dönüştür
-- ------------------------------------------------------------------------------
do $$
declare
  v_admin uuid;
  v_company uuid;
begin
  if exists (select 1 from public.companies where is_platform) then
    return;
  end if;

  select au.id into v_admin
    from public.admin_users au
    join public.profiles p on p.id = au.id
   where au.is_active and au.role = 'super_admin'
   order by p.created_at
   limit 1;
  if v_admin is null then
    raise notice 'Aktif super_admin yok; platform hesabı oluşturulmadı.';
    return;
  end if;

  select id into v_company from public.companies where user_id = v_admin;
  if v_company is null then
    insert into public.companies (user_id, name, phone, is_verified, verification_status, is_platform)
    values (v_admin, 'ŞantiyeGO Tedarik', '', true, 'approved', true)
    returning id into v_company;
  else
    update public.companies
       set name = 'ŞantiyeGO Tedarik',
           is_platform = true,
           is_verified = true,
           verification_status = 'approved',
           verified_at = coalesce(verified_at, now()),
           updated_at = now()
     where id = v_company;
  end if;
end
$$;

-- Platform hesabının herkese açık görünümü (yalnızca kimlik ve ad).
create or replace function public.get_platform_company()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.id, c.name::text from public.companies c where c.is_platform limit 1;
$$;
revoke all on function public.get_platform_company() from public;
grant execute on function public.get_platform_company() to anon, authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4) Teklif talepleri: yöneticiler hepsini görür; firma bulunamazsa platforma düşer
-- ------------------------------------------------------------------------------
drop policy if exists quote_requests_admin_read on public.quote_requests;
create policy quote_requests_admin_read on public.quote_requests
  for select to authenticated using (public.is_admin());

drop policy if exists quotes_admin_read on public.quotes;
create policy quotes_admin_read on public.quotes
  for select to authenticated using (public.is_admin());

create or replace function public.quote_requests_distribute() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count int;
  v_platform uuid;
  v_admin record;
begin
  if new.request_type = 'single_listing' and new.listing_id is not null then
    insert into public.quote_request_recipients (request_id, company_id)
    select new.id, l.company_id
      from public.listings l
      join public.companies co on co.id = l.company_id
     where l.id = new.listing_id
       and co.user_id <> new.buyer_id
    on conflict do nothing;
  else
    insert into public.quote_request_recipients (request_id, company_id, distance_km)
    select new.id, x.company_id, x.distance_km
      from (
        select l.company_id,
               min(case when new.location is not null and l.location is not null
                        then st_distance(l.location, new.location) / 1000.0 end) as distance_km,
               bool_or(l.district_id = new.district_id) as same_district
          from public.listings l
          join public.categories c on c.id = l.category_id
          join public.companies co on co.id = l.company_id
         where l.status = 'active'
           and co.user_id <> new.buyer_id
           and (c.id = new.category_id or c.parent_id = new.category_id
                or c.id = (select parent_id from public.categories where id = new.category_id))
           and (l.city_id = new.city_id
                or (new.location is not null and l.location is not null
                    and st_dwithin(l.location, new.location, coalesce(new.search_radius_km, 50) * 1000)))
         group by l.company_id
      ) x
     order by x.same_district desc nulls last, x.distance_km asc nulls last, x.company_id
     limit coalesce(new.max_recipients, 10)
    on conflict do nothing;
  end if;

  select count(*) into v_count from public.quote_request_recipients where request_id = new.id;

  if v_count = 0 then
    -- Uygun firma yok: talep platform hesabına iletilir, yöneticiler bilgilendirilir.
    select id into v_platform from public.companies where is_platform limit 1;
    if v_platform is not null then
      insert into public.quote_request_recipients (request_id, company_id)
      values (new.id, v_platform)
      on conflict do nothing;
    end if;

    for v_admin in select id from public.admin_users where is_active loop
      begin
        perform public.notify_user(
          v_admin.id, 'new_quote_request', 'Firma bulunamayan teklif talebi',
          left(coalesce(new.title, 'Yeni talep'), 120)
            || ' — bölgede uygun firma yok. Müşteriyi arayıp tedarikçi bulun.',
          '/admin/talepler',
          jsonb_build_object('request_id', new.id));
      exception when others then
        raise warning 'quote_requests_distribute notify: %', sqlerrm;
      end;
    end loop;
  end if;

  return new;
end;
$$;
revoke all on function public.quote_requests_distribute() from public, anon, authenticated;
