import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type');
  const next = searchParams.get('next') ?? '/giris?verified=1';

  const supabase = await createClient();

  // 1. PKCE Code Exchange
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const meta = (user.user_metadata || {}) as Record<string, any>;
        const metaRole = meta.role || 'buyer';

        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            role: metaRole,
            full_name: meta.full_name || user.email?.split('@')[0] || 'Kullanıcı',
            phone: meta.phone || null,
            is_email_verified: true,
            email_verified_at: new Date().toISOString(),
          });

        if (metaRole === 'company') {
          const { data: comp } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!comp) {
            await supabase.from('companies').upsert({
              user_id: user.id,
              name: meta.company_name || meta.full_name || 'Firma Hesabı',
              tax_number: meta.tax_number || null,
              tax_office: meta.tax_office || null,
              phone: meta.phone || '',
              city_id: meta.city_id ? Number(meta.city_id) : null,
              district_id: meta.district_id ? Number(meta.district_id) : null,
              is_verified: false,
              is_demo: false,
            });
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // 2. Token Hash Verify (OTP / Email link)
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as any,
    });

    if (!error) {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const meta = (user.user_metadata || {}) as Record<string, any>;
        const metaRole = meta.role || 'buyer';

        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            role: metaRole,
            full_name: meta.full_name || user.email?.split('@')[0] || 'Kullanıcı',
            phone: meta.phone || null,
            is_email_verified: true,
            email_verified_at: new Date().toISOString(),
          });

        if (metaRole === 'company') {
          const { data: comp } = await supabase
            .from('companies')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (!comp) {
            await supabase.from('companies').upsert({
              user_id: user.id,
              name: meta.company_name || meta.full_name || 'Firma Hesabı',
              tax_number: meta.tax_number || null,
              tax_office: meta.tax_office || null,
              phone: meta.phone || '',
              city_id: meta.city_id ? Number(meta.city_id) : null,
              district_id: meta.district_id ? Number(meta.district_id) : null,
              is_verified: false,
              is_demo: false,
            });
          }
        }
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/giris?verified=1`);
}
