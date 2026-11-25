import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/security/require-admin';
import { buildThread, type MessageRow } from '@/lib/services/admin-conversations';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Yönetici için tek konuşmanın mesajları (yalnız okuma).
 * Her açılış admin_audit_logs tablosuna yazılır; kayıt yazılamazsa mesajlar gösterilmez.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    if (!admin.ok) {
      return NextResponse.json({ error: admin.error }, { status: admin.status });
    }
    const db = admin.serviceClient;
    const { id } = await params;

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Geçersiz konuşma kimliği.' }, { status: 400 });
    }

    const { data: conversation } = await db
      .from('conversations')
      .select('id, buyer_id, company_id, listing_id, created_at')
      .eq('id', id)
      .maybeSingle();

    if (!conversation) {
      return NextResponse.json({ error: 'Konuşma bulunamadı.' }, { status: 404 });
    }

    // Önce denetim kaydı: kim, hangi konuşmayı, ne zaman açtı
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 45) || null;
    const { error: auditError } = await db.from('admin_audit_logs').insert({
      admin_id: admin.adminId,
      action: 'CONVERSATION_VIEWED',
      target_type: 'conversation',
      target_id: id,
      ip_address: ip,
      details: { buyer_id: conversation.buyer_id, company_id: conversation.company_id },
    });
    if (auditError) {
      return NextResponse.json(
        { error: 'Denetim kaydı yazılamadığı için konuşma açılmadı.' },
        { status: 500 }
      );
    }

    const [{ data: messages, error }, { data: buyer }, { data: company }, { data: listing }] = await Promise.all([
      db.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: true }).limit(1000),
      db.from('profiles').select('id, full_name').eq('id', conversation.buyer_id).maybeSingle(),
      db.from('companies').select('id, name').eq('id', conversation.company_id).maybeSingle(),
      conversation.listing_id
        ? db.from('listings').select('id, title').eq('id', conversation.listing_id).maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        createdAt: conversation.created_at,
        buyerName: buyer?.full_name || 'Bilinmeyen kullanıcı',
        companyName: company?.name || 'Bilinmeyen firma',
        listingId: conversation.listing_id,
        listingTitle: listing?.title || null,
      },
      messages: buildThread((messages || []) as MessageRow[], conversation.buyer_id),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Konuşma yüklenemedi.' }, { status: 500 });
  }
}
