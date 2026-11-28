-- ==============================================================================
-- ŞANTİYE GO – 44: STORAGE VE KREDİ İTİRAZLARI KİLİDİ
-- Tamamı idempotent; Supabase SQL Editor'de tek seferde çalıştırılabilir.
--
-- Sorunlar (canlı denetim, 2026-11-28):
--  1) listing-photos kovası: "Allow Update and Delete" politikası yalnızca bucket_id
--     kontrol ediyordu -> giriş yapmamış biri dahil herkes BAŞKASININ ilan fotoğrafını
--     silebiliyor / üzerine yazabiliyordu; herkes dosya yükleyebiliyordu (depolama kötüye
--     kullanımı).
--  2) company-documents kovası: hiç politika yoktu -> firmalar vergi levhası / imza
--     sirküleri yükleyemiyordu (doğrulama akışı bozuk).
--  3) quote_disputes: "quote_disputes_all" (ALL, USING true) -> herkes tüm kredi
--     itirazlarını okuyup değiştirip silebiliyordu.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1) listing-photos (herkese açık okuma; yükleme yalnızca üyeler; silme/değiştirme sahibi)
-- ------------------------------------------------------------------------------
drop policy if exists "Allow Upload for Listing Photos" on storage.objects;
drop policy if exists "Allow Update and Delete for Listing Photos" on storage.objects;
drop policy if exists listing_photos_insert_authenticated on storage.objects;
drop policy if exists listing_photos_update_owner on storage.objects;
drop policy if exists listing_photos_delete_owner on storage.objects;

create policy listing_photos_insert_authenticated on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-photos');

create policy listing_photos_update_owner on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-photos' and (owner = auth.uid() or public.is_admin()))
  with check (bucket_id = 'listing-photos' and (owner = auth.uid() or public.is_admin()));

create policy listing_photos_delete_owner on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-photos' and (owner = auth.uid() or public.is_admin()));

-- ------------------------------------------------------------------------------
-- 2) company-documents (özel): kullanıcı yalnızca kendi klasörüne (<user_id>/...) yazar
--    ve okur; yöneticiler doğrulama için tümünü okur.
-- ------------------------------------------------------------------------------
drop policy if exists company_documents_insert_own on storage.objects;
drop policy if exists company_documents_update_own on storage.objects;
drop policy if exists company_documents_select_own_or_admin on storage.objects;
drop policy if exists company_documents_delete_own on storage.objects;

create policy company_documents_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'company-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy company_documents_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'company-documents' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'company-documents' and (storage.foldername(name))[1] = auth.uid()::text);

create policy company_documents_select_own_or_admin on storage.objects
  for select to authenticated
  using (
    bucket_id = 'company-documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

create policy company_documents_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'company-documents' and (storage.foldername(name))[1] = auth.uid()::text);

-- ------------------------------------------------------------------------------
-- 3) quote_disputes: firma kendi itirazını açar ve görür; karar yalnızca yönetici
-- ------------------------------------------------------------------------------
drop policy if exists quote_disputes_all on public.quote_disputes;
drop policy if exists quote_disputes_company_insert on public.quote_disputes;
drop policy if exists quote_disputes_company_read on public.quote_disputes;
drop policy if exists quote_disputes_admin_all on public.quote_disputes;

create policy quote_disputes_company_insert on public.quote_disputes
  for insert to authenticated
  with check (
    company_id in (select id from public.companies where user_id = auth.uid())
    and coalesce(status, 'pending') = 'pending'
    and admin_notes is null
    and reviewed_by is null
    and refunded_ledger_id is null
    and resolved_at is null
  );

create policy quote_disputes_company_read on public.quote_disputes
  for select to authenticated
  using (company_id in (select id from public.companies where user_id = auth.uid()));

create policy quote_disputes_admin_all on public.quote_disputes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke all on public.quote_disputes from anon;

-- ------------------------------------------------------------------------------
-- 4) İLAN MODERASYONU ATLATMA KORUMASI
--    Firma ilanını doğrudan "active" olarak ekleyebiliyor ya da reddedilen ilanını kendisi
--    yayına alabiliyordu. Kural:
--     - Firma yeni ilanı her zaman "onay bekliyor" olarak ekler.
--     - Yönetici onayladığında approved_at işlenir.
--     - Firma yalnızca daha önce onaylanmış ilanını durdurup (inactive) tekrar yayına
--       alabilir; silebilir (deleted). "rejected" ve ilk "active" yalnızca yöneticide.
--    Yöneticiler ve sunucu (service_role) bu kurallardan muaftır.
-- ------------------------------------------------------------------------------
alter table public.listings add column if not exists approved_at timestamptz;

update public.listings
   set approved_at = coalesce(updated_at, created_at)
 where approved_at is null and status in ('active', 'inactive', 'reserved', 'maintenance');

create or replace function public.listings_moderation_guard() returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_priv boolean := coalesce(auth.role(), '') = 'service_role'
                    or session_user in ('postgres', 'supabase_admin')
                    or public.is_admin();
begin
  if v_priv then
    if new.status = 'active' and new.approved_at is null then
      new.approved_at := now();
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.status := 'pending_approval';
    new.approved_at := null;
    new.is_demo := false;
    return new;
  end if;

  new.approved_at := old.approved_at;
  new.is_demo := old.is_demo;

  if new.status is distinct from old.status then
    if new.status in ('inactive', 'deleted', 'draft', 'reserved', 'maintenance') then
      return new;
    end if;
    if new.status = 'active' and old.approved_at is not null
       and old.status in ('inactive', 'reserved', 'maintenance') then
      return new;
    end if;
    if new.status = 'pending_approval' and old.status in ('draft', 'rejected') then
      return new;
    end if;
    raise exception 'İlan yayına yalnızca yönetici onayıyla alınabilir.' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke all on function public.listings_moderation_guard() from public, anon, authenticated;

drop trigger if exists listings_moderation_guard on public.listings;
create trigger listings_moderation_guard
  before insert or update on public.listings
  for each row execute function public.listings_moderation_guard();
