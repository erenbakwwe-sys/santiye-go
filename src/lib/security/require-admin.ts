import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabase/service-role';

export type RequireAdminResult =
  | {
      ok: true;
      adminId: string;
      /**
       * Okuma işlemleri için istemci. SUPABASE_SERVICE_ROLE_KEY tanımlıysa service_role,
       * değilse yöneticinin kendi oturumu (RLS yöneticiye okuma izni verir; bkz. migration 43).
       */
      serviceClient: SupabaseClient;
      usingServiceRole: boolean;
    }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Sunucu uçları için yönetici kontrolü.
 * Kimlik oturum çerezinden, yöneticilik veritabanındaki is_admin() fonksiyonundan okunur
 * (api/admin/listings/moderate ile aynı yöntem).
 */
export async function requireAdmin(): Promise<RequireAdminResult> {
  const session = await createClient();
  const {
    data: { user },
  } = await session.auth.getUser();

  if (!user) {
    return { ok: false, status: 401, error: 'Oturum açmanız gerekiyor.' };
  }

  const { data: isAdmin, error } = await session.rpc('is_admin');
  if (error || isAdmin !== true) {
    return { ok: false, status: 403, error: 'Bu işlem yalnızca yöneticiler içindir.' };
  }

  if (hasServiceRoleKey()) {
    return { ok: true, adminId: user.id, serviceClient: createServiceRoleClient(), usingServiceRole: true };
  }
  console.warn('[requireAdmin] SUPABASE_SERVICE_ROLE_KEY tanımlı değil; yönetici oturumuyla devam ediliyor.');
  return { ok: true, adminId: user.id, serviceClient: session as unknown as SupabaseClient, usingServiceRole: false };
}
