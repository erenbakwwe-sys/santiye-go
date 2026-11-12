import { NextRequest, NextResponse } from 'next/server';
import { IyzicoPaymentAdapter } from '@/lib/payment/iyzico-adapter';
import { markPaymentHeld } from '@/lib/services/escrow-service';
import { triggerControlledReveal } from '@/lib/services/reveal-service';
import { processPaymentSuccess } from '@/lib/services/payment-service';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json();
    const headersRecord: Record<string, string> = {};
    req.headers.forEach((value, key) => {
      headersRecord[key.toLowerCase()] = value;
    });

    const adapter = new IyzicoPaymentAdapter();
    const verification = await adapter.verifyWebhook(headersRecord, rawBody);

    if (!verification.isValid) {
      return NextResponse.json(
        { error: 'Geçersiz webhook HMAC imzası / Yetkisiz istek' },
        { status: 401 }
      );
    }

    const paymentId = verification.paymentId;
    if (!paymentId) {
      return NextResponse.json(
        { error: 'Geçersiz bildirim: paymentId eksik' },
        { status: 400 }
      );
    }

    const eventId = verification.eventId || `evt-${paymentId}-${verification.status || 'success'}`;
    const providerStatus = verification.status || 'paid';

    // 1. Idempotency ve Durum Çelişkisi (Conflict) Denetimi
    let hasConflict = false;
    let isDuplicate = false;

    try {
      const supabase = createServiceRoleClient();
      const { data: guardResult, error: guardError } = await supabase.rpc(
        'process_webhook_event_guard',
        {
          p_event_id: eventId,
          p_payment_id: paymentId,
          p_provider: 'iyzico',
          p_provider_status: providerStatus,
          p_payload: {
            headers: {
              'x-iyz-signature': headersRecord['x-iyz-signature'] || 'verified',
            },
            body: rawBody,
            processedAt: new Date().toISOString(),
          },
        }
      );

      if (guardError) {
        console.warn('Webhook guard RPC warning:', guardError.message);
      } else if (guardResult) {
        if (guardResult.is_duplicate) {
          isDuplicate = true;
          return NextResponse.json({
            success: true,
            message: 'Webhook olayı daha önce işlendi (Idempotent replay).',
            eventId,
          });
        }
        if (guardResult.has_conflict) {
          hasConflict = true;
          return NextResponse.json(
            {
              error: 'DURDURULDU: Sağlayıcı durumu yerel durum makinesiyle çelişiyor!',
              detail: guardResult.error,
              eventId,
            },
            { status: 409 }
          );
        }
      }
    } catch {
      // In-memory or fallback logging when local test runs
    }

    // 2. Başarılı Ödeme ve Escrow Havuz Blokesi (paid_held)
    if (providerStatus === 'paid' && !hasConflict && !isDuplicate) {
      const itemId =
        rawBody?.paymentItemTransactions?.[0]?.paymentTransactionId || paymentId;
      const subMerchantKey =
        rawBody?.paymentItemTransactions?.[0]?.subMerchantKey ||
        rawBody?.subMerchantKey ||
        'subm-default';

      // 2.1. Veritabanında Escrow durumunu 'paid_held' yap
      await markPaymentHeld(paymentId, itemId, subMerchantKey, {
        rawWebhook: rawBody,
        verifiedAt: new Date().toISOString(),
      });

      // 2.2. Geriye dönük uyumluluk (demo store)
      await processPaymentSuccess(paymentId, rawBody?.lastFourDigits || '4242');

      // 2.3. Entegrasyon 4a: İletişim Açılış Kuralı 'odeme' Tetikleyicisi (Prompt 9A)
      try {
        const supabase = createServiceRoleClient();
        const { data: pay } = await supabase
          .from('payment_transactions')
          .select('buyer_id, company_id, booking_id, quote_id')
          .eq('id', paymentId)
          .maybeSingle();

        if (pay?.buyer_id && pay?.company_id) {
          await triggerControlledReveal({
            buyerId: pay.buyer_id,
            companyId: pay.company_id,
            bookingId: pay.booking_id || undefined,
            quoteId: pay.quote_id || undefined,
            triggerType: 'odeme',
          });
        }
      } catch (revealErr) {
        console.warn('Controlled reveal trigger notice:', revealErr);
      }
    }

    return NextResponse.json({
      success: true,
      received: true,
      escrow_status: providerStatus === 'paid' ? 'paid_held' : 'processed',
      eventId,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Webhook işleme hatası' },
      { status: 500 }
    );
  }
}
