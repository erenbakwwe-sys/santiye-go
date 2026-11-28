import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates an authorized service_role Supabase client.
 * Strictly used for server-side trusted operations such as:
 * - Payment webhooks
 * - Escrow holding & payouts
 * - Dispute resolution
 * - Admin financial ledger mutations
 */
/** Sunucuda service_role anahtarı tanımlı mı? (Hosting ortam değişkeni) */
export function hasServiceRoleKey(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return Boolean(url && process.env.SUPABASE_SERVICE_ROLE_KEY && !url.includes('placeholder'));
}

export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    throw new Error(
      'Sunucu yapılandırması eksik: SUPABASE_SERVICE_ROLE_KEY ortam değişkeni tanımlı değil. Hosting panelinden ekleyip yeniden yayınlayın.'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
