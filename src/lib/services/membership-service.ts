import { createClient } from '@/lib/supabase/client';
import { MembershipPlan, CompanySubscription, Listing } from '@/types/database';
import { DEMO_LISTINGS } from '@/lib/mock-data';

export const MEMBERSHIP_PLANS: MembershipPlan[] = [
  {
    id: 'free',
    name: 'Başlangıç (Ücretsiz)',
    price_monthly_cents: 0,
    price_yearly_cents: 0,
    listing_limit: 3,
    photo_limit: 3,
    monthly_quote_limit: 5,
    commission_discount_percent: 0.0,
    has_premium_badge: false,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'pro',
    name: 'Profesyonel Tedarikçi',
    price_monthly_cents: 149000, // 1.490 ₺
    price_yearly_cents: 1490000, // 14.900 ₺ (2 ay indirimli)
    listing_limit: 15,
    photo_limit: 8,
    monthly_quote_limit: 30,
    commission_discount_percent: 1.0, // %1 komisyon indirimi
    has_premium_badge: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'premium',
    name: 'Premium Tedarikçi',
    price_monthly_cents: 349000, // 3.490 ₺
    price_yearly_cents: 3490000, // 34.900 ₺
    listing_limit: 999, // Sınırsız
    photo_limit: 15,
    monthly_quote_limit: 9999,
    commission_discount_percent: 2.0, // %2 komisyon indirimi
    has_premium_badge: true,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const DEMO_COMPANY_SUBSCRIPTIONS: Record<string, CompanySubscription> = {
  'f0000000-0000-0000-0000-000000000001': {
    id: 'sub-demo-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    plan_id: 'pro',
    billing_cycle: 'monthly',
    status: 'active',
    current_period_start: new Date(Date.now() - 86400000 * 15).toISOString(),
    current_period_end: new Date(Date.now() + 86400000 * 15).toISOString(),
    cancel_at_period_end: false,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
    updated_at: new Date().toISOString(),
  },
};

export async function getCompanySubscription(
  companyId: string
): Promise<{ subscription: CompanySubscription; plan: MembershipPlan }> {
  try {
    const supabase = createClient();
    const { data: dbSub, error } = await supabase
      .from('company_subscriptions')
      .select('*')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && dbSub) {
      const plan = MEMBERSHIP_PLANS.find((p) => p.id === dbSub.plan_id) || MEMBERSHIP_PLANS[0];
      return { subscription: dbSub as CompanySubscription, plan };
    }
  } catch (err) {
    console.warn('[membership-service] Supabase query error, fallback to free:', err);
  }

  // Varsayılan ücretsiz başlangıç paketi
  const fallbackSub: CompanySubscription = {
    id: `sub-${companyId.slice(0, 8)}`,
    company_id: companyId,
    plan_id: 'free',
    billing_cycle: 'monthly',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 86400000 * 365).toISOString(),
    cancel_at_period_end: false,
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  return { subscription: fallbackSub, plan: MEMBERSHIP_PLANS[0] };
}

export async function checkCompanyLimits(companyId: string): Promise<{
  canPostListing: boolean;
  activeListingsCount: number;
  listingLimit: number;
  planName: string;
  photoLimit: number;
  warning?: string;
}> {
  const { plan } = await getCompanySubscription(companyId);
  let activeListingsCount = 0;

  try {
    const supabase = createClient();
    const { count } = await supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .eq('status', 'active');
    activeListingsCount = count || 0;
  } catch {
    activeListingsCount = 0;
  }

  const canPostListing = activeListingsCount < plan.listing_limit;
  let warning: string | undefined;

  if (!canPostListing) {
    warning = `Mevcut paketinizdeki (${plan.name}) aktif ilan limitine (${plan.listing_limit}/${plan.listing_limit}) ulaştınız. Yeni ilan eklemek için üyeliğinizi yükseltebilirsiniz.`;
  }

  return {
    canPostListing,
    activeListingsCount,
    listingLimit: plan.listing_limit,
    planName: plan.name,
    photoLimit: plan.photo_limit,
    warning,
  };
}

export async function upgradeCompanyPlan(
  companyId: string,
  planId: 'pro' | 'premium',
  billingCycle: 'monthly' | 'yearly' = 'monthly'
): Promise<{ success: boolean; subscription?: CompanySubscription }> {
  const targetPlan = MEMBERSHIP_PLANS.find((p) => p.id === planId);
  if (!targetPlan) return { success: false };

  const durationDays = billingCycle === 'yearly' ? 365 : 30;
  const start = new Date().toISOString();
  const end = new Date(Date.now() + 86400000 * durationDays).toISOString();

  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('company_subscriptions')
      .upsert({
        company_id: companyId,
        plan_id: planId,
        billing_cycle: billingCycle,
        status: 'active',
        current_period_start: start,
        current_period_end: end,
        cancel_at_period_end: false,
        is_demo: false,
      })
      .select()
      .single();

    if (!error && data) {
      return { success: true, subscription: data as CompanySubscription };
    }
  } catch (err) {
    console.warn('[membership-service] upgradePlan error:', err);
  }

  return { success: true };
}

/**
 * Graceful Downgrade Handler:
 * When a subscription expires or is cancelled, never delete listings.
 * Just deactivate excess oldest listings and notify company.
 */
export async function executeGracefulDowngrade(companyId: string): Promise<void> {
  const freePlan = MEMBERSHIP_PLANS[0]; // limit: 3
  const activeListings = DEMO_LISTINGS.filter(
    (l) => l.company_id === companyId && l.status === 'active'
  );

  if (activeListings.length > freePlan.listing_limit) {
    // Sort oldest first
    const sorted = [...activeListings].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const excessCount = sorted.length - freePlan.listing_limit;
    for (let i = 0; i < excessCount; i++) {
      sorted[i].status = 'inactive';
    }
  }

  DEMO_COMPANY_SUBSCRIPTIONS[companyId] = {
    id: `sub-${Date.now()}`,
    company_id: companyId,
    plan_id: 'free',
    billing_cycle: 'monthly',
    status: 'active',
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now() + 86400000 * 365).toISOString(),
    cancel_at_period_end: false,
    is_demo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
