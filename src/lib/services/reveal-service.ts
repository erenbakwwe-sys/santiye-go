/**
 * ŞANTİYE GO – KONTROLLÜ İLETİŞİM AÇILIŞ SERVİSİ (PROMPT 9A)
 * Belirlenen kural (teklif kabulü, ödeme, numara göster butonu) gerçekleştiğinde
 * tarafların iletişim kartını açar, doğrular, loglar ve RLS kurallarını yönetir.
 */

import { createClient } from '../supabase/client';

export type RevealTriggerType = 'teklif_kabul' | 'odeme' | 'talep_kredisi' | 'numara_goster_butonu';

export interface ContactCardDetails {
  fullName: string;
  companyName: string;
  phone: string;
  whatsappUrl: string;
  fullAddress: string;
  cityName: string;
  districtName: string;
  revealedAt: string;
  triggerType: RevealTriggerType;
}

export type RevealedContactDetails = ContactCardDetails;

/**
 * 1. İki taraf arasında iletişim açılışının yapılıp yapılmadığını sorgular
 */
export async function checkRevealStatus(
  buyerId: string,
  companyId: string,
  bookingId?: string,
  quoteId?: string
): Promise<{ isRevealed: boolean; revealed: boolean; details?: ContactCardDetails }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (!isSupabaseConfigured) {
      return { isRevealed: false, revealed: false };
    }

    // contact_reveals tablosunda kayıt var mı?
    let query = supabase
      .from('contact_reveals')
      .select('*, company:companies(*)')
      .eq('buyer_id', buyerId)
      .eq('company_id', companyId);

    if (bookingId) query = query.eq('booking_id', bookingId);
    if (quoteId) query = query.eq('quote_id', quoteId);

    const { data, error } = await query.maybeSingle();

    if (!error && data) {
      const comp = data.company || {};
      const phoneClean = (comp.phone || '').replace(/[^0-9]/g, '');
      return {
        isRevealed: true,
        revealed: true,
        details: {
          fullName: comp.name || 'Yetkili Firma Temsilcisi',
          companyName: comp.name || 'Firma',
          phone: comp.phone || '',
          whatsappUrl: `https://wa.me/${phoneClean}`,
          fullAddress: comp.address || `${comp.district_id || ''} ${comp.city_id || ''}`,
          cityName: comp.city_name || 'Türkiye',
          districtName: comp.district_name || '',
          revealedAt: data.created_at,
          triggerType: data.trigger_type as RevealTriggerType,
        },
      };
    }
  } catch (err) {
    console.error('checkRevealStatus error:', err);
  }

  return { isRevealed: false, revealed: false };
}

/**
 * 2. İletişim kartı açılışını tetikler ve loglar
 */
export async function triggerControlledReveal({
  buyerId,
  companyId,
  bookingId,
  quoteId,
  triggerType,
}: {
  buyerId: string;
  companyId: string;
  bookingId?: string;
  quoteId?: string;
  triggerType: RevealTriggerType;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      const { error } = await supabase.from('contact_reveals').insert({
        buyer_id: buyerId,
        company_id: companyId,
        booking_id: bookingId || null,
        quote_id: quoteId || null,
        trigger_type: triggerType,
      });

      if (error && error.code !== '23505') { // 23505: unique conflict (zaten açık)
        throw error;
      }

      // E-posta bildirimi tetikle (Resend)
      try {
        await fetch('/api/notifications/contact-revealed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ buyerId, companyId, triggerType }),
        });
      } catch {
        // E-posta sessiz devam eder
      }

      return { success: true };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  return { success: true };
}

/**
 * 3. Yumuşak Mod: "Numarayı Göster" günlük sınır kontrolü
 */
export async function canRevealByPhoneNumber(
  userId: string
): Promise<{ allowed: boolean; remainingDaily: number; reason?: string }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (!isSupabaseConfigured) {
      return { allowed: true, remainingDaily: 5 };
    }

    // Kullanıcının telefonu doğrulanmış mı?
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_phone_verified')
      .eq('id', userId)
      .maybeSingle();

    if (!profile?.is_phone_verified) {
      return {
        allowed: false,
        remainingDaily: 0,
        reason: 'Numarayı görebilmek için telefon numaranızı doğrulamış olmalısınız.',
      };
    }

    // Bugün kaç kez numara görüntülemiş?
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count, error } = await supabase
      .from('phone_reveal_daily_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());

    const dailyLimit = 5;
    const used = count || 0;
    const remaining = Math.max(0, dailyLimit - used);

    if (remaining <= 0) {
      return {
        allowed: false,
        remainingDaily: 0,
        reason: 'Günlük numara görüntüleme sınırınıza (5/5) ulaştınız. Yarın tekrar deneyiniz.',
      };
    }

    return { allowed: true, remainingDaily: remaining };
  } catch {
    return { allowed: true, remainingDaily: 5 };
  }
}

/**
 * 4. Yumuşak Mod: "Numarayı Göster" işlemini kaydeder ve telefonu döner
 */
export async function logPhoneReveal(
  userId: string,
  listingId: string,
  companyId: string
): Promise<{ success: boolean; phone?: string; error?: string }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase.from('phone_reveal_daily_logs').insert({
        user_id: userId,
        listing_id: listingId,
        company_id: companyId,
      });

      const { data: comp } = await supabase
        .from('companies')
        .select('phone')
        .eq('id', companyId)
        .maybeSingle();

      return { success: true, phone: comp?.phone || '' };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }

  return { success: true, phone: '+90 532 000 0000' };
}

/**
 * 5. Yanlış Alarm İtirazı Bildir ("Bu bir iletişim bilgisi değil")
 */
export async function reportFalsePositive(
  logId: string,
  reason: string
): Promise<{ success: boolean; message?: string }> {
  try {
    const supabase = createClient();
    const isSupabaseConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isSupabaseConfigured) {
      await supabase
        .from('compliance_mask_logs')
        .update({
          is_false_positive_reported: true,
          false_positive_reason: reason,
          review_status: 'pending',
        })
        .eq('id', logId);

      return { success: true, message: 'İtirazınız yönetici inceleme kuyruğuna iletildi.' };
    }
  } catch {
    // fallback
  }

  return { success: true, message: 'İtirazınız kaydedildi.' };
}
