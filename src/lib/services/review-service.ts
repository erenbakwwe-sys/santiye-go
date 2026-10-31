import { createClient } from '@/lib/supabase/client';
import { Review } from '@/types/database';
import { DEMO_BOOKINGS } from './booking-service';
import { DEMO_QUOTES } from './quote-service';

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

/**
 * Bayesian Weighted Rating calculation
 * Formula: WR = (v / (v + m)) * R + (m / (v + m)) * C
 * v: number of reviews
 * m: minimum review threshold (m = 3)
 * R: actual average rating
 * C: platform average benchmark (C = 4.5)
 */
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
    comment: data.comment,
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

  review.company_reply = replyText;
  review.company_reply_at = new Date().toISOString();
  return { success: true };
}
