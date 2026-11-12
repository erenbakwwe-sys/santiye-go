import { createClient } from '@/lib/supabase/client';
import { QuoteRequest, Quote } from '@/types/database';
import { sanitizeContent } from '@/lib/security/contact-masker';
import { triggerControlledReveal } from './reveal-service';
import { getActiveProfile } from './auth-service';

const STORAGE_QUOTE_REQUESTS_KEY = 'santiyego_quote_requests_store';
const STORAGE_QUOTES_KEY = 'santiyego_quotes_store';

// Geriye dönük uyumluluk için boş demo koleksiyonları (sahte veri üretmez)
export const DEMO_QUOTES: Quote[] = [];
export const DEMO_QUOTE_REQUESTS: QuoteRequest[] = [];

function getStoredQuoteRequests(): QuoteRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_QUOTE_REQUESTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredQuoteRequest(req: QuoteRequest) {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredQuoteRequests();
    const existingIdx = list.findIndex((r) => r.id === req.id);
    if (existingIdx !== -1) {
      list[existingIdx] = req;
    } else {
      list.unshift(req);
    }
    localStorage.setItem(STORAGE_QUOTE_REQUESTS_KEY, JSON.stringify(list));
  } catch {}
}

function getStoredQuotes(): Quote[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_QUOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredQuote(quote: Quote) {
  if (typeof window === 'undefined') return;
  try {
    const list = getStoredQuotes();
    const existingIdx = list.findIndex((q) => q.id === quote.id);
    if (existingIdx !== -1) {
      list[existingIdx] = quote;
    } else {
      list.push(quote);
    }
    localStorage.setItem(STORAGE_QUOTES_KEY, JSON.stringify(list));
  } catch {}
}

// In-Memory Rate Limiting for Spam Prevention (max 5 requests per 10 mins)
const userRequestTimestamps: Record<string, number[]> = {};

export function checkSpamLimit(userId: string): { allowed: boolean; waitMinutes?: number } {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const limit = 5;

  if (!userRequestTimestamps[userId]) {
    userRequestTimestamps[userId] = [];
  }

  userRequestTimestamps[userId] = userRequestTimestamps[userId].filter((t) => now - t < windowMs);

  if (userRequestTimestamps[userId].length >= limit) {
    const oldest = userRequestTimestamps[userId][0];
    const waitMinutes = Math.ceil((oldest + windowMs - now) / 60000);
    return { allowed: false, waitMinutes };
  }

  userRequestTimestamps[userId].push(now);
  return { allowed: true };
}

/**
 * Gerçek kullanıcının buyer_id'sini döndürür
 */
async function getCurrentBuyerId(): Promise<string | null> {
  try {
    const profile = await getActiveProfile();
    return profile?.id || null;
  } catch {
    return null;
  }
}

export async function createQuoteRequest(
  data: Partial<QuoteRequest>
): Promise<{ success: boolean; request?: QuoteRequest; error?: string }> {
  // Gerçek kullanıcı ID'sini al
  const buyerId = data.buyer_id || (await getCurrentBuyerId());
  if (!buyerId) {
    return { success: false, error: 'Teklif talebi oluşturmak için giriş yapmalısınız.' };
  }

  // Spam Rate Limit Check
  const spamCheck = checkSpamLimit(buyerId);
  if (!spamCheck.allowed) {
    return {
      success: false,
      error: `Kısa sürede çok fazla teklif talebi gönderdiniz. Lütfen ${spamCheck.waitMinutes} dakika sonra tekrar deneyin.`,
    };
  }

  const sanitizedTitle = data.title ? sanitizeContent(data.title).maskedText : 'Şantiye İhtiyacı Teklif Talebi';
  const sanitizedDesc = data.description ? sanitizeContent(data.description).maskedText : '';

  const requestId = `qr-${Date.now()}`;
  const nowIso = new Date().toISOString();

  const newRequest: QuoteRequest = {
    id: requestId,
    buyer_id: buyerId,
    request_type: data.request_type || 'single_listing',
    listing_id: data.listing_id || null,
    category_id: data.category_id || 'b0000000-0000-0000-0000-000000000001',
    title: sanitizedTitle,
    description: sanitizedDesc,
    quantity: data.quantity || 1,
    start_date: data.start_date || nowIso.split('T')[0],
    end_date: data.end_date || null,
    city_id: data.city_id || null,
    district_id: data.district_id || null,
    address_detail: data.address_detail || null,
    lat: data.lat || null,
    lng: data.lng || null,
    need_operator: data.need_operator ?? false,
    need_fuel: data.need_fuel ?? false,
    need_transport: data.need_transport ?? false,
    status: 'sent',
    max_recipients: data.max_recipients || 10,
    search_radius_km: data.search_radius_km || 50,
    expires_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    is_demo: false,
    created_at: nowIso,
    updated_at: nowIso,
    quotes_count: 0,
    quotes: [],
  };

  // 1. Tarayıcı yerel saklama alanına kaydet (sayfa yenilense / oturum açılıp kapansa kaybolmaz)
  saveStoredQuoteRequest(newRequest);

  // 2. Canlı Supabase varsa senkronize et
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const insertPayload = {
        buyer_id: buyerId,
        request_type: newRequest.request_type,
        listing_id: newRequest.listing_id,
        category_id: newRequest.category_id,
        title: newRequest.title,
        description: newRequest.description,
        quantity: newRequest.quantity,
        start_date: newRequest.start_date,
        end_date: newRequest.end_date,
        city_id: newRequest.city_id,
        district_id: newRequest.district_id,
        address_detail: newRequest.address_detail,
        lat: newRequest.lat,
        lng: newRequest.lng,
        need_operator: newRequest.need_operator,
        need_fuel: newRequest.need_fuel,
        need_transport: newRequest.need_transport,
        status: newRequest.status,
        max_recipients: newRequest.max_recipients,
        search_radius_km: newRequest.search_radius_km,
        expires_at: newRequest.expires_at,
        is_demo: false,
      };

      const { data: dbData, error } = await supabase
        .from('quote_requests')
        .insert(insertPayload)
        .select()
        .single();

      if (!error && dbData) {
        saveStoredQuoteRequest(dbData as QuoteRequest);
        return { success: true, request: dbData as QuoteRequest };
      }
    }
  } catch (err) {
    console.warn('[createQuoteRequest] Supabase sync fallback to local store:', err);
  }

  return { success: true, request: newRequest };
}

export async function getBuyerQuoteRequests(buyerId: string): Promise<QuoteRequest[]> {
  if (!buyerId) return [];

  let results: QuoteRequest[] = [];

  // 1. Canlı Supabase'den çek
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
        .eq('is_demo', false)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        results = data as QuoteRequest[];
      }
    }
  } catch (err) {
    console.warn('[getBuyerQuoteRequests] Supabase fetch error:', err);
  }

  // 2. Yerel saklama alanındaki kullanıcının kendi talepleri ile birleştir
  const stored = getStoredQuoteRequests().filter((r) => r.buyer_id === buyerId);
  const storedQuotes = getStoredQuotes();

  for (const s of stored) {
    if (!results.some((r) => r.id === s.id)) {
      const reqQuotes = storedQuotes.filter((q) => q.request_id === s.id);
      results.push({
        ...s,
        quotes: reqQuotes,
        quotes_count: reqQuotes.length,
      });
    }
  }

  // Tarihe göre sırala
  return results.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getCompanyQuoteRequests(companyId: string): Promise<QuoteRequest[]> {
  if (!companyId) return [];

  let results: QuoteRequest[] = [];

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
          quotes:quotes(*),
          city:cities(name),
          district:districts(name)
        `)
        .eq('is_demo', false)
        .order('created_at', { ascending: false });

      if (!error && data) {
        results = (data || []).map((d: any) => ({
          ...d,
          city_name: d.city?.name,
          district_name: d.district?.name,
          quotes: (d.quotes || []).filter((q: any) => q.company_id === companyId),
        })) as QuoteRequest[];
      }
    }
  } catch {
    // fallback
  }

  // Yerel saklama alanındaki taleplerden de ekle
  const stored = getStoredQuoteRequests();
  const storedQuotes = getStoredQuotes();
  for (const s of stored) {
    if (!results.some((r) => r.id === s.id)) {
      results.push({
        ...s,
        quotes: storedQuotes.filter((q) => q.request_id === s.id && q.company_id === companyId),
      });
    }
  }

  return results;
}

export async function submitQuote(
  quoteData: Partial<Quote>
): Promise<{ success: boolean; quote?: Quote; error?: string }> {
  const sanitizedNotes = quoteData.notes ? sanitizeContent(quoteData.notes).maskedText : '';

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
    notes: sanitizedNotes,
    valid_until: new Date(Date.now() + 86400000 * 3).toISOString(),
    status: 'submitted',
    is_demo: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  saveStoredQuote(newQuote);

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('quotes').insert(newQuote).select().single();
      if (!error && data) {
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

  return { success: true, quote: newQuote };
}

export async function acceptQuote(
  quoteId: string,
  requestId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase
        .from('quotes')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', quoteId);

      await supabase
        .from('quote_requests')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', requestId);

      const { data: dbQuote } = await supabase
        .from('quotes')
        .select(`id, company_id, request:quote_requests(buyer_id)`)
        .eq('id', quoteId)
        .maybeSingle();

      if (dbQuote) {
        const buyerId = (dbQuote.request as any)?.buyer_id;
        if (buyerId) {
          await triggerControlledReveal({
            buyerId,
            companyId: dbQuote.company_id,
            quoteId: dbQuote.id,
            triggerType: 'teklif_kabul',
          });
        }
      }
    }
  } catch {
    // fallback
  }

  // Yerel depoda güncelle
  const quotes = getStoredQuotes();
  const q = quotes.find((x) => x.id === quoteId);
  if (q) {
    q.status = 'accepted';
    saveStoredQuote(q);
  }
  const requests = getStoredQuoteRequests();
  const r = requests.find((x) => x.id === requestId);
  if (r) {
    r.status = 'accepted';
    saveStoredQuoteRequest(r);
  }

  return { success: true };
}

export async function rejectQuote(quoteId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase
        .from('quotes')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', quoteId);
    }
  } catch {
    // fallback
  }

  const quotes = getStoredQuotes();
  const q = quotes.find((x) => x.id === quoteId);
  if (q) {
    q.status = 'rejected';
    saveStoredQuote(q);
  }

  return { success: true };
}
