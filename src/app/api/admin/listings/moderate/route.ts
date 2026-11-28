import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient, hasServiceRoleKey } from '@/lib/supabase/service-role';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const STATUS_BY_ACTION = {
  approve: 'active',
  reject: 'rejected',
  remove: 'inactive',
} as const;

/**
 * İlan moderasyonu. Yalnızca oturum açmış yöneticiler çağırabilir; yetki veritabanından
 * (is_admin) okunur. Güncelleme service_role ile yapılır ve denetim loguna işlenir.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const listingId = body?.listingId;
    const action = body?.action as keyof typeof STATUS_BY_ACTION | undefined;
    const reason = typeof body?.reason === 'string' ? body.reason.slice(0, 1000) : '';

    if (typeof listingId !== 'string' || !UUID_RE.test(listingId) || !action || !(action in STATUS_BY_ACTION)) {
      return NextResponse.json({ error: 'Geçerli listingId ve action (approve | reject | remove) zorunludur.' }, { status: 400 });
    }

    const session = await createClient();
    const {
      data: { user },
    } = await session.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Oturum açmanız gerekiyor.' }, { status: 401 });
    }

    const { data: isAdmin, error: adminErr } = await session.rpc('is_admin');
    if (adminErr || isAdmin !== true) {
      return NextResponse.json({ error: 'Bu işlem yalnızca yöneticiler içindir.' }, { status: 403 });
    }

    const newStatus = STATUS_BY_ACTION[action];
    // service_role yoksa yönetici oturumu: listings UPDATE ve admin_audit_logs INSERT politikaları
    // yöneticiye izin verir.
    const admin = hasServiceRoleKey() ? createServiceRoleClient() : session;
    const { data, error } = await admin
      .from('listings')
      .update({ status: newStatus })
      .eq('id', listingId)
      .select('id, status')
      .maybeSingle();

    if (error) {
      console.error('[api/admin/listings/moderate] update error:', error.message);
      return NextResponse.json({ error: 'İlan güncellenemedi.' }, { status: 500 });
    }
    if (!data) {
      return NextResponse.json({ error: 'İlan bulunamadı.' }, { status: 404 });
    }

    await admin.from('admin_audit_logs').insert({
      admin_id: user.id,
      action: `LISTING_${action.toUpperCase()}`,
      target_type: 'listing',
      target_id: listingId,
      ip_address: (req.headers.get('x-forwarded-for') || '').split(',')[0].trim().slice(0, 45) || null,
      details: { action, reason, new_status: newStatus },
    });

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    console.error('[api/admin/listings/moderate] error:', err);
    return NextResponse.json({ error: 'Moderasyon hatası.' }, { status: 500 });
  }
}
