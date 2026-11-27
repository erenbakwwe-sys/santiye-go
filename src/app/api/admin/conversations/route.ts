import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';
import {
  PAGE_SIZE,
  parseListParams,
  escapeIlike,
  buildConversationSummaries,
  type ConversationRow,
} from '@/lib/services/admin-conversations';

/** Yönetici için konuşma listesi (yalnız okuma). */
export async function GET(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    const db = admin.serviceClient;
    const { page, q } = parseListParams(new URL(req.url).searchParams);

    let query = db
      .from('conversations')
      .select('id, buyer_id, company_id, listing_id, last_message_at', { count: 'exact' })
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

    // Arama: alıcı adı ya da firma adı
    if (q) {
      const pattern = `%${escapeIlike(q)}%`;
      const [{ data: matchedProfiles }, { data: matchedCompanies }] = await Promise.all([
        db.from('profiles').select('id').ilike('full_name', pattern).limit(100),
        db.from('companies').select('id').ilike('name', pattern).limit(100),
      ]);
      const buyerIds = (matchedProfiles || []).map((p) => p.id);
      const companyIds = (matchedCompanies || []).map((c) => c.id);

      if (buyerIds.length === 0 && companyIds.length === 0) {
        return NextResponse.json({ conversations: [], total: 0, page, pageSize: PAGE_SIZE });
      }
      // Buraya yalnız veritabanından gelen kimlikler (UUID) girer, kullanıcı metni girmez.
      const parts: string[] = [];
      if (buyerIds.length) parts.push(`buyer_id.in.(${buyerIds.join(',')})`);
      if (companyIds.length) parts.push(`company_id.in.(${companyIds.join(',')})`);
      query = query.or(parts.join(','));
    }

    const { data: conversations, count, error } = await query;
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (conversations || []) as ConversationRow[];
    if (rows.length === 0) {
      return NextResponse.json({ conversations: [], total: count || 0, page, pageSize: PAGE_SIZE });
    }

    const conversationIds = rows.map((c) => c.id);
    const [{ data: profiles }, { data: companies }, { data: messages }] = await Promise.all([
      db.from('profiles').select('id, full_name').in('id', [...new Set(rows.map((c) => c.buyer_id))]),
      db.from('companies').select('id, name').in('id', [...new Set(rows.map((c) => c.company_id))]),
      db
        .from('messages')
        .select('conversation_id, content, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false })
        .limit(2000),
    ]);

    const messageCounts: Record<string, number> = {};
    for (const m of messages || []) {
      messageCounts[m.conversation_id] = (messageCounts[m.conversation_id] || 0) + 1;
    }

    return NextResponse.json({
      conversations: buildConversationSummaries(rows, profiles || [], companies || [], messages || [], messageCounts),
      total: count || 0,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Konuşmalar yüklenemedi.' }, { status: 500 });
  }
}
