-- ==============================================================================
-- ŞANTİYE GO – 43: YÖNETİCİNİN YAZIŞMALARI OKUYABİLMESİ
-- Tamamı idempotent; Supabase SQL Editor'de tek seferde çalıştırılabilir.
--
-- Yönetim panelindeki "Yazışmalar" ekranı şikâyet incelemesi için konuşmaları okur.
-- Sunucuda SUPABASE_SERVICE_ROLE_KEY tanımlı değilse bu ekran yöneticinin kendi
-- oturumuyla çalışır; bunun için yöneticilere yalnızca OKUMA izni verilir.
-- Her konuşma açılışı uygulama tarafından admin_audit_logs tablosuna yazılır.
-- ==============================================================================

drop policy if exists conversations_admin_read on public.conversations;
create policy conversations_admin_read on public.conversations
  for select to authenticated using (public.is_admin());

drop policy if exists messages_admin_read on public.messages;
create policy messages_admin_read on public.messages
  for select to authenticated using (public.is_admin());
