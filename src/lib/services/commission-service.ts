import { createClient } from '../supabase/client';
import { CommissionRule, CommissionTier } from '../../types/database';
import { DEMO_PLATFORM_SETTINGS } from './admin-service';

export interface CommissionCalculationResult {
  amountCents: number;
  baseRatePercent: number;
  discountRatePercent: number;
  appliedRatePercent: number;
  rawCommissionAmountCents: number;
  commissionAmountCents: number;
  vatAmountCents: number;
  netCompanyAmountCents: number;
  ruleSource: 'company' | 'category' | 'global';
  capAmountCents: number | null;
  minAmountCents: number | null;
  isCapApplied: boolean;
  isMinApplied: boolean;
  cappedSavingsCents: number;
  appliedTier: CommissionTier | null;
  isCreditExempt: boolean;
  isDirectPaymentExempt: boolean;
}

// In-Memory kuralları (Demo / çevrimdışı fallback)
export let DEMO_COMMISSION_RULES: CommissionRule[] = [
  // 1. Kategori İstisnası: Ağır Nakliyat / Lowbed için kademeli ve tavanlı komisyon
  {
    id: 'rule-cat-lowbed',
    rule_type: 'category',
    category_id: 'd0000000-0000-0000-0000-000000000003', // Lowbed
    company_id: null,
    rate_percent: 6.0,
    cap_amount_cents: 750000, // 7.500 ₺ Tavan
    min_amount_cents: 10000,  // 100 ₺ Taban
    tiers: [
      { min_amount_cents: 0, max_amount_cents: 5000000, rate_percent: 6.0 }, // 0 - 50.000 TL -> %6
      { min_amount_cents: 5000000, max_amount_cents: null, rate_percent: 4.0 }, // 50.000 TL üstü -> %4
    ],
    exempt_if_quote_credit_used: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // 2. Firma Özel İstisnası: Anadolu İş Makineleri için özel tavan ve oran
  {
    id: 'rule-comp-anadolu',
    rule_type: 'company',
    category_id: null,
    company_id: 'f0000000-0000-0000-0000-000000000001',
    rate_percent: 7.0,
    cap_amount_cents: 500000, // 5.000 ₺ Tavan
    min_amount_cents: null,
    tiers: [],
    exempt_if_quote_credit_used: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * -----------------------------------------------------------------------------
 * 1. PURE FONKSİYON: TAVAN, KADEME, İNDİRİM VE KDV HESAPLAMA MOTORU
 * -----------------------------------------------------------------------------
 * Hesaplama Sırası:
 * 1. Platform Dışı Ödeme / Doğrudan Ödeme -> 0
 * 2. Kredi Muafiyeti (Prompt 9B kredisi kullanıldıysa) -> 0
 * 3. Oran/Kademe Seçimi
 * 4. Üyelik İndirimi
 * 5. Tavan (Cap) ve Asgari (Min) Sınır EN SONDA Uygulanır
 * 6. Kuruş Cinsinden Tamsayı + %20 KDV Ayrımı
 */
export function computeCommissionMath(params: {
  amountCents: number;
  baseRatePercent: number;
  discountRatePercent?: number;
  capAmountCents?: number | null;
  minAmountCents?: number | null;
  appliedTier?: CommissionTier | null;
  ruleSource?: 'company' | 'category' | 'global';
  isCreditExempt?: boolean;
  isDirectPayment?: boolean;
}): CommissionCalculationResult {
  const {
    amountCents,
    baseRatePercent,
    discountRatePercent = 0.0,
    capAmountCents = null,
    minAmountCents = null,
    appliedTier = null,
    ruleSource = 'global',
    isCreditExempt = false,
    isDirectPayment = false,
  } = params;

  if (amountCents < 0) {
    throw new Error('İşlem tutarı negatif olamaz.');
  }

  // 1. Durum: Platform dışı ödeme
  if (isDirectPayment) {
    return {
      amountCents,
      baseRatePercent: 0,
      discountRatePercent: 0,
      appliedRatePercent: 0,
      rawCommissionAmountCents: 0,
      commissionAmountCents: 0,
      vatAmountCents: 0,
      netCompanyAmountCents: amountCents,
      ruleSource,
      capAmountCents: null,
      minAmountCents: null,
      isCapApplied: false,
      isMinApplied: false,
      cappedSavingsCents: 0,
      appliedTier: null,
      isCreditExempt: false,
      isDirectPaymentExempt: true,
    };
  }

  // 2. Durum: Prompt 9B Kredi Muafiyeti
  if (isCreditExempt) {
    return {
      amountCents,
      baseRatePercent: 0,
      discountRatePercent: 0,
      appliedRatePercent: 0,
      rawCommissionAmountCents: 0,
      commissionAmountCents: 0,
      vatAmountCents: 0,
      netCompanyAmountCents: amountCents,
      ruleSource,
      capAmountCents: null,
      minAmountCents: null,
      isCapApplied: false,
      isMinApplied: false,
      cappedSavingsCents: 0,
      appliedTier: null,
      isCreditExempt: true,
      isDirectPaymentExempt: false,
    };
  }

  // 3. Üyelik İndirimi
  const appliedRatePercent = Number(Math.max(0, baseRatePercent - discountRatePercent).toFixed(2));

  // 4. Ham Komisyon Hesabı (Tamsayı Kuruş Matematiği)
  const rawCommissionAmountCents = Math.round((amountCents * appliedRatePercent) / 100);

  let finalCommissionAmountCents = rawCommissionAmountCents;
  let isCapApplied = false;
  let isMinApplied = false;
  let cappedSavingsCents = 0;

  // 5. Tavan Komisyon (Cap) Kontrolü
  if (capAmountCents !== null && capAmountCents !== undefined && capAmountCents > 0) {
    if (finalCommissionAmountCents > capAmountCents) {
      cappedSavingsCents = finalCommissionAmountCents - capAmountCents;
      finalCommissionAmountCents = capAmountCents;
      isCapApplied = true;
    }
  }

  // 6. Taban Komisyon (Floor) Kontrolü (İşlem tutarı 0 değilse ve tavan aşılmadıysa)
  if (!isCapApplied && minAmountCents !== null && minAmountCents !== undefined && minAmountCents > 0 && amountCents > 0) {
    if (finalCommissionAmountCents < minAmountCents) {
      // Komisyon tutarı ana para işlem tutarını geçemez
      finalCommissionAmountCents = Math.min(amountCents, minAmountCents);
      isMinApplied = true;
    }
  }

  // 7. Net Firma Hakedişi
  const netCompanyAmountCents = Math.max(0, amountCents - finalCommissionAmountCents);

  // 8. %20 KDV Ayrımı (Platform komisyonuna dahildir)
  const vatAmountCents = Math.round(
    finalCommissionAmountCents - finalCommissionAmountCents / 1.2
  );

  return {
    amountCents,
    baseRatePercent,
    discountRatePercent,
    appliedRatePercent,
    rawCommissionAmountCents,
    commissionAmountCents: finalCommissionAmountCents,
    vatAmountCents,
    netCompanyAmountCents,
    ruleSource,
    capAmountCents,
    minAmountCents,
    isCapApplied,
    isMinApplied,
    cappedSavingsCents,
    appliedTier,
    isCreditExempt: false,
    isDirectPaymentExempt: false,
  };
}

/**
 * -----------------------------------------------------------------------------
 * 2. KURAL HİYERARŞİSİ VE TEK SUNUCU HESAPLAMA FONKSİYONU
 * -----------------------------------------------------------------------------
 * Öncelik: Firma Özel > Kategori > Global
 */
export async function calculateCommissionForTransaction(params: {
  amountCents: number;
  companyId: string;
  categoryId?: string | null;
  planDiscountPercent?: number;
  isQuoteCreditUsed?: boolean;
  paymentMethod?: 'platform' | 'direct';
}): Promise<CommissionCalculationResult> {
  const {
    amountCents,
    companyId,
    categoryId,
    planDiscountPercent = 0.0,
    isQuoteCreditUsed = false,
    paymentMethod = 'platform',
  } = params;

  // Platform dışı ödeme kontrolü
  if (paymentMethod === 'direct') {
    return computeCommissionMath({
      amountCents,
      baseRatePercent: 0,
      isDirectPayment: true,
    });
  }

  // Kuralları yükle (Supabase veya DEMO)
  const rules = await getCommissionRules();

  let matchedRule: CommissionRule | undefined;
  let ruleSource: 'company' | 'category' | 'global' = 'global';

  // 1. Öncelik: Firma Özel Kuralı
  const companyRule = rules.find(
    (r) => r.rule_type === 'company' && r.company_id === companyId && r.is_active
  );

  if (companyRule) {
    matchedRule = companyRule;
    ruleSource = 'company';
  } else if (categoryId) {
    // 2. Öncelik: Kategori Kuralı
    const categoryRule = rules.find(
      (r) => r.rule_type === 'category' && r.category_id === categoryId && r.is_active
    );
    if (categoryRule) {
      matchedRule = categoryRule;
      ruleSource = 'category';
    }
  }

  // 3. Öncelik: Global Kural
  if (!matchedRule) {
    const globalRule = rules.find((r) => r.rule_type === 'global' && r.is_active);
    if (globalRule) {
      matchedRule = globalRule;
      ruleSource = 'global';
    }
  }

  // Eğer hiçbir kural bulunamazsa global platform ayarından al
  const fallbackRate = Number(
    DEMO_PLATFORM_SETTINGS.default_commission_rate?.value?.rate_percent || 8.0
  );

  let baseRate = matchedRule?.rate_percent ?? fallbackRate;
  let capAmountCents = matchedRule?.cap_amount_cents ?? null;
  let minAmountCents = matchedRule?.min_amount_cents ?? null;
  let appliedTier: CommissionTier | null = null;

  // 9B Kredi Muafiyeti Denetimi
  const isCreditExempt = Boolean(
    isQuoteCreditUsed && (matchedRule?.exempt_if_quote_credit_used ?? true)
  );

  if (isCreditExempt) {
    return computeCommissionMath({
      amountCents,
      baseRatePercent: 0,
      ruleSource,
      isCreditExempt: true,
    });
  }

  // Kademe Tablosu Denetimi
  if (matchedRule?.tiers && Array.isArray(matchedRule.tiers) && matchedRule.tiers.length > 0) {
    const sortedTiers = [...matchedRule.tiers].sort((a, b) => a.min_amount_cents - b.min_amount_cents);
    const matchingTier = sortedTiers.find((t) => {
      const matchMin = amountCents >= t.min_amount_cents;
      const matchMax = t.max_amount_cents == null || amountCents <= t.max_amount_cents;
      return matchMin && matchMax;
    });

    if (matchingTier) {
      baseRate = matchingTier.rate_percent;
      appliedTier = matchingTier;
    }
  }

  return computeCommissionMath({
    amountCents,
    baseRatePercent: baseRate,
    discountRatePercent: planDiscountPercent,
    capAmountCents,
    minAmountCents,
    appliedTier,
    ruleSource,
  });
}

/**
 * -----------------------------------------------------------------------------
 * 3. KOMİSYON KURALLARI YÖNETİMİ (SUPABASE + IN-MEMORY FALLBACK)
 * -----------------------------------------------------------------------------
 */
export async function getCommissionRules(onlyActive = true): Promise<CommissionRule[]> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      let query = supabase.from('commission_rules').select('*').order('created_at', { ascending: false });
      if (onlyActive) {
        query = query.eq('is_active', true);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return data as CommissionRule[];
      }
    }
  } catch {
    // fallback
  }

  return onlyActive ? DEMO_COMMISSION_RULES.filter((r) => r.is_active) : DEMO_COMMISSION_RULES;
}

export async function saveCommissionRule(
  rule: Partial<CommissionRule>
): Promise<{ success: boolean; rule?: CommissionRule; error?: string }> {
  const isNew = !rule.id;
  const targetId = rule.id || `rule-${Date.now()}`;
  const record: CommissionRule = {
    id: targetId,
    rule_type: rule.rule_type || 'global',
    category_id: rule.category_id || null,
    company_id: rule.company_id || null,
    rate_percent: Number(rule.rate_percent) || 8.0,
    cap_amount_cents: rule.cap_amount_cents ? Number(rule.cap_amount_cents) : null,
    min_amount_cents: rule.min_amount_cents ? Number(rule.min_amount_cents) : null,
    tiers: rule.tiers || [],
    exempt_if_quote_credit_used: rule.exempt_if_quote_credit_used !== undefined ? rule.exempt_if_quote_credit_used : false,
    is_active: rule.is_active !== undefined ? rule.is_active : true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data, error } = await supabase.from('commission_rules').upsert(record).select().single();
      if (!error && data) {
        return { success: true, rule: data as CommissionRule };
      }
    }
  } catch {
    // fallback
  }

  if (isNew) {
    DEMO_COMMISSION_RULES.push(record);
  } else {
    DEMO_COMMISSION_RULES = DEMO_COMMISSION_RULES.map((r) => (r.id === targetId ? record : r));
  }

  return { success: true, rule: record };
}

export async function deleteCommissionRule(ruleId: string): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase.from('commission_rules').delete().eq('id', ruleId);
    }
  } catch {
    // fallback
  }

  DEMO_COMMISSION_RULES = DEMO_COMMISSION_RULES.filter((r) => r.id !== ruleId);
  return { success: true };
}

/**
 * Para formatlama yardımcısı (UI için)
 */
export function formatCentsToTRY(cents: number): string {
  return (
    (cents / 100).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₺'
  );
}
