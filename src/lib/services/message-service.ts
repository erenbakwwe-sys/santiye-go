import { createClient } from '@/lib/supabase/client';
import { Conversation, Message } from '@/types/database';

export interface DemoConversation extends Conversation {
  other_user_name: string;
  other_user_role: string;
  listing_title?: string;
  unread_count: number;
  last_message?: string;
  last_message_at?: string;
}

// In-memory demo conversations
export const DEMO_CONVERSATIONS: DemoConversation[] = [
  {
    id: 'conv-0000-0000-0000-000000000001',
    listing_id: '10000000-0000-0000-0000-000000000001',
    buyer_id: 'buyer-demo-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    is_blocked: false,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    other_user_name: '[DEMO] Anadolu İş Makineleri Parkı',
    other_user_role: 'company',
    listing_title: '2021 Model 22 Ton Paletli Ekskavatör (CAT 320D)',
    unread_count: 1,
    last_message: 'Pazartesi günü şantiye sahanıza tır ile teslimatı sağlayabiliriz.',
    last_message_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    id: 'conv-0000-0000-0000-000000000002',
    quote_id: 'quote-0000-0000-0000-000000000002',
    buyer_id: 'buyer-demo-001',
    company_id: 'f0000000-0000-0000-0000-000000000004',
    is_blocked: false,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    other_user_name: '[DEMO] Karadeniz İş Makineleri Parkı',
    other_user_role: 'company',
    listing_title: 'Samsun - Ankara Arası Lowbed Ağır Nakliye',
    unread_count: 0,
    last_message: 'Teklifimizdeki güzergah izin belgeleri Valilik onaylıdır.',
    last_message_at: new Date(Date.now() - 3600000 * 8).toISOString(),
  },
];

export const DEMO_MESSAGES: Record<string, Message[]> = {
  'conv-0000-0000-0000-000000000001': [
    {
      id: 'msg-001',
      conversation_id: 'conv-0000-0000-0000-000000000001',
      sender_id: 'buyer-demo-001',
      body: 'Merhaba, Tuzla Tepeören şantiyemiz için 3 haftalık kiralama düşünüyoruz. Operatörünüzün G sınıfı belgesi ve SGK dökümü mevcut mudur?',
      attachment_url: null,
      is_read: true,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: 'msg-002',
      conversation_id: 'conv-0000-0000-0000-000000000001',
      sender_id: 'f0000000-0000-0000-0000-000000000001',
      body: 'Merhabalar, evet tüm operatörlerimiz sertifikalıdır, İSG evrakları şantiye girişine eksiksiz teslim edilir.',
      attachment_url: null,
      is_read: true,
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: 'msg-003',
      conversation_id: 'conv-0000-0000-0000-000000000001',
      sender_id: 'f0000000-0000-0000-0000-000000000001',
      body: 'Pazartesi günü şantiye sahanıza tır ile teslimatı sağlayabiliriz.',
      attachment_url: null,
      is_read: false,
      created_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    },
  ],
  'conv-0000-0000-0000-000000000002': [
    {
      id: 'msg-101',
      conversation_id: 'conv-0000-0000-0000-000000000002',
      sender_id: 'buyer-demo-001',
      body: 'Lowbed nakliyesi için Karayolları özel izin belgeleri dahil mi?',
      attachment_url: null,
      is_read: true,
      created_at: new Date(Date.now() - 3600000 * 10).toISOString(),
    },
    {
      id: 'msg-102',
      conversation_id: 'conv-0000-0000-0000-000000000002',
      sender_id: 'f0000000-0000-0000-0000-000000000004',
      body: 'Teklifimizdeki güzergah izin belgeleri Valilik onaylıdır.',
      attachment_url: null,
      is_read: true,
      created_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    },
  ],
};

export async function getConversations(userId: string): Promise<DemoConversation[]> {
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

      if (!error && data) {
        return data as any;
      }
    }
  } catch {
    // fallback
  }

  return DEMO_CONVERSATIONS;
}

export async function getMessages(conversationId: string): Promise<Message[]> {
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

      if (!error && data) {
        return data as Message[];
      }
    }
  } catch {
    // fallback
  }

  return DEMO_MESSAGES[conversationId] || [];
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  body: string,
  attachmentUrl?: string | null
): Promise<{ success: boolean; message?: Message; error?: string }> {
  if (!body.trim() && !attachmentUrl) {
    return { success: false, error: 'Mesaj içeriği boş olamaz.' };
  }

  const newMsg: Message = {
    id: `msg-${Date.now()}`,
    conversation_id: conversationId,
    sender_id: senderId,
    body: body.trim(),
    attachment_url: attachmentUrl || null,
    is_read: false,
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { data, error } = await supabase.from('messages').insert(newMsg).select().single();
      if (!error && data) {
        await supabase
          .from('conversations')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId);
        return { success: true, message: data as Message };
      }
    }
  } catch {
    // fallback
  }

  if (!DEMO_MESSAGES[conversationId]) {
    DEMO_MESSAGES[conversationId] = [];
  }
  DEMO_MESSAGES[conversationId].push(newMsg);

  const conv = DEMO_CONVERSATIONS.find((c) => c.id === conversationId);
  if (conv) {
    conv.last_message = newMsg.body;
    conv.last_message_at = newMsg.created_at;
  }

  return { success: true, message: newMsg };
}

export async function markConversationAsRead(
  conversationId: string,
  userId: string
): Promise<void> {
  const conv = DEMO_CONVERSATIONS.find((c) => c.id === conversationId);
  if (conv) {
    conv.unread_count = 0;
  }
  const msgs = DEMO_MESSAGES[conversationId];
  if (msgs) {
    msgs.forEach((m) => {
      if (m.sender_id !== userId) {
        m.is_read = true;
      }
    });
  }
}

export async function reportMessage(
  messageId: string,
  reporterId: string,
  reason: string
): Promise<{ success: boolean }> {
  // In real Supabase, writes to message_reports table
  console.log(`[REPORT] Message ${messageId} reported by ${reporterId}: ${reason}`);
  return { success: true };
}

export async function blockUser(
  conversationId: string,
  blockerId: string
): Promise<{ success: boolean }> {
  const conv = DEMO_CONVERSATIONS.find((c) => c.id === conversationId);
  if (conv) {
    conv.is_blocked = true;
  }
  return { success: true };
}
