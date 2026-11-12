import { createClient } from '@/lib/supabase/client';
import { Conversation, Message } from '@/types/database';
import { sanitizeContent, MaskDetectedType } from '@/lib/security/contact-masker';

export interface DemoConversation extends Conversation {
  other_user_name: string;
  other_user_role: string;
  listing_title?: string;
  unread_count: number;
  last_message?: string;
  last_message_at?: string;
}

const STORAGE_CONVERSATIONS_KEY = 'santiyego_conversations_store';
const STORAGE_MESSAGES_KEY_PREFIX = 'santiyego_messages_store_';

// Geriye dönük uyumluluk için boş demo koleksiyonları
export const DEMO_CONVERSATIONS: DemoConversation[] = [];
export const DEMO_MESSAGES: Record<string, Message[]> = {};

// Node.js test ve SSR ortamı için in-memory defter
const memConversations: DemoConversation[] = [];
const memMessages: Record<string, Message[]> = {};

function getStoredConversations(): DemoConversation[] {
  if (typeof window === 'undefined') return [...memConversations];
  try {
    const raw = localStorage.getItem(STORAGE_CONVERSATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredConversations(convs: DemoConversation[]) {
  if (typeof window === 'undefined') {
    memConversations.length = 0;
    memConversations.push(...convs);
    return;
  }
  try {
    localStorage.setItem(STORAGE_CONVERSATIONS_KEY, JSON.stringify(convs));
  } catch {}
}

function getStoredMessages(convId: string): Message[] {
  if (typeof window === 'undefined') return [...(memMessages[convId] || [])];
  try {
    const raw = localStorage.getItem(STORAGE_MESSAGES_KEY_PREFIX + convId);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStoredMessages(convId: string, msgs: Message[]) {
  if (typeof window === 'undefined') {
    memMessages[convId] = [...msgs];
    return;
  }
  try {
    localStorage.setItem(STORAGE_MESSAGES_KEY_PREFIX + convId, JSON.stringify(msgs));
  } catch {}
}

export async function getConversations(userId: string): Promise<DemoConversation[]> {
  if (!userId) return [];

  let results: DemoConversation[] = [];

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          listing:listings(title),
          messages:messages(body, created_at, is_read, sender_id)
        `)
        .or(`buyer_id.eq.${userId},company_id.eq.${userId}`)
        .order('updated_at', { ascending: false });

      if (!error && data && data.length > 0) {
        results = data.map((d: any) => ({
          ...d,
          other_user_name: d.buyer_id === userId ? (d.company_name || 'Firma') : (d.buyer_name || 'Alıcı'),
          other_user_role: d.buyer_id === userId ? 'company' : 'buyer',
          listing_title: d.listing?.title,
          unread_count: (d.messages || []).filter((m: any) => !m.is_read && m.sender_id !== userId).length,
          last_message: d.messages?.[d.messages.length - 1]?.body,
          last_message_at: d.messages?.[d.messages.length - 1]?.created_at,
        }));
      }
    }
  } catch {
    // fallback
  }

  // Yerel saklama alanındaki konuşmalar ile birleştir (kullanıcının kendi konuşmaları)
  const stored = getStoredConversations().filter(
    (c) => c.buyer_id === userId || c.company_id === userId
  );

  for (const s of stored) {
    if (!results.some((r) => r.id === s.id)) {
      results.push(s);
    }
  }

  return results.sort(
    (a, b) => new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
  );
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  if (!conversationId) return [];

  let results: Message[] = [];

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        results = data as Message[];
      }
    }
  } catch {
    // fallback
  }

  // Yerel mesajlar ile birleştir
  const stored = getStoredMessages(conversationId);
  for (const s of stored) {
    if (!results.some((r) => r.id === s.id)) {
      results.push(s);
    }
  }

  return results.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  attachmentUrl?: string | null
): Promise<{
  success: boolean;
  message?: Message;
  error?: string;
  isMasked?: boolean;
  detectedTypes?: MaskDetectedType[];
  infoNotice?: string;
  logId?: string;
}> {
  if (!body.trim() && !attachmentUrl) {
    return { success: false, error: 'Mesaj içeriği boş olamaz.' };
  }

  const supabase = createClient();
  const isSupabaseConfigured =
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

  let allowContact = false;

  // İki taraf arasında onaylanmış iletişim kartı veya onaylı anlaşma var mı kontrol et
  if (isSupabaseConfigured) {
    try {
      const { data: conv } = await supabase
        .from('conversations')
        .select('buyer_id, company_id')
        .eq('id', conversationId)
        .maybeSingle();

      if (conv) {
        const { data: reveal } = await supabase
          .from('contact_reveals')
          .select('id')
          .eq('buyer_id', conv.buyer_id)
          .eq('company_id', conv.company_id)
          .maybeSingle();

        if (reveal) {
          allowContact = true;
        }
      }
    } catch {
      // sessizce devam et
    }
  }

  // Merkezi Güvenli İçerik Tarayıcısı
  const maskRes = sanitizeContent(body.trim(), { allowContact });
  const finalBody = maskRes.sanitizedText;
  let complianceLogId = `log-${Date.now()}`;

  // Eğer maskeleme yapıldıysa KVKK uyumlu log tut
  if (maskRes.isMasked && isSupabaseConfigured) {
    try {
      const { data: logData } = await supabase
        .from('compliance_mask_logs')
        .insert({
          user_id: senderId.includes('demo') ? null : senderId,
          entity_type: 'message',
          entity_id: conversationId,
          detected_types: maskRes.detectedTypes,
        })
        .select('id')
        .maybeSingle();

      if (logData?.id) {
        complianceLogId = logData.id;
      }
    } catch {
      // sessiz devam et
    }
  }

  const nowIso = new Date().toISOString();
  const newMsg: Message = {
    id: `msg-${Date.now()}`,
    conversation_id: conversationId,
    sender_id: senderId,
    body: finalBody,
    attachment_url: attachmentUrl || null,
    is_read: false,
    created_at: nowIso,
  };

  // 1. Yerel saklama alanına kaydet
  const existingMsgs = getStoredMessages(conversationId);
  existingMsgs.push(newMsg);
  saveStoredMessages(conversationId, existingMsgs);

  // Konuşmanın son mesajını güncelle
  const convs = getStoredConversations();
  const targetConv = convs.find((c) => c.id === conversationId);
  if (targetConv) {
    targetConv.last_message = finalBody;
    targetConv.last_message_at = nowIso;
    targetConv.updated_at = nowIso;
    saveStoredConversations(convs);
  }

  // 2. Canlı Supabase'e gönder
  try {
    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('messages').insert(newMsg).select().single();
      if (!error && data) {
        await supabase
          .from('conversations')
          .update({ updated_at: nowIso })
          .eq('id', conversationId);

        return {
          success: true,
          message: data as Message,
          isMasked: maskRes.isMasked,
          detectedTypes: maskRes.detectedTypes,
          infoNotice: maskRes.infoNotice,
          logId: complianceLogId,
        };
      }
    }
  } catch {
    // fallback
  }

  return {
    success: true,
    message: newMsg,
    isMasked: maskRes.isMasked,
    detectedTypes: maskRes.detectedTypes,
    infoNotice: maskRes.infoNotice,
    logId: complianceLogId,
  };
}

export async function startConversation({
  buyerId,
  companyId,
  listingId,
  quoteId,
  companyName,
  listingTitle,
  initialMessage,
}: {
  buyerId: string;
  companyId: string;
  listingId?: string;
  quoteId?: string;
  companyName?: string;
  listingTitle?: string;
  initialMessage?: string;
}): Promise<{ success: boolean; conversation?: DemoConversation; error?: string }> {
  const existingConvs = getStoredConversations();
  const existing = existingConvs.find(
    (c) =>
      c.buyer_id === buyerId &&
      c.company_id === companyId &&
      (!listingId || c.listing_id === listingId)
  );

  if (existing) {
    if (initialMessage) {
      await sendMessage(existing.id, buyerId, initialMessage);
    }
    return { success: true, conversation: existing };
  }

  const nowIso = new Date().toISOString();
  const newConv: DemoConversation = {
    id: `conv-${Date.now()}`,
    buyer_id: buyerId,
    company_id: companyId,
    listing_id: listingId || null,
    quote_id: quoteId || null,
    is_blocked: false,
    created_at: nowIso,
    updated_at: nowIso,
    other_user_name: companyName || 'Firma Yetkilisi',
    other_user_role: 'company',
    listing_title: listingTitle,
    unread_count: 0,
    last_message: initialMessage || 'Konuşma başlatıldı.',
    last_message_at: nowIso,
  };

  existingConvs.unshift(newConv);
  saveStoredConversations(existingConvs);

  if (initialMessage) {
    await sendMessage(newConv.id, buyerId, initialMessage);
  }

  // Supabase senkronizasyonu
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase.from('conversations').insert({
        id: newConv.id,
        buyer_id: buyerId,
        company_id: companyId,
        listing_id: listingId || null,
        quote_id: quoteId || null,
      });
    }
  } catch {}

  return { success: true, conversation: newConv };
}

export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const convs = getStoredConversations();
  const conv = convs.find((c) => c.id === conversationId);
  if (conv) {
    conv.unread_count = 0;
    saveStoredConversations(convs);
  }

  const msgs = getStoredMessages(conversationId);
  if (msgs.length > 0) {
    msgs.forEach((m) => {
      if (m.sender_id !== userId) {
        m.is_read = true;
      }
    });
    saveStoredMessages(conversationId, msgs);
  }

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', userId);
    }
  } catch {}
}

export async function reportMessage(
  messageId: string,
  reporterId: string,
  reason: string
): Promise<{ success: boolean }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase.from('compliance_reports').insert({
        reporter_id: reporterId,
        entity_id: messageId,
        entity_type: 'message',
        reason,
        created_at: new Date().toISOString(),
      });
    }
  } catch {}

  return { success: true };
}

export async function blockUser(
  conversationId: string,
  blockerId: string
): Promise<{ success: boolean }> {
  const convs = getStoredConversations();
  const conv = convs.find((c) => c.id === conversationId);
  if (conv) {
    conv.is_blocked = true;
    saveStoredConversations(convs);
  }

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase
        .from('conversations')
        .update({ is_blocked: true })
        .eq('id', conversationId);
    }
  } catch {}

  return { success: true };
}
