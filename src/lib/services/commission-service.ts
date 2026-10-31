import { createClient } from '@/lib/supabase/client';
import { CommissionRule } from '@/types/database';
import { DEMO_PLATFORM_SETTINGS } from './admin-service';

export interface CommissionCalculationResult {
  amountCents: number;
  baseRatePercent: number;
  discountRatePercent: number;
  appliedRatePercent: number;
  commissionAmountCents: number;
  vatAmountCents: number;
  netCompanyAmountCents: number;
  ruleSource: 'company' | 'category' | 'global';
}

// In-Memory rules store for demo / offline operation
export const DEMO_COMMISSION_RULES: CommissionRule[] = [
  // 1. Kategori İstisnası: Ağır Nakliyat / Lowbed için %6 (Hacimli işlem teşviki)
  {
    id: 'rule-cat-lowbed',
    rule_type: 'category',
    category_id: 'd0000000-0000-0000-0000-000000000003', // Lowbed
    company_id: null,
    rate_percent: 6.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  // 2. Firma Özel İstisnası: Anadolu İş Makineleri için %7 özel oran
  {
    id: 'rule-comp-anadolu',
    rule_type: 'company',
    category_id: null,
    company_id: 'f0000000-0000-0000-0000-000000000001',
    rate_percent: 7.0,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

/**
 * Pure function: Calculates commission with exact integer cents and VAT separation.
 * Zero floating point artifacts.
 */
export function computeCommissionMath(
  amountCents: number,
  baseRatePercent: number,
  discountRatePercent: number = 0.0,
  ruleSource: 'company' | 'category' | 'global' = 'global'
): CommissionCalculationResult {
  if (amountCents < 0) {
    throw new Error('İşlem tutarı negatif olamaz.');
  }

  // 1. Apply plan discount
  const appliedRatePercent = Number(Math.max(0, baseRatePercent - discountRatePercent).toFixed(2));

  // 2. Exact integer cents math
  const commissionAmountCents = Math.round((amountCents * appliedRatePercent) / 100);
  const netCompanyAmountCents = amountCents - commissionAmountCents;

  // 3. VAT breakdown (%20 KDV included in platform service commission)
  const vatAmountCents = Math.round(commissionAmountCents - commissionAmountCents / 1.2);

  return {
    amountCents,
    baseRatePercent,
    discountRatePercent,
    appliedRatePercent,
    commissionAmountCents,
    vatAmountCents,
    netCompanyAmountCents,
    ruleSource,
  };
}

/**
 * Resolves rule hierarchy:
 * Priority 1: Company specific rule
 * Priority 2: Category specific rule
 * Priority 3: Global platform default
 */
export async function calculateCommissionForTransaction(params: {
  amountCents: number;
  companyId: string;
  categoryId?: string | null;
  planDiscountPercent?: number;
}): Promise<CommissionCalculationResult> {
  const { amountCents, companyId, categoryId, planDiscountPercent = 0.0 } = params;

  let baseRate = 8.0; // Global default fallback
  let ruleSource: 'company' | 'category' | 'global' = 'global';

  // 1. Check Company Specific Rule
  const companyRule = DEMO_COMMISSION_RULES.find(
    (r) => r.rule_type === 'company' && r.company_id === companyId && r.is_active
  );

  if (companyRule) {
    baseRate = companyRule.rate_percent;
    ruleSource = 'company';
  } else if (categoryId) {
    // 2. Check Category Specific Rule
    const categoryRule = DEMO_COMMISSION_RULES.find(
      (r) => r.rule_type === 'category' && r.category_id === categoryId && r.is_active
    );

    if (categoryRule) {
      baseRate = categoryRule.rate_percent;
      ruleSource = 'category';
    } else {
      // 3. Check Global Platform Setting
      const globalSetting = DEMO_PLATFORM_SETTINGS.default_commission_rate?.value?.rate_percent;
      if (globalSetting !== undefined) {
        baseRate = Number(globalSetting);
      }
      ruleSource = 'global';
    }
  }

  return computeCommissionMath(amountCents, baseRate, planDiscountPercent, ruleSource);
}

/**
 * Formatter helper for UI
 */
export function formatCentsToTRY(cents: number): string {
  return (
    (cents / 100).toLocaleString('tr-TR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + ' ₺'
  );
}
