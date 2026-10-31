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
    iban: 'TR330006100511123456789001',
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
    iban: 'TR550006100511123456789002',
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
  targetType: 'user' | 'company' | 'listing' | 'category' | 'setting' | 'payment' | 'subscription',
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
  return {
    totalUsers: 142,
    totalCompanies: DEMO_COMPANIES_FOR_VERIFICATION.length,
    activeListings: DEMO_LISTINGS.filter((l) => l.status === 'active').length,
    monthBookings: 28,
    totalVolumeCents: 184500000, // 1.845.000 ₺
    totalCommissionCents: 14760000, // 147.600 ₺
    pendingVerifications: DEMO_COMPANIES_FOR_VERIFICATION.filter(
      (c) => c.verification_status === 'pending'
    ).length,
    pendingReports: DEMO_REPORTS.filter((r) => r.status === 'pending').length,
  };
}

// Company Verification Workflow
export async function getCompaniesForVerification(): Promise<Company[]> {
  return DEMO_COMPANIES_FOR_VERIFICATION;
}

export async function verifyCompany(
  companyId: string,
  status: 'approved' | 'rejected',
  notes: string,
  adminId: string
): Promise<{ success: boolean }> {
  const comp = DEMO_COMPANIES_FOR_VERIFICATION.find((c) => c.id === companyId);
  if (comp) {
    comp.verification_status = status;
    comp.is_verified = status === 'approved';
    comp.verification_notes = notes || null;
    comp.verified_at = new Date().toISOString();
    comp.verified_by = adminId;
    if (status === 'approved' && !comp.sub_merchant_key) {
      comp.sub_merchant_key = `subm-${comp.id.slice(0, 8)}`;
    }
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
export async function getAdminListings(statusFilter: string = 'all'): Promise<Listing[]> {
  if (statusFilter === 'all') return DEMO_LISTINGS;
  return DEMO_LISTINGS.filter((l) => l.status === statusFilter);
}

export async function moderateListing(
  listingId: string,
  action: 'approve' | 'reject' | 'remove',
  reason: string,
  adminId: string
): Promise<{ success: boolean }> {
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
