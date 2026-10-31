import { NextRequest, NextResponse } from 'next/server';
import { IyzicoPaymentAdapter } from '@/lib/payment/iyzico-adapter';
import { processPaymentSuccess } from '@/lib/services/payment-service';

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
      return NextResponse.json({ error: 'Geçersiz imza' }, { status: 400 });
    }

    if (verification.paymentId && verification.status === 'paid') {
      await processPaymentSuccess(verification.paymentId, '4242');
    }

    return NextResponse.json({ success: true, received: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Webhook error' }, { status: 500 });
  }
}
