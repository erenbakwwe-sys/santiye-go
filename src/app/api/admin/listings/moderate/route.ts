import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { listingId, action, reason } = body;

    if (!listingId || !action) {
      return NextResponse.json({ error: 'listingId ve action zorunludur' }, { status: 400 });
    }

    const newStatus = action === 'approve' ? 'active' : 'inactive';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    // Service role key varsa en yüksek yetkiyle, yoksa anon key ile güncelle
    const keyToUse = serviceRoleKey || anonKey;
    if (supabaseUrl && keyToUse) {
      const supabase = createClient(supabaseUrl, keyToUse, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

      const { data, error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listingId)
        .select('id, status');

      if (error) {
        console.warn('[api/admin/listings/moderate] DB Update error:', error.message);
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Moderasyon hatası' }, { status: 500 });
  }
}
