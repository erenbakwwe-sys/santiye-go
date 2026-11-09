import { createClient } from '@/lib/supabase/client';
import { Review } from '@/types/database';
import { DEMO_BOOKINGS } from './booking-service';
import { DEMO_QUOTES } from './quote-service';
import { sanitizeContent } from '@/lib/security/contact-masker';

export interface VerifiedReviewWithUser extends Review {
  buyer_name: string;
}

// In-Memory store for offline/demo operation
export const DEMO_REVIEWS: VerifiedReviewWithUser[] = [
  {
    id: 'rev-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    booking_id: 'book-0000-0000-0000-000000000001',
    listing_id: '10000000-0000-0000-0000-000000000001',
    buyer_id: 'buyer-demo-001',
    rating_overall: 4.8,
    rating_quality: 5,
    rating_timing: 4,
    rating_communication: 5,
    comment:
      'Tuzla şantiyemizdeki temel kazısı için kiraladık. CAT 320D ekskavatör tam vaktinde geldi. Operatör son derece tecrübeli ve İSG kurallarına tam uyumluydu. Teşekkürler.',
    company_reply:
      'Güzel yorumunuz için teşekkür ederiz Ahmet Bey. Şantiye GO üzerinden her zaman yanınızdayız.',
    company_reply_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    is_verified: true,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    buyer_name: 'Ahmet Yılmaz (Müteahhit)',
  },
  {
    id: 'rev-002',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    booking_id: null,
    listing_id: '10000000-0000-0000-0000-000000000002',
    buyer_id: 'buyer-demo-002',
    rating_overall: 4.7,
    rating_quality: 5,
    rating_timing: 5,
    rating_communication: 4,
    comment:
      'Mini ekskavatör dar alandaki drenaj işimizde çok iş gördü. Makine sıfır ayarındaydı, yakıt tüketimi oldukça ekonomikti.',
    company_reply: null,
    company_reply_at: null,
    is_verified: true,
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
    buyer_name: 'Mehmet Demir (Alt Taşeron)',
  },
];

export interface ReviewWithEscrowWeight extends Review {
  is_escrow_verified?: boolean;
  buyer_approved?: boolean; // True ONLY if explicit buyer approval was given (auto-release is false)
  verified_weight?: number;
  payment_status?: string;
  dispute_status?: string;
}

/**
 * Fetch dynamic escrow buyer approval multiplier from platform_settings table.
 * Defaults to 1.5 if table or setting is not configured.
 */
export async function getEscrowBuyerApprovalWeight(): Promise<number> {
  try {
    const supabase = createClient();
    const { data } = await supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'escrow_buyer_approval_weight')
      .maybeSingle();

    if (data?.value) {
      const parsed = parseFloat(String(data.value));
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
  } catch {
    // fallback to default
  }
  return 1.5;
}

/**
 * Prompt 9D + 9E Integration:
 * - Only platform-paid AND explicitly BUYER-APPROVED transactions count with the elevated confidence weight (buyerApprovalWeight from settings, e.g. 1.5x).
 * - Auto-released transactions (transferred without buyer approval upon timer expiration) are valid but receive standard 1.0x weight.
 * - Refunded or buyer-favored disputed jobs are strictly EXCLUDED from positive rating calculation.
 */
export function calculateEscrowWeightedTrust(
  reviews: ReviewWithEscrowWeight[],
  options?: { buyerApprovalWeight?: number }
): {
  bayesianScore: number | null;
  actualAvg: number | null;
  totalValidCount: number;
  escrowVerifiedCount: number;
  buyerApprovedCount: number;
  excludedDisputeCount: number;
} {
  const buyerApprovalWeight = options?.buyerApprovalWeight ?? 1.5;

  // 1. Exclude refunded and buyer-favored disputed jobs
  const validReviews = reviews.filter((r) => {
    if (r.payment_status === 'refunded' || r.dispute_status === 'resolved_buyer') {
      return false; // Excluded from company score
    }
    return true;
  });

  const excludedDisputeCount = reviews.length - validReviews.length;
  if (validReviews.length === 0) {
    return {
      bayesianScore: null,
      actualAvg: null,
      totalValidCount: 0,
      escrowVerifiedCount: 0,
      buyerApprovedCount: 0,
      excludedDisputeCount,
    };
  }

  let totalWeightedSum = 0;
  let totalEffectiveWeight = 0;
  let escrowVerifiedCount = 0;
  let buyerApprovedCount = 0;

  for (const r of validReviews) {
    // Elevate weight ONLY if explicitly buyer approved; auto-release without buyer approval receives standard 1.0
    let weight = r.verified_weight || 1.0;
    if (r.is_escrow_verified) {
      escrowVerifiedCount++;
      if (r.buyer_approved === true) {
        weight = buyerApprovalWeight;
        buyerApprovedCount++;
      } else {
        weight = 1.0; // Auto-release is not buyer approved
      }
    }
    totalWeightedSum += Number(r.rating_overall) * weight;
    totalEffectiveWeight += weight;
  }

  const R = totalWeightedSum / totalEffectiveWeight;
  const v = validReviews.length;
  const m = 3; // minimum threshold
  const C = 4.5; // platform prior benchmark

  const bayesianScore = (v / (v + m)) * R + (m / (v + m)) * C;

  return {
    bayesianScore: Number(bayesianScore.toFixed(2)),
    actualAvg: Number(R.toFixed(1)),
    totalValidCount: v,
    escrowVerifiedCount,
    buyerApprovedCount,
    excludedDisputeCount,
  };
}

export function calculateBayesianRating(
  reviews: Review[]
): { bayesianScore: number | null; actualAvg: number | null; totalCount: number } {
  const v = reviews.length;
  if (v === 0) {
    return { bayesianScore: null, actualAvg: null, totalCount: 0 };
  }

  const sum = reviews.reduce((acc, r) => acc + Number(r.rating_overall), 0);
  const R = sum / v;

  const m = 3; // minimum review threshold
  const C = 4.5; // platform prior average

  const bayesianScore = (v / (v + m)) * R + (m / (v + m)) * C;
  return {
    bayesianScore: Number(bayesianScore.toFixed(2)),
    actualAvg: Number(R.toFixed(1)),
    totalCount: v,
  };
}

export async function canUserReviewCompany(
  buyerId: string,
  companyId: string
): Promise<{ canReview: boolean; reason?: string }> {
  // Check completed bookings
  const hasCompletedBooking = DEMO_BOOKINGS.some(
    (b) => b.buyer_id === buyerId && b.company_id === companyId && b.status === 'approved'
  );

  // Check accepted quotes
  const hasAcceptedQuote = DEMO_QUOTES.some(
    (q) => q.company_id === companyId && q.status === 'accepted'
  );

  if (hasCompletedBooking || hasAcceptedQuote) {
    return { canReview: true };
  }

  return {
    canReview: false,
    reason:
      'Yalnızca bu firma ile tamamlanmış bir rezervasyonu veya kabul edilmiş teklifi olan kullanıcılar doğrulanmış puanlama yapabilir.',
  };
}

export async function getCompanyReviews(companyId: string): Promise<VerifiedReviewWithUser[]> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as any;
      }
    }
  } catch {
    // fallback
  }

  return DEMO_REVIEWS.filter((r) => r.company_id === companyId);
}

export async function getListingReviews(listingId: string): Promise<VerifiedReviewWithUser[]> {
  return DEMO_REVIEWS.filter((r) => r.listing_id === listingId);
}

export async function addReview(data: {
  company_id: string;
  listing_id?: string;
  booking_id?: string;
  buyer_id: string;
  rating_quality: number;
  rating_timing: number;
  rating_communication: number;
  comment: string;
}): Promise<{ success: boolean; review?: Review; error?: string }> {
  const check = await canUserReviewCompany(data.buyer_id, data.company_id);
  if (!check.canReview) {
    return { success: false, error: check.reason };
  }

  const overall = Number(
    ((data.rating_quality + data.rating_timing + data.rating_communication) / 3).toFixed(1)
  );

  const sanitizedComment = data.comment ? sanitizeContent(data.comment).maskedText : '';

  const newReview: VerifiedReviewWithUser = {
    id: `rev-${Date.now()}`,
    company_id: data.company_id,
    listing_id: data.listing_id || null,
    booking_id: data.booking_id || null,
    buyer_id: data.buyer_id,
    rating_overall: overall,
    rating_quality: data.rating_quality,
    rating_timing: data.rating_timing,
    rating_communication: data.rating_communication,
    comment: sanitizedComment,
    company_reply: null,
    company_reply_at: null,
    is_verified: true,
    is_demo: true,
    created_at: new Date().toISOString(),
    buyer_name: 'Ahmet Yılmaz (Müteahhit)',
  };

  DEMO_REVIEWS.unshift(newReview);
  return { success: true, review: newReview };
}

export async function addCompanyReply(
  reviewId: string,
  replyText: string
): Promise<{ success: boolean; error?: string }> {
  const review = DEMO_REVIEWS.find((r) => r.id === reviewId);
  if (!review) return { success: false, error: 'Değerlendirme bulunamadı.' };

  if (review.company_reply) {
    return { success: false, error: 'Bu değerlendirmeye zaten bir yanıt verilmiş.' };
  }

  const sanitizedReply = replyText ? sanitizeContent(replyText).maskedText : '';

  review.company_reply = sanitizedReply;
  review.company_reply_at = new Date().toISOString();
  return { success: true };
}
