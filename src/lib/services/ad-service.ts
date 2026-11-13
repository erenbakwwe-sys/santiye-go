import { AdProduct, AdCampaign, AdProductId, Listing } from '@/types/database';
import { DEMO_LISTINGS } from '@/lib/mock-data';
import { recordAnalyticsEvent } from './analytics-service';

export const DEFAULT_AD_PRODUCTS: AdProduct[] = [
  {
    id: 'showcase_home',
    name: 'Ana Sayfa Vitrini',
    description: 'Ana sayfa üst bandında görsel vitrin alanı. En yüksek marka bilinirliği ve ilk izlenim gücü.',
    slot_capacity: 6,
    price_7_days_cents: 75000, // 750 TL
    price_14_days_cents: 135000, // 1.350 TL
    price_30_days_cents: 245000, // 2.450 TL
    is_active: true,
  },
  {
    id: 'showcase_category',
    name: 'Kategori Vitrini',
    description: 'İlgili makine veya malzeme kategorisinin üst vitrin alanı. Kategori bazlı arayanlara doğrudan erişim.',
    slot_capacity: 4,
    price_7_days_cents: 50000, // 500 TL
    price_14_days_cents: 90000, // 900 TL
    price_30_days_cents: 165000, // 1.650 TL
    is_active: true,
  },
  {
    id: 'sponsored_listing',
    name: 'Sponsorlu Arama Sonucu',
    description: 'Arama listelerinde en üst 1-2 slotta belirgin Sponsorlu etiketiyle gösterim. Arama yapan müteahhitlere ilk sırada görünün.',
    slot_capacity: 2,
    price_7_days_cents: 60000, // 600 TL
    price_14_days_cents: 110000, // 1.100 TL
    price_30_days_cents: 195000, // 1.950 TL
    is_active: true,
  },
  {
    id: 'regional_ad',
    name: 'Bölgesel Hedefli Reklam',
    description: 'Seçtiğiniz il, ilçe veya şantiye çevresindeki yarıçap aramalarında öne çıkarak yerel lojistik avantajı kazanın.',
    slot_capacity: 3,
    price_7_days_cents: 45000, // 450 TL
    price_14_days_cents: 80000, // 800 TL
    price_30_days_cents: 145000, // 1.450 TL
    is_active: true,
  },
  {
    id: 'featured_company',
    name: 'Öne Çıkan Firma Profili',
    description: 'Firma rehberinde en üst sıralarda gösterim, altın onay rozeti ve kurumsal güvenilirlik vitrini.',
    slot_capacity: 5,
    price_7_days_cents: 40000, // 400 TL
    price_14_days_cents: 70000, // 700 TL
    price_30_days_cents: 125000, // 1.250 TL
    is_active: true,
  },
];

export let DEMO_CAMPAIGNS: AdCampaign[] = [
  {
    id: 'camp-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    product_id: 'sponsored_listing',
    listing_id: '10000000-0000-0000-0000-000000000001', // CAT 320D (İstanbul/Tuzla)
    title: 'Örnek: CAT 320D Sponsorlu Arama',
    target_city_id: 34, // İstanbul
    target_category_id: 'b0000000-0000-0000-0000-000000000001',
    target_radius_km: 50,
    pricing_model: 'fixed_duration',
    duration_days: 14,
    starts_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 11).toISOString(),
    total_price_cents: 110000,
    status: 'active',
    impressions_count: 342,
    clicks_count: 28,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    listing: DEMO_LISTINGS.find((l) => l.id === '10000000-0000-0000-0000-000000000001'),
  },
  {
    id: 'camp-002',
    company_id: 'f0000000-0000-0000-0000-000000000004',
    product_id: 'sponsored_listing',
    listing_id: '10000000-0000-0000-0000-000000000021', // Komatsu 21 Ton (Samsun/Tekkeköy)
    title: 'Örnek: Komatsu 21 Ton Karadeniz Sponsorlu',
    target_city_id: 55, // Samsun
    target_category_id: 'b0000000-0000-0000-0000-000000000001',
    target_radius_km: 50,
    pricing_model: 'fixed_duration',
    duration_days: 7,
    starts_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 5).toISOString(),
    total_price_cents: 60000,
    status: 'active',
    impressions_count: 184,
    clicks_count: 15,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date().toISOString(),
    listing: DEMO_LISTINGS.find((l) => l.id === '10000000-0000-0000-0000-000000000021'),
  },
  {
    id: 'camp-003',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    product_id: 'showcase_home',
    listing_id: '10000000-0000-0000-0000-000000000001',
    title: 'Örnek: Ana Sayfa Vitrin Ekskavatör',
    target_city_id: null,
    target_radius_km: null,
    pricing_model: 'fixed_duration',
    duration_days: 30,
    starts_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    expires_at: new Date(Date.now() + 86400000 * 25).toISOString(),
    total_price_cents: 245000,
    status: 'active',
    impressions_count: 1240,
    clicks_count: 76,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    updated_at: new Date().toISOString(),
    listing: DEMO_LISTINGS.find((l) => l.id === '10000000-0000-0000-0000-000000000001'),
  },
  {
    id: 'camp-004',
    company_id: 'f0000000-0000-0000-0000-000000000002',
    product_id: 'sponsored_listing',
    listing_id: '10000000-0000-0000-0000-000000000003',
    title: 'Örnek: Kocaeli Çimento Sponsorlu Arama',
    target_city_id: 41, // Kocaeli
    pricing_model: 'fixed_duration',
    duration_days: 7,
    starts_at: null,
    expires_at: null,
    total_price_cents: 60000,
    status: 'pending_moderation', // Admin incelemesinde
    impressions_count: 0,
    clicks_count: 0,
    is_demo: true,
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    updated_at: new Date().toISOString(),
    listing: DEMO_LISTINGS.find((l) => l.id === '10000000-0000-0000-0000-000000000003'),
  },
];

export async function getAdProducts(): Promise<AdProduct[]> {
  return DEFAULT_AD_PRODUCTS.filter((p) => p.is_active);
}

export function calculateAdPrice(
  product: AdProduct,
  durationDays: number,
  discountPercent: number = 0
): {
  grossCents: number;
  discountCents: number;
  netCents: number;
} {
  let grossCents = product.price_7_days_cents;
  if (durationDays === 14) {
    grossCents = product.price_14_days_cents;
  } else if (durationDays === 30) {
    grossCents = product.price_30_days_cents;
  }

  const discountCents = Math.round((grossCents * Math.max(0, discountPercent)) / 100);
  const netCents = Math.max(0, grossCents - discountCents);

  return { grossCents, discountCents, netCents };
}

export async function createAdCampaign(params: {
  companyId: string;
  productId: AdProductId;
  listingId?: string;
  title: string;
  targetCityId?: number | null;
  targetDistrictId?: number | null;
  targetCategoryId?: string | null;
  targetRadiusKm?: number | null;
  durationDays: number;
  discountPercent?: number;
}): Promise<{ success: boolean; campaign?: AdCampaign; error?: string }> {
  const product = DEFAULT_AD_PRODUCTS.find((p) => p.id === params.productId);
  if (!product) {
    return { success: false, error: 'Geçersiz reklam ürünü seçildi.' };
  }

  const { netCents } = calculateAdPrice(product, params.durationDays, params.discountPercent || 0);

  const newCampaign: AdCampaign = {
    id: `camp-${Date.now()}`,
    company_id: params.companyId,
    product_id: params.productId,
    listing_id: params.listingId || null,
    title: params.title,
    target_city_id: params.targetCityId || null,
    target_district_id: params.targetDistrictId || null,
    target_category_id: params.targetCategoryId || null,
    target_radius_km: params.targetRadiusKm || null,
    pricing_model: 'fixed_duration',
    duration_days: params.durationDays,
    total_price_cents: netCents,
    status: 'pending_payment',
    impressions_count: 0,
    clicks_count: 0,
    is_demo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    listing: params.listingId ? DEMO_LISTINGS.find((l) => l.id === params.listingId) : undefined,
    product,
  };

  DEMO_CAMPAIGNS.unshift(newCampaign);
  return { success: true, campaign: newCampaign };
}

export async function payAdCampaignWithSandbox(
  campaignId: string
): Promise<{ success: boolean; error?: string }> {
  const campaign = DEMO_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign) {
    return { success: false, error: 'Kampanya bulunamadı.' };
  }

  // Set to pending_moderation (admin must approve before live)
  campaign.status = 'pending_moderation';
  campaign.updated_at = new Date().toISOString();

  return { success: true };
}

export async function moderateAdCampaign(
  campaignId: string,
  decision: 'approve' | 'reject',
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  const campaign = DEMO_CAMPAIGNS.find((c) => c.id === campaignId);
  if (!campaign) {
    return { success: false, error: 'Kampanya bulunamadı.' };
  }

  if (decision === 'approve') {
    campaign.status = 'active';
    campaign.starts_at = new Date().toISOString();
    campaign.expires_at = new Date(Date.now() + 86400000 * campaign.duration_days).toISOString();
    campaign.moderation_notes = notes || 'Admin tarafından incelendi ve onaylandı.';
  } else {
    campaign.status = 'rejected';
    campaign.moderation_notes = notes || 'Reklam standartlarına uygun bulunmadı.';
    // 100% full automatic refund for rejected ads
  }

  campaign.updated_at = new Date().toISOString();
  return { success: true };
}

/**
 * Filter and resolve active ads for given slot and search criteria
 * Applying:
 * 1. Strict Geo & Category Matching (Ads never bypass filters)
 * 2. Slot Capacity Constraints
 * 3. Weighted Fair-Share Round-Robin rotation
 */
export function getActiveAdsForSlot(params: {
  productId: AdProductId;
  categoryId?: string | null;
  cityId?: number | null;
  radiusKm?: number | null;
  userCoords?: { lat: number; lng: number } | null;
  limit?: number;
}): { campaigns: AdCampaign[]; listings: Listing[] } {
  const now = new Date();

  // 1. Find all active and non-expired campaigns for product
  const activeCampaigns = DEMO_CAMPAIGNS.filter((c) => {
    if (c.status !== 'active') return false;
    if (c.product_id !== params.productId) return false;
    if (c.expires_at && new Date(c.expires_at) < now) return false;
    return true;
  });

  // 2. Strict Filter Matching (Never show irrelevant ads)
  const matchingCampaigns = activeCampaigns.filter((c) => {
    // If category specified, ensure match (or general ad)
    if (params.categoryId && c.target_category_id && c.target_category_id !== params.categoryId) {
      return false;
    }

    // If city filter specified, ensure match
    if (params.cityId && c.target_city_id && c.target_city_id !== params.cityId) {
      return false;
    }

    return true;
  });

  if (matchingCampaigns.length === 0) {
    return { campaigns: [], listings: [] };
  }

  const slotLimit = params.limit || (params.productId === 'sponsored_listing' ? 2 : 6);

  // 3. Weighted Fair-Share Round-Robin Rotation:
  // Sort by impressions_count ascending (least exposed gets served first)
  // to ensure all paying companies receive fair exposure
  const sortedByFairShare = [...matchingCampaigns].sort(
    (a, b) => a.impressions_count - b.impressions_count
  );

  const selectedCampaigns = sortedByFairShare.slice(0, slotLimit);

  // Increment impressions
  selectedCampaigns.forEach((c) => {
    c.impressions_count += 1;
    // Record impression in analytics
    recordAnalyticsEvent({
      event_type: 'ad_impression',
      target_type: 'ad_campaign',
      target_id: c.id,
      campaign_id: c.id,
      city_id: params.cityId || c.target_city_id || undefined,
      category_id: params.categoryId || c.target_category_id || undefined,
    });
  });

  const listings: Listing[] = [];
  selectedCampaigns.forEach((c) => {
    if (c.listing) {
      // Mark as sponsored
      const sponsoredListing: Listing = {
        ...c.listing,
        is_sponsored: true,
        ad_campaign_id: c.id,
      };
      listings.push(sponsoredListing);
    }
  });

  return { campaigns: selectedCampaigns, listings };
}

export function recordAdClick(campaignId: string): void {
  const campaign = DEMO_CAMPAIGNS.find((c) => c.id === campaignId);
  if (campaign) {
    campaign.clicks_count += 1;
    recordAnalyticsEvent({
      event_type: 'ad_click',
      target_type: 'ad_campaign',
      target_id: campaignId,
      campaign_id: campaignId,
    });
  }
}
