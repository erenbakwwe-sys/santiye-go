/**
-- ==============================================================================
-- ŞANTİYE GO – TEKLİF VERME KREDİSİ, DEFTER (LEDGER) VE SLOT SERVİSİ
-- Prompt 9B: İki taraflı bakiye güvenliği, atomik harcama RPC, gölge mod,
-- slot kontenjanı, dinamik paketler ve sorunlu talep iade yönetimi.
-- ==============================================================================
 */

import { createClient } from '../supabase/client';
import {
  CompanyCreditLedger,
  CreditPackage,
  QuoteCreditConfig,
  QuoteDispute,
  DisputeReason,
  DisputeStatus,
} from '../../types/database';
import { triggerControlledReveal } from './reveal-service';

// -----------------------------------------------------------------------------
// VARSAYILAN KONFİGÜRASYON VE ÖRNEK VERİLER
// -----------------------------------------------------------------------------
export const DEFAULT_CREDIT_CONFIG: QuoteCreditConfig = {
  mode: 'SHADOW', // 'OFF' | 'SHADOW' | 'ACTIVE'
  default_max_slots: 4,
  default_credit_cost: 1,
  category_costs: {},
  welcome_bonus_credits: 5,
  dispute_window_hours: 48,
  auto_refund_on_buyer_cancel: true,
  exempt_single_listing: true,
};

export const DEMO_CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg-001',
    name: 'Başlangıç Paketi',
    credits: 10,
    price: 499,
    discount_percentage: 0,
    is_active: true,
    sort_order: 1,
  },
  {
    id: 'pkg-002',
    name: 'Standart Paket (En Çok Tercih Edilen)',
    credits: 30,
    price: 1299,
    discount_percentage: 13,
    is_active: true,
    sort_order: 2,
  },
  {
    id: 'pkg-003',
    name: 'Profesyonel Paket',
    credits: 75,
    price: 2799,
    discount_percentage: 25,
    is_active: true,
    sort_order: 3,
  },
  {
    id: 'pkg-004',
    name: 'Kurumsal Mega Paket',
    credits: 200,
    price: 6499,
    discount_percentage: 35,
    is_active: true,
    sort_order: 4,
  },
];

export const DEMO_CREDIT_LEDGERS: CompanyCreditLedger[] = [
  {
    id: 'ledger-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    amount: 15,
    balance_after: 15,
    transaction_type: 'welcome_bonus',
    reference_id: 'welcome_promotion',
    notes: 'Platforma hoş geldin teklif kredisi hediyesi',
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: 'ledger-002',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    amount: -1,
    balance_after: 14,
    transaction_type: 'spend',
    reference_id: 'req-001',
    notes: 'İstanbul Ekskavatör Kiralama talebine teklif verme',
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: 'ledger-003',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    amount: 30,
    balance_after: 44,
    transaction_type: 'purchase',
    reference_id: 'pkg-002',
    notes: 'Standart Paket satın alımı',
    created_at: new Date(Date.now() - 86400000 * 1).toISOString(),
  },
];

export const DEMO_DISPUTES: QuoteDispute[] = [
  {
    id: 'disp-001',
    request_id: 'req-002',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    reason: 'unreachable_phone',
    description: 'Telefon numarası sürekli kapalı çalıyor, 2 gündür ulaşılamıyor.',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
  },
];

// In-memory runtime config for demo fallback
let RUNTIME_CONFIG: QuoteCreditConfig = { ...DEFAULT_CREDIT_CONFIG };
let RUNTIME_PACKAGES: CreditPackage[] = [...DEMO_CREDIT_PACKAGES];

// -----------------------------------------------------------------------------
// 1. AYARLAR & KONFİGÜRASYON SORGULAMA
// -----------------------------------------------------------------------------
export async function getCreditConfig(): Promise<QuoteCreditConfig> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', 'quote_credit_config')
        .maybeSingle();

      if (data?.value) {
        return { ...DEFAULT_CREDIT_CONFIG, ...data.value } as QuoteCreditConfig;
      }
    }
  } catch {
    // fallback
  }

  return RUNTIME_CONFIG;
}

export async function updateCreditConfig(
  newConfig: Partial<QuoteCreditConfig>
): Promise<{ success: boolean; config: QuoteCreditConfig; error?: string }> {
  const merged = { ...RUNTIME_CONFIG, ...newConfig };
  RUNTIME_CONFIG = merged;

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { error } = await supabase.from('system_settings').upsert({
        key: 'quote_credit_config',
        value: merged,
        updated_at: new Date().toISOString(),
      });

      if (error) {
        return { success: false, config: merged, error: error.message };
      }
    }
    return { success: true, config: merged };
  } catch (err: any) {
    return { success: true, config: merged };
  }
}

// -----------------------------------------------------------------------------
// 2. KREDİ PAKETLERİ YÖNETİMİ
// -----------------------------------------------------------------------------
export async function getCreditPackages(onlyActive = true): Promise<CreditPackage[]> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      let query = supabase.from('credit_packages').select('*').order('sort_order', { ascending: true });
      if (onlyActive) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as CreditPackage[];
      }
    }
  } catch {
    // fallback
  }

  return onlyActive ? RUNTIME_PACKAGES.filter((p) => p.is_active) : RUNTIME_PACKAGES;
}

export async function saveCreditPackage(
  pkg: Partial<CreditPackage>
): Promise<{ success: boolean; package?: CreditPackage; error?: string }> {
  const isNew = !pkg.id;
  const targetId = pkg.id || `pkg-${Date.now()}`;
  const record: CreditPackage = {
    id: targetId,
    name: pkg.name || 'Özel Kredi Paketi',
    credits: Number(pkg.credits) || 10,
    price: Number(pkg.price) || 499,
    discount_percentage: Number(pkg.discount_percentage) || 0,
    is_active: pkg.is_active !== undefined ? pkg.is_active : true,
    sort_order: Number(pkg.sort_order) || RUNTIME_PACKAGES.length + 1,
  };

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data, error } = await supabase.from('credit_packages').upsert(record).select().single();
      if (!error && data) {
        return { success: true, package: data as CreditPackage };
      }
    }
  } catch {
    // fallback
  }

  if (isNew) {
    RUNTIME_PACKAGES.push(record);
  } else {
    RUNTIME_PACKAGES = RUNTIME_PACKAGES.map((p) => (p.id === targetId ? record : p));
  }

  return { success: true, package: record };
}

export async function deleteCreditPackage(pkgId: string): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase.from('credit_packages').delete().eq('id', pkgId);
    }
  } catch {
    // fallback
  }

  RUNTIME_PACKAGES = RUNTIME_PACKAGES.filter((p) => p.id !== pkgId);
  return { success: true };
}

// -----------------------------------------------------------------------------
// 3. BAKİYE VE DEFTER (IMMUTABLE LEDGER)
// -----------------------------------------------------------------------------
export async function getCompanyCreditBalance(companyId: string): Promise<number> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data } = await supabase
        .from('companies')
        .select('credit_balance')
        .eq('id', companyId)
        .maybeSingle();

      if (data && typeof data.credit_balance === 'number') {
        return data.credit_balance;
      }
    }
  } catch {
    // fallback
  }

  // Defter toplamından hesaplama
  const companyLedgers = DEMO_CREDIT_LEDGERS.filter(
    (l) => l.company_id === companyId && l.transaction_type !== 'shadow_spend'
  );
  if (companyLedgers.length === 0) {
    if (companyId === 'f0000000-0000-0000-0000-000000000001') return 10;
    return 0;
  }
  return companyLedgers.reduce((sum, l) => sum + l.amount, 0);
}

export async function getCompanyCreditLedger(companyId: string): Promise<CompanyCreditLedger[]> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data, error } = await supabase
        .from('company_credit_ledgers')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as CompanyCreditLedger[];
      }
    }
  } catch {
    // fallback
  }

  return DEMO_CREDIT_LEDGERS.filter((l) => l.company_id === companyId).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

// -----------------------------------------------------------------------------
// 4. ATOMİK KREDİ HARCAMA & SLOT AYIRMA (TEK MERKEZİ FONKSİYON)
// -----------------------------------------------------------------------------
export interface SpendCreditResult {
  success: boolean;
  mode: 'OFF' | 'SHADOW' | 'ACTIVE';
  cost: number;
  remainingBalance: number;
  usedSlots: number;
  maxSlots: number;
  error?: string;
  isDuplicate?: boolean;
}

export async function spendQuoteCredit(
  companyId: string,
  requestId: string,
  buyerId: string,
  idempotencyKey?: string
): Promise<SpendCreditResult> {
  const finalKey = idempotencyKey || `spend-${companyId}-${requestId}-${Date.now()}`;

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      // Supabase RPC spend_quote_credit (Transaction + FOR UPDATE kilitlemeli)
      const { data, error } = await supabase.rpc('spend_quote_credit', {
        p_company_id: companyId,
        p_request_id: requestId,
        p_idempotency_key: finalKey,
      });

      if (!error && data) {
        if (!data.success) {
          return {
            success: false,
            mode: data.mode || 'SHADOW',
            cost: data.cost || 0,
            remainingBalance: data.remaining_balance || 0,
            usedSlots: data.used_slots || 0,
            maxSlots: data.max_slots || 4,
            error: data.error,
          };
        }

        return {
          success: true,
          mode: data.mode,
          cost: data.cost,
          remainingBalance: data.remaining_balance,
          usedSlots: data.used_slots,
          maxSlots: data.max_slots,
          isDuplicate: data.is_duplicate,
        };
      }
    }
  } catch {
    // Supabase yoksa demo akışına geç
  }

  // ---------------- DEMO / LOCAL FALLBACK ----------------
  const config = await getCreditConfig();
  const currentBalance = await getCompanyCreditBalance(companyId);
  const cost = config.default_credit_cost || 1;
  const maxSlots = config.default_max_slots || 4;

  // Slot kontenjan kontrolü
  const currentSlotsCount = DEMO_CREDIT_LEDGERS.filter(
    (l) => l.reference_id === requestId && ['spend', 'shadow_spend'].includes(l.transaction_type)
  ).length;

  if (currentSlotsCount >= maxSlots) {
    return {
      success: false,
      mode: config.mode,
      cost,
      remainingBalance: currentBalance,
      usedSlots: currentSlotsCount,
      maxSlots,
      error: `Bu talep için maksimum teklif kontenjanı (${maxSlots} firma) dolmuştur.`,
    };
  }

  // Aynı talep için daha önce harcandı mı denetimi
  const alreadySpent = DEMO_CREDIT_LEDGERS.some(
    (l) =>
      l.company_id === companyId &&
      l.reference_id === requestId &&
      ['spend', 'shadow_spend'].includes(l.transaction_type)
  );

  if (alreadySpent) {
    return {
      success: true,
      mode: config.mode,
      cost,
      remainingBalance: currentBalance,
      usedSlots: 1,
      maxSlots: config.default_max_slots,
      isDuplicate: true,
    };
  }

  if (config.mode === 'ACTIVE' && currentBalance < cost) {
    return {
      success: false,
      mode: 'ACTIVE',
      cost,
      remainingBalance: currentBalance,
      usedSlots: 0,
      maxSlots: config.default_max_slots,
      error: `Yetersiz kredi bakiyesi. Talebe teklif vermek için ${cost} kredi gereklidir. Mevcut: ${currentBalance}`,
    };
  }

  const newBalance = config.mode === 'ACTIVE' ? currentBalance - cost : currentBalance;

  // Deftere ekle
  const ledgerItem: CompanyCreditLedger = {
    id: `ledger-${Date.now()}`,
    company_id: companyId,
    amount: config.mode === 'ACTIVE' ? -cost : 0,
    balance_after: newBalance,
    transaction_type: config.mode === 'ACTIVE' ? 'spend' : config.mode === 'SHADOW' ? 'shadow_spend' : 'spend',
    reference_id: requestId,
    idempotency_key: finalKey,
    notes:
      config.mode === 'SHADOW'
        ? `Gölge Mod: Simüle edilen harcama (${cost} kredi)`
        : `Teklif verme kredisi harcaması (${cost} kredi)`,
    created_at: new Date().toISOString(),
  };
  DEMO_CREDIT_LEDGERS.unshift(ledgerItem);

  // Prompt 9A ile kontrollü iletişim açılışı
  await triggerControlledReveal({
    buyerId,
    companyId,
    triggerType: 'talep_kredisi',
  });

  return {
    success: true,
    mode: config.mode,
    cost,
    remainingBalance: newBalance,
    usedSlots: 1,
    maxSlots: config.default_max_slots,
  };
}

// -----------------------------------------------------------------------------
// 5. KREDİ SATIN ALMA (SANDBOX ÖDEME VE DEFTERE İŞLEME)
// -----------------------------------------------------------------------------
export async function purchaseCredits(
  companyId: string,
  packageId: string
): Promise<{ success: boolean; newBalance?: number; error?: string }> {
  const packages = await getCreditPackages(false);
  const selectedPkg = packages.find((p) => p.id === packageId);

  if (!selectedPkg) {
    return { success: false, error: 'Kredi paketi bulunamadı.' };
  }

  const currentBalance = await getCompanyCreditBalance(companyId);
  const newBalance = currentBalance + selectedPkg.credits;

  const ledgerItem: CompanyCreditLedger = {
    id: `ledger-${Date.now()}`,
    company_id: companyId,
    amount: selectedPkg.credits,
    balance_after: newBalance,
    transaction_type: 'purchase',
    reference_id: selectedPkg.id,
    idempotency_key: `buy-${companyId}-${selectedPkg.id}-${Date.now()}`,
    notes: `${selectedPkg.name} (${selectedPkg.credits} Kredi - ₺${selectedPkg.price}) satın alımı`,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      // 1. Deftere ekle
      await supabase.from('company_credit_ledgers').insert(ledgerItem);
      // 2. Bakiye güncelle
      await supabase.from('companies').update({ credit_balance: newBalance }).eq('id', companyId);
      return { success: true, newBalance };
    }
  } catch {
    // fallback
  }

  DEMO_CREDIT_LEDGERS.unshift(ledgerItem);
  return { success: true, newBalance };
}

// -----------------------------------------------------------------------------
// 6. MANUEL ADMİN KREDİ İŞLEMLERİ
// -----------------------------------------------------------------------------
export async function adminAdjustCredits(
  adminId: string,
  companyId: string,
  amount: number,
  notes: string
): Promise<{ success: boolean; newBalance: number; error?: string }> {
  if (amount === 0) {
    return { success: false, newBalance: 0, error: 'Kredi miktarı sıfır olamaz.' };
  }

  const currentBalance = await getCompanyCreditBalance(companyId);
  const newBalance = Math.max(0, currentBalance + amount);

  const ledgerItem: CompanyCreditLedger = {
    id: `ledger-${Date.now()}`,
    company_id: companyId,
    amount,
    balance_after: newBalance,
    transaction_type: 'admin_adjustment',
    reference_id: adminId,
    idempotency_key: `adj-${companyId}-${Date.now()}`,
    notes: `Yönetici Müdahalesi: ${notes}`,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase.from('company_credit_ledgers').insert(ledgerItem);
      await supabase.from('companies').update({ credit_balance: newBalance }).eq('id', companyId);
      return { success: true, newBalance };
    }
  } catch {
    // fallback
  }

  DEMO_CREDIT_LEDGERS.unshift(ledgerItem);
  return { success: true, newBalance };
}

// -----------------------------------------------------------------------------
// 7. SORUNLU TALEP / İADE İTİRAZLARI (DISPUTES)
// -----------------------------------------------------------------------------
export async function createQuoteDispute(
  companyId: string,
  requestId: string,
  reason: DisputeReason,
  description: string
): Promise<{ success: boolean; disputeId?: string; error?: string }> {
  const dispute: QuoteDispute = {
    id: `disp-${Date.now()}`,
    request_id: requestId,
    company_id: companyId,
    reason,
    description,
    status: 'pending',
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data, error } = await supabase.from('quote_disputes').insert(dispute).select().single();
      if (!error && data) {
        return { success: true, disputeId: data.id };
      }
    }
  } catch {
    // fallback
  }

  DEMO_DISPUTES.unshift(dispute);
  return { success: true, disputeId: dispute.id };
}

export async function getQuoteDisputes(status?: DisputeStatus): Promise<QuoteDispute[]> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      let query = supabase
        .from('quote_disputes')
        .select(`
          *,
          company:companies(name, phone),
          request:quote_requests(title, category_id, city_id)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (!error && data) return data as QuoteDispute[];
    }
  } catch {
    // fallback
  }

  if (status) {
    return DEMO_DISPUTES.filter((d) => d.status === status);
  }
  return DEMO_DISPUTES;
}

export async function resolveQuoteDispute(
  disputeId: string,
  adminId: string,
  status: 'approved' | 'rejected',
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  const dispute = DEMO_DISPUTES.find((d) => d.id === disputeId);
  if (!dispute) return { success: false, error: 'İtiraz kaydı bulunamadı.' };

  dispute.status = status;
  dispute.admin_notes = adminNotes;
  dispute.reviewed_by = adminId;
  dispute.resolved_at = new Date().toISOString();

  // Onaylandıysa otomatik kredi iadesi
  if (status === 'approved') {
    const currentBalance = await getCompanyCreditBalance(dispute.company_id);
    const newBalance = currentBalance + 1;

    const refundLedger: CompanyCreditLedger = {
      id: `ledger-${Date.now()}`,
      company_id: dispute.company_id,
      amount: 1,
      balance_after: newBalance,
      transaction_type: 'refund',
      reference_id: dispute.request_id,
      notes: `Sorunlu talep iadesi (${dispute.reason}): ${adminNotes || 'Onaylandı'}`,
      created_at: new Date().toISOString(),
    };

    DEMO_CREDIT_LEDGERS.unshift(refundLedger);
    dispute.refunded_ledger_id = refundLedger.id;

    try {
      const supabase = createClient();
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isConfigured) {
        await supabase.from('company_credit_ledgers').insert(refundLedger);
        await supabase
          .from('companies')
          .update({ credit_balance: newBalance })
          .eq('id', dispute.company_id);
      }
    } catch {
      // fallback
    }
  }

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase
        .from('quote_disputes')
        .update({
          status,
          admin_notes: adminNotes,
          reviewed_by: adminId,
          resolved_at: new Date().toISOString(),
          refunded_ledger_id: dispute.refunded_ledger_id,
        })
        .eq('id', disputeId);
    }
  } catch {
    // fallback
  }

  return { success: true };
}

// -----------------------------------------------------------------------------
// 8. TEKLİF SONUÇ BİLDİRİMİ (JOB OUTCOME FEEDBACK)
// -----------------------------------------------------------------------------
export async function submitQuoteOutcome(
  quoteId: string,
  outcome: 'job_won' | 'job_lost' | 'could_not_reach' | 'unknown'
): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase.from('quotes').update({ outcome_feedback: outcome }).eq('id', quoteId);
    }
  } catch {
    // fallback
  }

  return { success: true };
}

// -----------------------------------------------------------------------------
// 9. GÖLGE MOD VE GENEL KREDİ İSTATİSTİKLERİ
// -----------------------------------------------------------------------------
export async function getCreditSystemStats() {
  const ledgers = DEMO_CREDIT_LEDGERS;
  const purchases = ledgers.filter((l) => l.transaction_type === 'purchase');
  const spends = ledgers.filter((l) => l.transaction_type === 'spend');
  const shadowSpends = ledgers.filter((l) => l.transaction_type === 'shadow_spend');
  const refunds = ledgers.filter((l) => l.transaction_type === 'refund');

  const totalRevenue = purchases.reduce((sum, p) => sum + p.amount * 45, 0); // Ort. kredi başı ~45₺
  const shadowEstimatedRevenue = shadowSpends.length * 45; // Gölge mod simüle edilen potansiyel gelir

  return {
    totalPurchasedCredits: purchases.reduce((sum, p) => sum + p.amount, 0),
    totalSpentCredits: Math.abs(spends.reduce((sum, s) => sum + s.amount, 0)),
    totalShadowSpentCredits: shadowSpends.length,
    totalRefundedCredits: refunds.reduce((sum, r) => sum + r.amount, 0),
    totalRevenue,
    shadowEstimatedRevenue,
    activeDisputesCount: DEMO_DISPUTES.filter((d) => d.status === 'pending').length,
    averageSlotsFilled: 2.4, // Demo ortalama slot dolumu
  };
}
