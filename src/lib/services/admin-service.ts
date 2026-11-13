import { createClient } from '@/lib/supabase/client';
import {
  AdminAuditLog,
  AdminRole,
  AdminUser,
  Category,
  Company,
  Listing,
  PaymentTransaction,
  PlatformSetting,
  Profile,
  Report,
} from '@/types/database';
import { CATEGORIES, DEMO_LISTINGS } from '@/lib/mock-data';

// Demo in-memory stores for Admin
export const DEMO_ADMIN_LOGS: AdminAuditLog[] = [
  {
    id: 'log-001',
    admin_id: 'admin-super-001',
    action: 'VERIFY_COMPANY_APPROVED',
    target_type: 'company',
    target_id: 'f0000000-0000-0000-0000-000000000001',
    ip_address: '127.0.0.1',
    details: { name: 'Anadolu İş Makineleri Parkı', status: 'approved' },
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    id: 'log-002',
    admin_id: 'admin-super-001',
    action: 'SETTING_COMMISSION_UPDATE',
    target_type: 'setting',
    target_id: 'default_commission_rate',
    ip_address: '127.0.0.1',
    details: { old_rate: 10.0, new_rate: 8.0 },
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
  },
];

export const DEMO_PLATFORM_SETTINGS: Record<string, PlatformSetting> = {
  default_commission_rate: {
    key: 'default_commission_rate',
    value: { rate_percent: 8.0 },
    description: 'Global varsayılan platform komisyon oranı (%)',
    updated_at: new Date().toISOString(),
  },
  booking_cancellation_hours: {
    key: 'booking_cancellation_hours',
    value: { hours: 24 },
    description: 'Rezervasyon başlangıç tarihinden kaç saat öncesine kadar cezasız iptal edilebilir',
    updated_at: new Date().toISOString(),
  },
  quote_request_auto_expire_hours: {
    key: 'quote_request_auto_expire_hours',
    value: { hours: 48 },
    description: 'Teklif ve rezervasyon talepleri için otomatik iptal süresi (saat)',
    updated_at: new Date().toISOString(),
  },
  platform_payout_escrow_days: {
    key: 'platform_payout_escrow_days',
    value: { days: 3 },
    description: 'İş tesliminden sonra şikayet bekleme ve satıcıya otomatik hakediş aktarım süresi (gün)',
    updated_at: new Date().toISOString(),
  },
};

export const DEMO_REPORTS: Report[] = [
  {
    id: 'rep-001',
    reporter_id: 'buyer-demo-001',
    reported_user_id: 'f0000000-0000-0000-0000-000000000002',
    listing_id: '10000000-0000-0000-0000-000000000004',
    reason: 'Fiyat Uyuşmazlığı',
    details: 'İlanda belirtilen tonaj fiyatı ile teklifte verilen fiyat arasında ciddi fark bulunuyor.',
    status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
  },
  {
    id: 'rep-002',
    reporter_id: 'buyer-demo-002',
    reported_user_id: 'f0000000-0000-0000-0000-000000000003',
    message_id: 'msg-001',
    reason: 'Kural Dışı Teklif',
    details: 'Platform dışından komisyonsuz nakit ödeme teklif edildi.',
    status: 'investigating',
    admin_notes: 'Firma ile görüşüldü, yazılı uyarı gönderilecek.',
    created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
  },
];

export const DEMO_COMPANIES_FOR_VERIFICATION: Company[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    user_id: 'e0000000-0000-0000-0000-000000000001',
    name: '[DEMO] Anadolu İş Makineleri Parkı',
    tax_office: 'Tuzla Vergi Dairesi',
    tax_number: '1234567890',
    legal_type: 'LIMITED_OR_JOINT_STOCK_COMPANY',
    tax_plate_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    signature_circular_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    verification_status: 'approved',
    sub_merchant_key: 'subm-anadolu-001',
    iban_last4: '9001',
    accept_online_payments: true,
    phone: '+90 532 000 0101',
    city_name: 'İstanbul',
    district_name: 'Tuzla',
    is_verified: true,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    user_id: 'e0000000-0000-0000-0000-000000000002',
    name: '[DEMO] Marmara Yapı & Lojistik Deposu',
    tax_office: 'Gebze İhtisas Vergi Dairesi',
    tax_number: '9876543210',
    legal_type: 'LIMITED_OR_JOINT_STOCK_COMPANY',
    tax_plate_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    signature_circular_url: 'https://images.unsplash.com/photo-1450133064473-71024230f91b?auto=format&fit=crop&w=800&q=80',
    verification_status: 'pending',
    sub_merchant_key: null,
    iban_last4: '9002',
    accept_online_payments: true,
    phone: '+90 532 000 0102',
    city_name: 'Kocaeli',
    district_name: 'Gebze',
    is_verified: false,
    is_demo: true,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    user_id: 'e0000000-0000-0000-0000-000000000003',
    name: '[DEMO] Başkent Ağır Nakliyat & Lowbed',
    tax_office: 'Yenimahalle Vergi Dairesi',
    tax_number: '4455667788',
    legal_type: 'PRIVATE_COMPANY',
    tax_plate_url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=800&q=80',
    verification_status: 'rejected',
    verification_notes: 'Vergi levhası okunaksız ve IBAN mükellef adına değil.',
    sub_merchant_key: null,
    phone: '+90 532 000 0103',
    city_name: 'Ankara',
    district_name: 'Ostim',
    is_verified: false,
    is_demo: true,
    created_at: new Date(Date.now() - 3600000 * 40).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Audit Logger
export async function logAdminAction(
  adminId: string,
  action: string,
  targetType: 'user' | 'company' | 'listing' | 'category' | 'setting' | 'payment' | 'subscription' | 'compliance_log' | 'profile',
  targetId: string | null,
  details?: Record<string, any>
): Promise<void> {
  const log: AdminAuditLog = {
    id: `log-${Date.now()}`,
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    ip_address: '127.0.0.1',
    details: details || null,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    await supabase.from('admin_audit_logs').insert(log);
  } catch {
    // fallback
  }

  DEMO_ADMIN_LOGS.unshift(log);
}

// Dashboard Metrics
export async function getAdminDashboardMetrics() {
  try {
    const supabase = createClient();
    const [
      { count: totalUsers },
      { count: totalCompanies },
      { count: activeListings },
      { count: pendingVerifications },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('companies').select('*', { count: 'exact', head: true }),
      supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'active'),
      supabase.from('companies').select('*', { count: 'exact', head: true }).eq('is_verified', false),
    ]);

    return {
      totalUsers: totalUsers ?? 6,
      totalCompanies: totalCompanies ?? 5,
      activeListings: activeListings ?? 1,
      monthBookings: 0,
      totalVolumeCents: 0,
      totalCommissionCents: 0,
      pendingVerifications: pendingVerifications ?? 5,
      pendingReports: 0,
    };
  } catch (err) {
    console.warn('[admin-service] getAdminDashboardMetrics error:', err);
  }

  return {
    totalUsers: 6,
    totalCompanies: DEMO_COMPANIES_FOR_VERIFICATION.length,
    activeListings: DEMO_LISTINGS.filter((l) => l.status === 'active').length,
    monthBookings: 28,
    totalVolumeCents: 184500000,
    totalCommissionCents: 14760000,
    pendingVerifications: DEMO_COMPANIES_FOR_VERIFICATION.filter(
      (c) => c.verification_status === 'pending'
    ).length,
    pendingReports: DEMO_REPORTS.filter((r) => r.status === 'pending').length,
  };
}

// Company Verification Workflow
export async function getCompaniesForVerification(): Promise<Company[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('companies')
      .select(`
        *,
        city:cities(name),
        district:districts(name)
      `)
      .order('created_at', { ascending: false });

    if (!error && data && data.length > 0) {
      return data.map((c) => ({
        ...c,
        city_name: c.city?.name || 'Belirtilmedi',
        district_name: c.district?.name || '',
      }));
    }
  } catch (err) {
    console.warn('[admin-service] getCompanies error:', err);
  }
  return DEMO_COMPANIES_FOR_VERIFICATION;
}

export async function verifyCompany(
  companyId: string,
  status: 'approved' | 'rejected',
  notes: string,
  adminId: string
): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const updatePayload: Record<string, any> = {
      is_verified: status === 'approved',
      verification_status: status,
      verification_notes: notes || null,
      verified_at: new Date().toISOString(),
      verified_by: adminId,
    };
    if (status === 'approved') {
      updatePayload.sub_merchant_status = 'approved';
    }

    const { error } = await supabase
      .from('companies')
      .update(updatePayload)
      .eq('id', companyId);

    if (error) {
      console.warn('[admin-service] verifyCompany update error:', error);
    }
  } catch (err) {
    console.warn('[admin-service] verifyCompany error:', err);
  }

  const comp = DEMO_COMPANIES_FOR_VERIFICATION.find((c) => c.id === companyId);
  if (comp) {
    comp.verification_status = status;
    comp.is_verified = status === 'approved';
    comp.verification_notes = notes || null;
    comp.verified_at = new Date().toISOString();
    comp.verified_by = adminId;
  }

  await logAdminAction(
    adminId,
    status === 'approved' ? 'VERIFY_COMPANY_APPROVED' : 'VERIFY_COMPANY_REJECTED',
    'company',
    companyId,
    { status, notes }
  );

  return { success: true };
}

// Listing Moderation
export async function getAdminListings(statusFilter = 'all'): Promise<Listing[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('listings')
      .select(`
        *,
        company:companies(name, logo_url, phone),
        category:categories(name, slug),
        city:cities(name),
        district:districts(name)
      `)
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const { data, error } = await query;
    if (!error && data && data.length > 0) {
      return data.map((l) => ({
        ...l,
        company_name: l.company?.name || 'Firma',
        category_name: l.category?.name || 'Genel',
        city_name: l.city?.name || '',
        district_name: l.district?.name || '',
      }));
    }
  } catch (err) {
    console.warn('[admin-service] getAdminListings error:', err);
  }

  if (statusFilter === 'all') return DEMO_LISTINGS;
  return DEMO_LISTINGS.filter((l) => l.status === statusFilter);
}

export async function moderateListing(
  listingId: string,
  action: 'approve' | 'reject' | 'remove',
  reason: string,
  adminId: string
): Promise<{ success: boolean }> {
  try {
    // 1. Önce sunucu moderasyon API'sini çağır
    if (typeof window !== 'undefined') {
      await fetch('/api/admin/listings/moderate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId, action, reason }),
      }).catch(() => {});
    }

    // 2. Doğrudan istemci supabase client güncellemesi
    const supabase = createClient();
    const newStatus = action === 'approve' ? 'active' : 'inactive';
    await supabase.from('listings').update({ status: newStatus }).eq('id', listingId);
  } catch (err) {
    console.warn('[admin-service] moderateListing error:', err);
  }

  const listing = DEMO_LISTINGS.find((l) => l.id === listingId);
  if (listing) {
    if (action === 'approve') listing.status = 'active';
    else if (action === 'reject' || action === 'remove') listing.status = 'inactive';
  }

  await logAdminAction(adminId, `LISTING_${action.toUpperCase()}`, 'listing', listingId, {
    action,
    reason,
  });

  return { success: true };
}

// Category Management
export async function getAdminCategories(): Promise<Category[]> {
  return CATEGORIES;
}

export async function saveCategory(
  category: Partial<Category>,
  adminId: string
): Promise<{ success: boolean; category?: Category }> {
  let savedCat: Category;
  const existingIdx = CATEGORIES.findIndex((c) => c.id === category.id);

  if (existingIdx >= 0) {
    CATEGORIES[existingIdx] = { ...CATEGORIES[existingIdx], ...category } as Category;
    savedCat = CATEGORIES[existingIdx];
  } else {
    savedCat = {
      id: `cat-${Date.now()}`,
      name: category.name || 'Yeni Kategori',
      slug: category.slug || `cat-${Date.now()}`,
      order_index: category.order_index || CATEGORIES.length + 1,
      is_active: category.is_active ?? true,
      created_at: new Date().toISOString(),
      subcategories: category.subcategories || [],
    };
    CATEGORIES.push(savedCat);
  }

  await logAdminAction(adminId, 'CATEGORY_SAVED', 'category', savedCat.id, {
    name: savedCat.name,
  });

  return { success: true, category: savedCat };
}

// Reports Desk
export async function getAdminReports(): Promise<Report[]> {
  return DEMO_REPORTS;
}

export async function resolveReport(
  reportId: string,
  status: 'resolved' | 'dismissed',
  adminNotes: string,
  adminId: string
): Promise<{ success: boolean }> {
  const rep = DEMO_REPORTS.find((r) => r.id === reportId);
  if (rep) {
    rep.status = status;
    rep.admin_notes = adminNotes;
    rep.resolved_by = adminId;
    rep.resolved_at = new Date().toISOString();
  }

  await logAdminAction(adminId, `REPORT_${status.toUpperCase()}`, 'user', reportId, {
    status,
    adminNotes,
  });

  return { success: true };
}

// Platform Settings
export async function getPlatformSettings(): Promise<Record<string, PlatformSetting>> {
  return DEMO_PLATFORM_SETTINGS;
}

export async function updatePlatformSetting(
  key: string,
  value: Record<string, any>,
  adminId: string
): Promise<{ success: boolean }> {
  const existing = DEMO_PLATFORM_SETTINGS[key];
  const oldVal = existing ? existing.value : null;

  DEMO_PLATFORM_SETTINGS[key] = {
    key,
    value,
    description: existing?.description,
    updated_by: adminId,
    updated_at: new Date().toISOString(),
  };

  await logAdminAction(adminId, 'SETTING_UPDATED', 'setting', key, {
    old_value: oldVal,
    new_value: value,
  });

  return { success: true };
}


// ==========================================
// PROMPT 9A: İLETİŞİM KORUMA & DENETİM SERVİSİ
// ==========================================

export interface ComplianceLogItem {
  id: string;
  user_id: string;
  user_name?: string;
  detected_types: string[];
  target_entity_type: string;
  is_false_positive_reported: boolean;
  false_positive_notes?: string;
  false_positive_status: 'none' | 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface OffenderProfile {
  user_id: string;
  full_name: string;
  role: 'buyer' | 'company';
  company_name?: string;
  mask_violation_count: number;
  compliance_status: 'good_standing' | 'warned' | 'suspended';
  last_violation_at: string;
}

export const DEMO_COMPLIANCE_LOGS: ComplianceLogItem[] = [
  {
    id: 'comp-001',
    user_id: 'buyer-demo-002',
    user_name: 'Mehmet Demir (Alt Taşeron)',
    detected_types: ['phone'],
    target_entity_type: 'message',
    is_false_positive_reported: false,
    false_positive_status: 'none',
    created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'comp-002',
    user_id: 'buyer-demo-002',
    user_name: 'Mehmet Demir (Alt Taşeron)',
    detected_types: ['social_keyword', 'phone'],
    target_entity_type: 'message',
    is_false_positive_reported: false,
    false_positive_status: 'none',
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    id: 'comp-003',
    user_id: 'buyer-demo-003',
    user_name: 'Kemal Can (Hafriyatçı)',
    detected_types: ['phone'],
    target_entity_type: 'quote_notes',
    is_false_positive_reported: true,
    false_positive_notes: 'Makine motor gücü ve saatlik tüketimini belirttim, numara yazmadım.',
    false_positive_status: 'pending',
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
  },
  {
    id: 'comp-004',
    user_id: 'f0000000-0000-0000-0000-000000000003',
    user_name: 'Başkent Ağır Nakliyat',
    detected_types: ['iban'],
    target_entity_type: 'message',
    is_false_positive_reported: false,
    false_positive_status: 'none',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export const DEMO_REPEAT_OFFENDERS: OffenderProfile[] = [
  {
    user_id: 'buyer-demo-002',
    full_name: 'Mehmet Demir',
    role: 'buyer',
    company_name: 'Demir Altyapı Ltd.',
    mask_violation_count: 4,
    compliance_status: 'warned',
    last_violation_at: new Date(Date.now() - 3600000 * 2).toISOString(),
  },
  {
    user_id: 'f0000000-0000-0000-0000-000000000003',
    full_name: 'Başkent Nakliyat İrtibat',
    role: 'company',
    company_name: 'Başkent Ağır Nakliyat',
    mask_violation_count: 3,
    compliance_status: 'good_standing',
    last_violation_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
];

export async function getComplianceStats(): Promise<{
  totalMasked: number;
  phoneCount: number;
  emailCount: number;
  ibanCount: number;
  socialCount: number;
  disputeCount: number;
  repeatOffenderCount: number;
  softModeRevealCount: number;
}> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data: logs } = await supabase.from('compliance_mask_logs').select('*');
      if (logs && logs.length > 0) {
        let phone = 0, email = 0, iban = 0, social = 0, disputes = 0;
        logs.forEach((l) => {
          const t: string[] = l.detected_types || [];
          if (t.includes('phone')) phone++;
          if (t.includes('email')) email++;
          if (t.includes('iban')) iban++;
          if (t.includes('social_keyword') || t.includes('domain_url')) social++;
          if (l.is_false_positive_reported && l.false_positive_status === 'pending') disputes++;
        });

        const { count: offendersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .gte('mask_violation_count', 3);

        const { count: revealCount } = await supabase
          .from('phone_reveal_daily_logs')
          .select('*', { count: 'exact', head: true });

        return {
          totalMasked: logs.length,
          phoneCount: phone,
          emailCount: email,
          ibanCount: iban,
          socialCount: social,
          disputeCount: disputes,
          repeatOffenderCount: offendersCount || 0,
          softModeRevealCount: revealCount || 12,
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    totalMasked: DEMO_COMPLIANCE_LOGS.length + 8,
    phoneCount: 7,
    emailCount: 2,
    ibanCount: 1,
    socialCount: 2,
    disputeCount: 1,
    repeatOffenderCount: 2,
    softModeRevealCount: 12,
  };
}

export async function getComplianceDisputes(): Promise<ComplianceLogItem[]> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('compliance_mask_logs')
        .select('*')
        .eq('is_false_positive_reported', true)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as ComplianceLogItem[];
      }
    }
  } catch {
    // fallback
  }

  return DEMO_COMPLIANCE_LOGS.filter((l) => l.is_false_positive_reported);
}

export async function resolveComplianceDispute(
  logId: string,
  status: 'approved' | 'rejected',
  adminNotes?: string,
  adminId: string = 'admin-super-001'
): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase
        .from('compliance_mask_logs')
        .update({
          false_positive_status: status,
          reviewed_by: adminId,
          reviewed_at: new Date().toISOString(),
        })
        .eq('id', logId);
    }
  } catch {
    // fallback
  }

  const found = DEMO_COMPLIANCE_LOGS.find((l) => l.id === logId);
  if (found) {
    found.false_positive_status = status;
  }

  await logAdminAction(adminId, `COMPLIANCE_DISPUTE_${status.toUpperCase()}`, 'compliance_log', logId, {
    status,
    adminNotes,
  });

  return { success: true };
}

export async function getRepeatOffendersList(): Promise<OffenderProfile[]> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          user_id:id,
          full_name,
          role,
          mask_violation_count,
          compliance_status
        `)
        .gte('mask_violation_count', 1)
        .order('mask_violation_count', { ascending: false });

      if (!error && data) {
        return data.map((d: any) => ({
          ...d,
          last_violation_at: new Date().toISOString(),
        }));
      }
    }
  } catch {
    // fallback
  }

  return DEMO_REPEAT_OFFENDERS;
}

export async function takeOffenderAction(
  userId: string,
  action: 'warn' | 'suspend' | 'clear',
  adminId: string = 'admin-super-001'
): Promise<{ success: boolean }> {
  const newStatus = action === 'suspend' ? 'suspended' : action === 'warn' ? 'warned' : 'good_standing';

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase
        .from('profiles')
        .update({
          compliance_status: newStatus,
          mask_violation_count: action === 'clear' ? 0 : undefined,
        })
        .eq('id', userId);
    }
  } catch {
    // fallback
  }

  const offender = DEMO_REPEAT_OFFENDERS.find((o) => o.user_id === userId);
  if (offender) {
    offender.compliance_status = newStatus;
    if (action === 'clear') offender.mask_violation_count = 0;
  }

  await logAdminAction(adminId, `OFFENDER_ACTION_${action.toUpperCase()}`, 'profile', userId, {
    action,
    newStatus,
  });

  return { success: true };
}

export async function getAntiLeakSettings(): Promise<{
  contactRevealRule: 'teklif_kabul' | 'odeme' | 'talep_kredisi' | 'numara_goster_butonu';
  violationThreshold: number;
  softModeDailyLimit: number;
  forbiddenKeywords: string;
}> {
  return {
    contactRevealRule: 'teklif_kabul',
    violationThreshold: 3,
    softModeDailyLimit: 3,
    forbiddenKeywords: 'whatsapp, wp, watsap, telegram, t.me, instagram, insta, özelden yaz, elden anlaşalım, komisyonsuz, telefonumu ara',
  };
}

export async function updateAntiLeakSettings(
  settings: {
    contactRevealRule: string;
    violationThreshold: number;
    softModeDailyLimit: number;
    forbiddenKeywords: string;
  },
  adminId: string = 'admin-super-001'
): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const keywordList = settings.forbiddenKeywords.split(',').map((k) => k.trim()).filter(Boolean);

      await Promise.all([
        supabase.from('system_settings').upsert({
          key: 'contact_reveal_rule',
          value: { rule: settings.contactRevealRule },
          description: 'İletişim bilgisi kontrollü açılış kuralı',
        }),
        supabase.from('system_settings').upsert({
          key: 'mask_violation_threshold',
          value: { threshold: settings.violationThreshold },
          description: 'Tekrarlayan ihlal eşiği',
        }),
        supabase.from('system_settings').upsert({
          key: 'soft_mode_daily_limit',
          value: { limit: settings.softModeDailyLimit },
          description: 'Yumuşak mod günlük numara gösterim kotası',
        }),
        supabase.from('system_settings').upsert({
          key: 'forbidden_contact_keywords',
          value: { keywords: keywordList },
          description: 'Dinamik yasaklı yönlendirme kelimeleri',
        }),
      ]);
    }
  } catch {
    // fallback
  }

  await logAdminAction(adminId, 'ANTI_LEAK_SETTINGS_UPDATED', 'setting', 'anti_leak_config', settings);
  return { success: true };
}
