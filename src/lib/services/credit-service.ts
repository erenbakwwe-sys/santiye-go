/**
 * ŞANTİYE GO – TEKLİF VERME KREDİSİ VE ATOMİK SLOT SERVİSİ (PROMPT 9B)
 * Değiştirilemez kredi defteri, FOR UPDATE kilitli atomik harcama RPC çağrısı,
 * bakiye kontrolü, sorunlu talep iadesi ve gölge mod entegrasyonu.
 *
 * KRİTİK KURAL (Kural 2): Kredi ve defter işlemlerinde in-memory/demo fallback
 * KULLANILMAZ. Supabase yapılandırılmamışsa açıkça hata fırlatılır.
 */

import { createClient } from '@/lib/supabase/client';
import {
  CreditSystemSettings,
  CompanyCreditBalance,
  CompanyCreditLedgerEntry,
  CreditPackage,
  QuoteRequestUnlock,
  CreditRefundRequest,
  UnlockOutcomeStatus,
  CompanyNotificationPreferences,
} from '@/types/database';

function ensureSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !anonKey || url.includes('placeholder')) {
    throw new Error(
      'HATA: Supabase veritabanı bağlantısı yapılandırılmamış (NEXT_PUBLIC_SUPABASE_URL). ' +
      'Kredi, defter ve ödeme işlemleri finansal tutarlılık gerektirdiğinden fallback modunda çalışamaz.'
    );
  }
}

// ------------------------------------------------------------------------------
// 1. SİSTEM AYARLARI
// ------------------------------------------------------------------------------
export async function getCreditSystemSettings(): Promise<CreditSystemSettings> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('credit_system_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    throw new Error(`Kredi sistem ayarları alınamadı: ${error.message}`);
  }

  return data as CreditSystemSettings;
}

export async function updateCreditSystemSettings(
  settings: Partial<CreditSystemSettings>,
  adminId: string
): Promise<{ success: boolean; settings: CreditSystemSettings }> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  // Eski ayarı oku (admin log için)
  const { data: oldData } = await supabase
    .from('credit_system_settings')
    .select('*')
    .eq('id', 1)
    .single();

  const { data, error } = await supabase
    .from('credit_system_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString(),
    })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    throw new Error(`Kredi sistem ayarları güncellenemedi: ${error.message}`);
  }

  // Admin audit log kaydı
  await supabase.from('admin_audit_logs').insert({
    admin_id: adminId,
    action: 'UPDATE_CREDIT_SYSTEM_SETTINGS',
    resource_type: 'CREDIT_SETTINGS',
    resource_id: '1',
    details: {
      old_mode: oldData?.system_mode,
      new_mode: data?.system_mode,
      changes: settings,
      timestamp: new Date().toISOString(),
    },
  });

  return { success: true, settings: data as CreditSystemSettings };
}

// ------------------------------------------------------------------------------
// 2. FİRMA BAKİYESİ VE DEĞİŞTİRİLEMEZ DEFTER (LEDGER)
// ------------------------------------------------------------------------------
export async function getCompanyCreditBalance(companyId: string): Promise<CompanyCreditBalance> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('company_credit_balances')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    throw new Error(`Firma bakiye bilgisi alınamadı: ${error.message}`);
  }

  if (!data) {
    // Kayıt yoksa 0 bakiye ile başlangıç nesnesi dön
    return {
      company_id: companyId,
      current_balance: 0,
      lifetime_purchased: 0,
      lifetime_spent: 0,
      has_received_welcome_grant: false,
      updated_at: new Date().toISOString(),
    };
  }

  return data as CompanyCreditBalance;
}

export async function getCompanyCreditLedger(
  companyId: string,
  limit: number = 50
): Promise<CompanyCreditLedgerEntry[]> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('company_credit_ledger')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Kredi defteri dökümü alınamadı: ${error.message}`);
  }

  return (data || []) as CompanyCreditLedgerEntry[];
}

/**
 * DEFTER VE BAKİYE TUTARLILIK DENETİMİ (Kural 9)
 * Defterdeki gerçek (shadow hariç) tüm hareketlerin toplamı ile
 * balances tablosundaki current_balance değerinin kuruşu kuruşuna eşit olduğunu doğrular.
 */
export async function checkLedgerBalanceConsistency(
  companyId: string
): Promise<{ isConsistent: boolean; calculatedBalance: number; recordedBalance: number; diff: number }> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const [balanceRes, ledgerRes] = await Promise.all([
    supabase
      .from('company_credit_balances')
      .select('current_balance')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('company_credit_ledger')
      .select('amount, entry_type')
      .eq('company_id', companyId),
  ]);

  if (balanceRes.error) throw new Error(balanceRes.error.message);
  if (ledgerRes.error) throw new Error(ledgerRes.error.message);

  const recordedBalance = balanceRes.data?.current_balance || 0;
  // shadow_spend bakiye etkilemediği için defter toplamına dahil edilmez
  const calculatedBalance = (ledgerRes.data || [])
    .filter((entry) => entry.entry_type !== 'shadow_spend')
    .reduce((sum, entry) => sum + (Number(entry.amount) || 0), 0);

  const diff = recordedBalance - calculatedBalance;
  return {
    isConsistent: diff === 0,
    calculatedBalance,
    recordedBalance,
    diff,
  };
}

// ------------------------------------------------------------------------------
// 3. ATOMİK KREDİ HARCAMA & TALEP SLOTA BAĞLAMA (Kural 1 & 10)
// PostgreSQL RPC `spend_quote_request_credit` fonksiyonunu çağırır.
// ------------------------------------------------------------------------------
export interface SpendCreditResult {
  success: boolean;
  unlock_id?: string;
  request_id?: string;
  company_id?: string;
  slot_number?: number;
  max_slots?: number;
  credits_spent?: number;
  is_shadow?: boolean;
  previous_balance?: number;
  balance_after?: number;
  already_unlocked?: boolean;
  message?: string;
}

export async function spendCreditForQuoteRequest({
  requestId,
  companyId,
  idempotencyKey,
}: {
  requestId: string;
  companyId?: string;
  idempotencyKey?: string;
}): Promise<SpendCreditResult> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  // Atomik PostgreSQL RPC Çağrısı (Firma kimliği doğrudan auth.uid() ile sunucuda doğrulanır)
  const { data, error } = await supabase.rpc('spend_quote_request_credit', {
    p_request_id: requestId,
    p_idempotency_key: idempotencyKey || `spend-${requestId}-${Date.now()}`,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as SpendCreditResult;
}

// ------------------------------------------------------------------------------
// 4. KREDİ PAKETLERİ VE SATIN ALMA (SANDBOX)
// ------------------------------------------------------------------------------
export async function getCreditPackages(): Promise<CreditPackage[]> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { data, error } = await supabase
    .from('credit_packages')
    .select('*')
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  if (error) {
    throw new Error(`Kredi paketleri listelenemedi: ${error.message}`);
  }

  return (data || []) as CreditPackage[];
}

export async function purchaseCreditPackageSandbox({
  companyId,
  packageId,
  paymentCardLastFour = '4242',
}: {
  companyId: string;
  packageId: string;
  paymentCardLastFour?: string;
}): Promise<{ success: boolean; creditsAdded: number; newBalance: number; transactionId: string }> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const transactionId = `cr-pay-${Date.now()}`;

  const { data, error } = await supabase.rpc('apply_credit_purchase', {
    p_company_id: companyId,
    p_package_id: packageId,
    p_payment_transaction_id: transactionId,
    p_card_last_four: paymentCardLastFour,
  });

  if (error) {
    throw new Error(`Kredi yükleme başarısız: ${error.message}`);
  }

  return {
    success: true,
    creditsAdded: data.credits_added,
    newBalance: data.balance_after,
    transactionId,
  };
}

// ------------------------------------------------------------------------------
// 5. HOŞ GELDİN KREDİSİ (Tekil VKN/Telefon Korumalı)
// ------------------------------------------------------------------------------
export async function grantWelcomeCreditsIfEligible(
  companyId: string
): Promise<{ success: boolean; credits_granted?: number; message?: string }> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { data, error } = await supabase.rpc('grant_welcome_credits_if_eligible', {
    p_company_id: companyId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ------------------------------------------------------------------------------
// 6. SORUNLU TALEP BİLDİRİMİ VE İADE SÜRECİ
// ------------------------------------------------------------------------------
export async function reportProblematicRequest({
  unlockId,
  companyId,
  requestId,
  reason,
  details,
}: {
  unlockId: string;
  companyId: string;
  requestId: string;
  reason: 'unreachable_phone' | 'fake_request' | 'out_of_category' | 'buyer_cancelled';
  details: string;
}): Promise<{ success: boolean; refundRequestId: string }> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  // Süre aşımı denetimi (varsayılan 48 saat)
  const { data: settings } = await supabase
    .from('credit_system_settings')
    .select('refund_window_hours')
    .eq('id', 1)
    .single();

  const windowHours = settings?.refund_window_hours || 48;

  const { data: unlock, error: unlockErr } = await supabase
    .from('quote_request_unlocks')
    .select('created_at, status')
    .eq('id', unlockId)
    .single();

  if (unlockErr || !unlock) {
    throw new Error('İlgili talep kilit açılışı bulunamadı.');
  }

  if (unlock.status === 'refunded') {
    throw new Error('Bu talep için zaten kredi iadesi gerçekleştirilmiştir.');
  }

  const hoursPassed = (Date.now() - new Date(unlock.created_at).getTime()) / (1000 * 3600);
  if (hoursPassed > windowHours) {
    throw new Error(
      `Sorunlu talep bildirim süresi (${windowHours} saat) dolmuştur. Bu talep için iade başvurusu yapılamaz.`
    );
  }

  const { data: newRefund, error: refundErr } = await supabase
    .from('credit_refund_requests')
    .insert({
      unlock_id: unlockId,
      company_id: companyId,
      request_id: requestId,
      reason,
      details,
      status: 'pending',
    })
    .select()
    .single();

  if (refundErr) {
    throw new Error(`İade bildirimi kaydedilemedi: ${refundErr.message}`);
  }

  return { success: true, refundRequestId: newRefund.id };
}

export async function resolveCreditRefund({
  refundRequestId,
  decision,
  adminNotes,
  adminId,
}: {
  refundRequestId: string;
  decision: 'approved' | 'rejected';
  adminNotes: string;
  adminId: string;
}): Promise<{ success: boolean; decision: string; credits_refunded?: number; balance_after?: number }> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { data, error } = await supabase.rpc('resolve_credit_refund', {
    p_refund_request_id: refundRequestId,
    p_decision: decision,
    p_admin_notes: adminNotes,
    p_admin_id: adminId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// ------------------------------------------------------------------------------
// 7. FİRMA TALEP SONUÇ BİLDİRİMİ ("İş Aldım", "Almadım", vb.)
// ------------------------------------------------------------------------------
export async function updateUnlockOutcome({
  unlockId,
  companyId,
  outcomeStatus,
  notes,
}: {
  unlockId: string;
  companyId: string;
  outcomeStatus: UnlockOutcomeStatus;
  notes?: string;
}): Promise<{ success: boolean }> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { error } = await supabase
    .from('quote_request_unlocks')
    .update({
      outcome_status: outcomeStatus,
      outcome_notes: notes || null,
      outcome_reported_at: new Date().toISOString(),
    })
    .eq('id', unlockId)
    .eq('company_id', companyId);

  if (error) {
    throw new Error(`Sonuç bildirimi kaydedilemedi: ${error.message}`);
  }

  return { success: true };
}

// ------------------------------------------------------------------------------
// 8. FİRMA BİLDİRİM TERCİHLERİ
// ------------------------------------------------------------------------------
export async function getCompanyNotificationPreferences(
  companyId: string
): Promise<CompanyNotificationPreferences> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { data } = await supabase
    .from('company_notification_preferences')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (!data) {
    return {
      company_id: companyId,
      in_app_enabled: true,
      email_enabled: true,
      push_enabled: true,
      quiet_hours_enabled: false,
      quiet_start_time: '22:00',
      quiet_end_time: '08:00',
      category_filter_ids: null,
      city_filter_ids: null,
    };
  }

  return data as CompanyNotificationPreferences;
}

export async function updateCompanyNotificationPreferences(
  companyId: string,
  prefs: Partial<CompanyNotificationPreferences>
): Promise<{ success: boolean }> {
  ensureSupabaseConfigured();
  const supabase = createClient();

  const { error } = await supabase
    .from('company_notification_preferences')
    .upsert({
      company_id: companyId,
      ...prefs,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw new Error(`Bildirim tercihleri kaydedilemedi: ${error.message}`);
  }

  return { success: true };
}
