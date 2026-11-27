/**
 * Admin yazışma görüntüleme – saf yardımcılar (veritabanına dokunmaz, test edilebilir).
 * Veriyi çeken kod: src/app/api/admin/conversations/*
 */

export const PAGE_SIZE = 25;
const MAX_PAGE = 1000;
const MAX_QUERY_LENGTH = 60;
const PREVIEW_LENGTH = 80;

export interface ListParams {
  page: number;
  q: string;
}

export function parseListParams(params: URLSearchParams): ListParams {
  const rawPage = Number.parseInt(params.get('page') || '1', 10);
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, MAX_PAGE) : 1;
  const q = (params.get('q') || '').trim().slice(0, MAX_QUERY_LENGTH);
  return { page, q };
}

/** ilike aramasında %, _ ve \ karakterlerini düz metin olarak aratır. */
export function escapeIlike(value: string): string {
  return value.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export interface ConversationRow {
  id: string;
  buyer_id: string;
  company_id: string;
  listing_id: string | null;
  last_message_at: string | null;
}

export interface ConversationSummary {
  id: string;
  buyerId: string;
  buyerName: string;
  companyId: string;
  companyName: string;
  listingId: string | null;
  lastMessageAt: string | null;
  preview: string;
  messageCount: number;
}

export function buildConversationSummaries(
  conversations: ConversationRow[],
  profiles: { id: string; full_name: string | null }[],
  companies: { id: string; name: string | null }[],
  lastMessages: { conversation_id: string; content: string | null; created_at: string }[],
  messageCounts: Record<string, number>
): ConversationSummary[] {
  const profileName = new Map(profiles.map((p) => [p.id, p.full_name]));
  const companyName = new Map(companies.map((c) => [c.id, c.name]));

  // Her konuşmanın en yeni mesajı
  const latest = new Map<string, { content: string | null; created_at: string }>();
  for (const m of lastMessages) {
    const current = latest.get(m.conversation_id);
    if (!current || m.created_at > current.created_at) latest.set(m.conversation_id, m);
  }

  return conversations
    .map((c) => {
      const text = (latest.get(c.id)?.content || '').replace(/\s+/g, ' ').trim();
      return {
        id: c.id,
        buyerId: c.buyer_id,
        buyerName: profileName.get(c.buyer_id) || 'Bilinmeyen kullanıcı',
        companyId: c.company_id,
        companyName: companyName.get(c.company_id) || 'Bilinmeyen firma',
        listingId: c.listing_id,
        lastMessageAt: c.last_message_at,
        preview: text.length > PREVIEW_LENGTH ? `${text.slice(0, PREVIEW_LENGTH)}…` : text,
        messageCount: messageCounts[c.id] || 0,
      };
    })
    .sort((a, b) => (b.lastMessageAt || '').localeCompare(a.lastMessageAt || ''));
}

export interface MessageRow {
  id: string;
  sender_id: string;
  content: string | null;
  created_at: string;
  is_deleted?: boolean | null;
  attachment_url?: string | null;
}

export interface ThreadMessage {
  id: string;
  side: 'buyer' | 'company';
  content: string;
  createdAt: string;
  isDeleted: boolean;
  hasAttachment: boolean;
}

/** Mesajları eskiden yeniye sıralar ve göndereni alıcı / firma olarak işaretler. */
export function buildThread(messages: MessageRow[], buyerId: string): ThreadMessage[] {
  return [...messages]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((m) => ({
      id: m.id,
      side: m.sender_id === buyerId ? ('buyer' as const) : ('company' as const),
      content: m.content || '',
      createdAt: m.created_at,
      isDeleted: !!m.is_deleted,
      hasAttachment: !!m.attachment_url,
    }));
}
