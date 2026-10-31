import { createClient } from '@/lib/supabase/client';
import { QuoteRequest, Quote, Listing } from '@/types/database';
import { DEMO_LISTINGS } from '@/lib/mock-data';
import { calculateDistanceKm } from '@/lib/geo';

// In-Memory store for offline/demo operation
export const DEMO_QUOTE_REQUESTS: QuoteRequest[] = [
  {
    id: 'qr-0000-0000-0000-000000000001',
    buyer_id: 'buyer-demo-001',
    request_type: 'single_listing',
    listing_id: '10000000-0000-0000-0000-000000000001',
    category_id: 'b0000000-0000-0000-0000-000000000001',
    title: 'Tuzla Şantiye Sahası İçin 22 Ton Ekskavatör Kiralama',
    description: '3 haftalık temel kazı çalışması için tecrübeli operatörlü 22 ton paletli ekskavatör teklifi talep ediyoruz. Mazot şantiye sahasında bizim tarafımızdan sağlanacaktır.',
    quantity: 1,
    start_date: '2026-11-05',
    end_date: '2026-11-26',
    city_id: 34,
    district_id: 104,
    address_detail: 'Tuzla Tepeören Şantiyesi',
    lat: 40.8841,
    lng: 29.3876,
    need_operator: true,
    need_fuel: false,
    need_transport: true,
    status: 'quotes_received',
    max_recipients: 1,
    search_radius_km: 50,
    expires_at: new Date(Date.now() + 86400000 * 5).toISOString(),
    is_demo: true,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date().toISOString(),
    city_name: 'İstanbul',
    district_name: 'Tuzla',
    quotes_count: 1,
  },
  {
    id: 'qr-0000-0000-0000-000000000002',
    buyer_id: 'buyer-demo-001',
    request_type: 'multi_vendor',
    listing_id: null,
    category_id: 'd0000000-0000-0000-0000-000000000003', // Lowbed
    title: 'Samsun - Ankara Arası 55 Ton İş Makinesi Taşıma (Lowbed)',
    slug: 'samsun-ankara-lowbed',
    description: 'Tekkeköy OSB şantiyesinden Ostim sanayi garajına 55 tonluk ekskavatör nakliyesi. Eskortlu ve sigortalı teklif rica olunur.',
    quantity: 1,
    start_date: '2026-11-10',
    end_date: '2026-11-12',
    city_id: 55,
    district_id: 701,
    address_detail: 'Samsun Tekkeköy OSB',
    lat: 41.2412,
    lng: 36.4215,
    need_operator: true,
    need_fuel: true,
    need_transport: true,
    status: 'quotes_received',
    max_recipients: 10,
    search_radius_km: 100,
    expires_at: new Date(Date.now() + 86400000 * 6).toISOString(),
    is_demo: true,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date().toISOString(),
    city_name: 'Samsun',
    district_name: 'Tekkeköy',
    quotes_count: 2,
  } as any,
];

export const DEMO_QUOTES: Quote[] = [
  {
    id: 'quote-0000-0000-0000-000000000001',
    request_id: 'qr-0000-0000-0000-000000000001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    listing_id: '10000000-0000-0000-0000-000000000001',
    price_total: 245000,
    price_unit: 11666,
    currency: 'TRY',
    is_operator_included: true,
    is_fuel_included: false,
    is_transport_included: true,
    notes: '21 günlük kiralama için nakliye gidiş-dönüş tarafımızca karşılanacaktır. CAT 320D 2021 model makine tahsis edilecektir.',
    valid_until: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'submitted',
    is_demo: true,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date().toISOString(),
    company: {
      name: '[DEMO] Anadolu İş Makineleri Parkı',
      phone: '+90 532 000 0101',
      whatsapp: '+905320000101',
      rating_avg: 4.8,
      review_count: 14,
    } as any,
    distance_km: 5.2,
  },
  {
    id: 'quote-0000-0000-0000-000000000002',
    request_id: 'qr-0000-0000-0000-000000000002',
    company_id: 'f0000000-0000-0000-0000-000000000004',
    listing_id: '10000000-0000-0000-0000-000000000023',
    price_total: 68000,
    price_unit: 68000,
    currency: 'TRY',
    is_operator_included: true,
    is_fuel_included: true,
    is_transport_included: true,
    notes: 'Samsun - Ankara güzergahı özel izin belgeleri, eskort ve ferdi kaza sigortası fiyata dahildir. 4 dingil hidrolik lowbed ile taşınır.',
    valid_until: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'submitted',
    is_demo: true,
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    updated_at: new Date().toISOString(),
    company: {
      name: '[DEMO] Karadeniz İş Makineleri Parkı',
      phone: '+90 532 000 0551',
      whatsapp: '+905320000551',
      rating_avg: 4.9,
      review_count: 19,
    } as any,
    distance_km: 2.1,
  },
];

// In-Memory Rate Limiting for Spam Prevention (max 5 requests per 10 mins)
const userRequestTimestamps: Record<string, number[]> = {};

export function checkSpamLimit(userId: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000; // 10 minutes
  const limit = 5;

  if (!userRequestTimestamps[userId]) {
    userRequestTimestamps[userId] = [];
  }

  // Filter out timestamps older than window
  userRequestTimestamps[userId] = userRequestTimestamps[userId].filter((t) => now - t < windowMs);

  if (userRequestTimestamps[userId].length >= limit) {
    const oldest = userRequestTimestamps[userId][0];
    const waitMinutes = Math.ceil((oldest + windowMs - now) / 60000);
    return { allowed: false, waitMinutes };
  }

  userRequestTimestamps[userId].push(now);
  return { allowed: true };
}

export async function createQuoteRequest(
  data: Partial<QuoteRequest>
): Promise<{ success: boolean; request?: QuoteRequest; error?: string }> {
  const buyerId = data.buyer_id || 'buyer-demo-001';

  // 1. Spam Rate Limit Check
  const spamCheck = checkSpamLimit(buyerId);
  if (!spamCheck.allowed) {
    return {
      success: false,
      error: `Kısa sürede çok fazla teklif talebi gönderdiniz. Lütfen ${spamCheck.waitMinutes} dakika sonra tekrar deneyin.`,
    };
  }

  const newRequest: QuoteRequest = {
    id: `qr-${Date.now()}`,
    buyer_id: buyerId,
    request_type: data.request_type || 'single_listing',
    listing_id: data.listing_id || null,
    category_id: data.category_id || 'b0000000-0000-0000-0000-000000000001',
    title: data.title || 'Şantiye İhtiyacı Teklif Talebi',
    description: data.description || '',
    quantity: data.quantity || 1,
    start_date: data.start_date || new Date().toISOString().split('T')[0],
    end_date: data.end_date || null,
    city_id: data.city_id || 34,
    district_id: data.district_id || null,
    address_detail: data.address_detail || null,
    lat: data.lat || 41.0,
    lng: data.lng || 29.0,
    need_operator: data.need_operator ?? false,
    need_fuel: data.need_fuel ?? false,
    need_transport: data.need_transport ?? false,
    status: 'sent',
    max_recipients: data.max_recipients || 10,
    search_radius_km: data.search_radius_km || 50,
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    is_demo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    quotes_count: 0,
  };

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data: dbData, error } = await supabase
        .from('quote_requests')
        .insert({
          ...newRequest,
          location:
            newRequest.lat && newRequest.lng
              ? `SRID=4326;POINT(${newRequest.lng} ${newRequest.lat})`
              : null,
        })
        .select()
        .single();

      if (!error && dbData) {
        return { success: true, request: dbData as QuoteRequest };
      }
    }
  } catch {
    // fallback
  }

  // Fallback to local memory store
  DEMO_QUOTE_REQUESTS.unshift(newRequest);
  return { success: true, request: newRequest };
}

export async function getBuyerQuoteRequests(buyerId: string): Promise<QuoteRequest[]> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('quote_requests')
        .select(`
          *,
          quotes:quotes(
            *,
            company:companies(name, phone, whatsapp, logo_url)
          ),
          city:cities(name),
          district:districts(name)
        `)
        .eq('buyer_id', buyerId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as QuoteRequest[];
      }
    }
  } catch {
    // fallback
  }

  // Return local demo requests with quotes populated
  return DEMO_QUOTE_REQUESTS.map((req) => ({
    ...req,
    quotes: DEMO_QUOTES.filter((q) => q.request_id === req.id),
    quotes_count: DEMO_QUOTES.filter((q) => q.request_id === req.id).length,
  }));
}

export async function getCompanyQuoteRequests(companyId: string): Promise<QuoteRequest[]> {
  // In demo mode return requests matching company location / category
  return DEMO_QUOTE_REQUESTS.map((req) => ({
    ...req,
    quotes: DEMO_QUOTES.filter((q) => q.request_id === req.id && q.company_id === companyId),
  }));
}

export async function submitQuote(
  quoteData: Partial<Quote>
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  const newQuote: Quote = {
    id: `quote-${Date.now()}`,
    request_id: quoteData.request_id!,
    company_id: quoteData.company_id || 'f0000000-0000-0000-0000-000000000001',
    listing_id: quoteData.listing_id || null,
    price_total: quoteData.price_total || 0,
    price_unit: quoteData.price_unit || null,
    currency: 'TRY',
    is_operator_included: quoteData.is_operator_included ?? false,
    is_fuel_included: quoteData.is_fuel_included ?? false,
    is_transport_included: quoteData.is_transport_included ?? false,
    notes: quoteData.notes || '',
    valid_until: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'submitted',
    is_demo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('quotes').insert(newQuote).select().single();
      if (!error && data) {
        // Update request status to 'quotes_received'
        await supabase
          .from('quote_requests')
          .update({ status: 'quotes_received' })
          .eq('id', quoteData.request_id);
        return { success: true, quote: data as Quote };
      }
    }
  } catch {
    // fallback
  }

  DEMO_QUOTES.push(newQuote);
  const targetReq = DEMO_QUOTE_REQUESTS.find((r) => r.id === quoteData.request_id);
  if (targetReq) {
    targetReq.status = 'quotes_received';
    targetReq.quotes_count = (targetReq.quotes_count || 0) + 1;
  }

  return { success: true, quote: newQuote };
}

export async function acceptQuote(
  quoteId: string,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  // Update quote status to accepted, reject others
  const quote = DEMO_QUOTES.find((q) => q.id === quoteId);
  if (quote) {
    quote.status = 'accepted';
  }
  const req = DEMO_QUOTE_REQUESTS.find((r) => r.id === requestId);
  if (req) {
    req.status = 'accepted';
  }
  return { success: true };
}

export async function rejectQuote(quoteId: string): Promise<{ success: boolean }> {
  const quote = DEMO_QUOTES.find((q) => q.id === quoteId);
  if (quote) {
    quote.status = 'rejected';
  }
  return { success: true };
}
