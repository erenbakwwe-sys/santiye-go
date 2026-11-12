import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Creates an authorized service_role Supabase client.
 * Strictly used for server-side trusted operations such as:
 * - Payment webhooks
 * - Escrow holding & payouts
 * - Dispute resolution
 * - Admin financial ledger mutations
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('placeholder')) {
    throw new Error(
      'HATA: SUPABASE_SERVICE_ROLE_KEY veya NEXT_PUBLIC_SUPABASE_URL ortam değişkeni eksik. Hassas finansal işlemler ve escrow mutabakatları yetkisiz çalıştırılamaz.'
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
