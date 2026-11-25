import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export type RequireAdminResult =
  | { ok: true; adminId: string; serviceClient: SupabaseClient }
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

  return { ok: true, adminId: user.id, serviceClient: createServiceRoleClient() };
}
