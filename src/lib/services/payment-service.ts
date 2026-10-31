import { createClient } from '@/lib/supabase/client';
import { PaymentTransaction, Booking } from '@/types/database';
import { IyzicoPaymentAdapter } from '@/lib/payment/iyzico-adapter';
import { calculateCommissionForTransaction } from './commission-service';
import { DEMO_BOOKINGS } from './booking-service';

export const DEMO_TRANSACTIONS: PaymentTransaction[] = [
  {
    id: 'pay-0000-0000-0001',
    booking_id: 'book-0000-0000-0000-000000000001',
    buyer_id: 'buyer-demo-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    provider: 'iyzico',
    provider_payment_id: 'iyz-99881122',
    provider_basket_id: 'bsk-1001',
    amount_cents: 3600000, // 36.000,00 ₺
    commission_rate_percent: 8.0,
    commission_amount_cents: 288000, // 2.880,00 ₺
    vat_amount_cents: 48000, // %20 KDV dahil
    net_company_amount_cents: 3312000, // 33.120,00 ₺
    currency: 'TRY',
    status: 'transferred',
    is_transferred_to_submerchant: true,
    transferred_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    refund_amount_cents: 0,
    card_type: 'CREDIT_CARD',
    card_last_four: '4242',
    is_demo: true,
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    updated_at: new Date().toISOString(),
    buyer: {
      id: 'buyer-demo-001',
      role: 'buyer',
      full_name: 'Ahmet Yılmaz (Müteahhit)',
      phone: '+90 532 111 2233',
      kvkk_accepted_at: '',
      created_at: '',
      updated_at: '',
    },
    company: {
      id: 'f0000000-0000-0000-0000-000000000001',
      user_id: '',
      name: '[DEMO] Anadolu İş Makineleri Parkı',
      phone: '+90 532 000 0101',
      is_verified: true,
      is_demo: true,
      tax_number: '1234567890',
      tax_office: 'Tuzla',
      created_at: '',
      updated_at: '',
    },
  },
  {
    id: 'pay-0000-0000-0002',
    booking_id: 'book-0000-0000-0000-000000000002',
    buyer_id: 'buyer-demo-001',
    company_id: 'f0000000-0000-0000-0000-000000000001',
    provider: 'iyzico',
    provider_payment_id: 'iyz-99881123',
    provider_basket_id: 'bsk-1002',
    amount_cents: 3400000, // 34.000,00 ₺
    commission_rate_percent: 7.0, // %1 üyelik indirimi uygulanmış
    commission_amount_cents: 238000, // 2.380,00 ₺
    vat_amount_cents: 39667,
    net_company_amount_cents: 3162000, // 31.620,00 ₺
    currency: 'TRY',
    status: 'paid', // Havuzda bekliyor
    is_transferred_to_submerchant: false,
    refund_amount_cents: 0,
    card_type: 'CREDIT_CARD',
    card_last_four: '1111',
    is_demo: true,
    created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    updated_at: new Date().toISOString(),
    buyer: {
      id: 'buyer-demo-001',
      role: 'buyer',
      full_name: 'Ahmet Yılmaz (Müteahhit)',
      phone: '+90 532 111 2233',
      kvkk_accepted_at: '',
      created_at: '',
      updated_at: '',
    },
    company: {
      id: 'f0000000-0000-0000-0000-000000000001',
      user_id: '',
      name: '[DEMO] Anadolu İş Makineleri Parkı',
      phone: '+90 532 000 0101',
      is_verified: true,
      is_demo: true,
      tax_number: '1234567890',
      tax_office: 'Tuzla',
      created_at: '',
      updated_at: '',
    },
  },
];

const paymentGateway = new IyzicoPaymentAdapter();

export async function createBookingPaymentSession(bookingId: string): Promise<{
  success: boolean;
  transaction?: PaymentTransaction;
  paymentUrl?: string;
  error?: string;
}> {
  const booking = DEMO_BOOKINGS.find((b) => b.id === bookingId);
  if (!booking) {
    return { success: false, error: 'Rezervasyon kaydı bulunamadı.' };
  }

  const amountCents = (booking.total_price || booking.agreed_price || 0) * 100;
  if (amountCents <= 0) {
    return { success: false, error: 'Geçersiz ödeme tutarı.' };
  }

  // Calculate commission according to hierarchy
  const commission = await calculateCommissionForTransaction({
    amountCents,
    companyId: booking.company_id,
    categoryId: booking.listing?.category_id,
  });

  const txId = `pay-${Date.now()}`;
  const idempotencyKey = `idemp-${bookingId}-${Date.now()}`;

  const newTx: PaymentTransaction = {
    id: txId,
    booking_id: bookingId,
    quote_id: null,
    buyer_id: booking.buyer_id,
    company_id: booking.company_id,
    provider: 'iyzico',
    provider_payment_id: `iyz-${Date.now()}`,
    provider_basket_id: `bsk-${bookingId.slice(0, 8)}`,
    idempotency_key: idempotencyKey,
    amount_cents: amountCents,
    commission_rate_percent: commission.appliedRatePercent,
    commission_amount_cents: commission.commissionAmountCents,
    vat_amount_cents: commission.vatAmountCents,
    net_company_amount_cents: commission.netCompanyAmountCents,
    currency: 'TRY',
    status: 'pending',
    is_transferred_to_submerchant: false,
    refund_amount_cents: 0,
    card_type: 'CREDIT_CARD',
    card_last_four: '4242',
    is_demo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    booking,
  };

  // Call iyzico Gateway Adapter
  const checkout = await paymentGateway.initiateCheckout({
    transactionId: txId,
    bookingId,
    amountCents,
    currency: 'TRY',
    buyer: {
      id: booking.buyer_id,
      name: 'Ahmet',
      surname: 'Yılmaz',
      email: 'ahmet.yilmaz@demo.com',
      phone: '+905321112233',
      address: booking.site_address || 'İstanbul',
      city: 'İstanbul',
    },
    subMerchantKey: 'subm-anadolu-001',
    subMerchantPriceCents: commission.netCompanyAmountCents,
    items: [
      {
        id: booking.listing_id,
        name: booking.listing?.title || 'İş Makinesi Kiralama',
        category: 'İş Makineleri',
        priceCents: amountCents,
      },
    ],
    callbackUrl: `/api/webhooks/payment`,
  });

  DEMO_TRANSACTIONS.unshift(newTx);

  return {
    success: true,
    transaction: newTx,
    paymentUrl: checkout.paymentPageUrl,
  };
}

export async function processPaymentSuccess(
  transactionId: string,
  cardLastFour: string = '4242'
): Promise<{ success: boolean; transaction?: PaymentTransaction }> {
  const tx = DEMO_TRANSACTIONS.find((t) => t.id === transactionId);
  if (!tx) {
    return { success: false };
  }

  // Idempotency guard: prevent duplicate processing
  if (tx.status === 'paid') {
    return { success: true, transaction: tx };
  }

  tx.status = 'paid';
  tx.card_last_four = cardLastFour;
  tx.updated_at = new Date().toISOString();

  // Update booking status
  if (tx.booking_id) {
    const booking = DEMO_BOOKINGS.find((b) => b.id === tx.booking_id);
    if (booking) {
      booking.payment_status = 'paid';
      booking.status = 'approved';
      booking.updated_at = new Date().toISOString();
    }
  }

  return { success: true, transaction: tx };
}

export async function releaseEscrowToSubMerchant(
  transactionId: string
): Promise<{ success: boolean; error?: string }> {
  const tx = DEMO_TRANSACTIONS.find((t) => t.id === transactionId);
  if (!tx) return { success: false, error: 'İşlem bulunamadı.' };

  const res = await paymentGateway.approveTransferToSubMerchant({
    paymentTransactionId: tx.id,
    subMerchantKey: 'subm-anadolu-001',
    amountCents: tx.net_company_amount_cents,
  });

  if (res.success) {
    tx.status = 'transferred';
    tx.is_transferred_to_submerchant = true;
    tx.transferred_at = new Date().toISOString();
    return { success: true };
  }

  return { success: false, error: res.error };
}

export async function refundTransaction(
  transactionId: string,
  reason: string = 'Müşteri talebi / İptal'
): Promise<{ success: boolean; error?: string }> {
  const tx = DEMO_TRANSACTIONS.find((t) => t.id === transactionId);
  if (!tx) return { success: false, error: 'İşlem bulunamadı.' };

  const res = await paymentGateway.refundTransaction({
    providerPaymentId: tx.provider_payment_id || tx.id,
    amountCents: tx.amount_cents,
    reason,
  });

  if (res.success) {
    tx.status = 'refunded';
    tx.refund_amount_cents = tx.amount_cents;
    tx.refund_reason = reason;
    tx.refunded_at = new Date().toISOString();

    if (tx.booking_id) {
      const booking = DEMO_BOOKINGS.find((b) => b.id === tx.booking_id);
      if (booking) {
        booking.status = 'cancelled';
        booking.payment_status = 'refunded';
      }
    }
    return { success: true };
  }

  return { success: false, error: res.error };
}
