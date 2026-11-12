import { NextRequest, NextResponse } from 'next/server';
import { IyzicoPaymentAdapter } from '@/lib/payment/iyzico-adapter';
import { confirmEscrowPaymentPaid } from '@/lib/services/escrow-service';
import { createClient } from '@/lib/supabase/client';

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
        { error: 'Geçersiz webhook imzası (HMAC-SHA256 doğrulaması başarısız).' },
        { status: 400 }
      );
    }

    const eventId = rawBody.eventId || rawBody.paymentId || `evt-${Date.now()}`;

    // Webhook Idempotency Kontrolü
    try {
      const supabase = createClient();
      const isConfigured =
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

      if (isConfigured) {
        const { data: existingEvent } = await supabase
          .from('payment_webhook_events')
          .select('id, processed')
          .eq('event_id', eventId)
          .maybeSingle();

        if (existingEvent && existingEvent.processed) {
          // Idempotent tekrar: Zaten başarıyla işlendi
          return NextResponse.json({ success: true, idempotent_replay: true });
        }

        await supabase.from('payment_webhook_events').upsert({
          event_id: eventId,
          provider: 'iyzico',
          event_type: rawBody.eventType || 'payment.success',
          signature: headersRecord['x-iyz-signature'] || headersRecord['x-signature'] || 'hmac-verified',
          is_valid_signature: true,
          payload: rawBody,
          processed: true,
          processed_at: new Date().toISOString(),
        });
      }
    } catch {
      // fallback
    }

    if (verification.paymentId && verification.status === 'paid') {
      const cardLastFour = rawBody.lastFourDigits || rawBody.cardLastFour || '4242';
      await confirmEscrowPaymentPaid(verification.paymentId, verification.paymentId, cardLastFour);
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Webhook işleme hatası oluştu.' },
      { status: 500 }
    );
  }
}
