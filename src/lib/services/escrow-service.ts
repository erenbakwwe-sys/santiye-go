import { createClient } from '@/lib/supabase/client';
import {
  PaymentTransaction,
  PaymentEvent,
  PaymentDispute,
  Company,
} from '@/types/database';
import { IyzicoPaymentAdapter } from '@/lib/payment/iyzico-adapter';
import { calculateCommissionForTransaction } from './commission-service';
import { DEMO_TRANSACTIONS } from './payment-service';
import { DEMO_BOOKINGS } from './booking-service';

export const paymentGateway = new IyzicoPaymentAdapter();

// Platform Ödeme Ayarları
export interface PlatformEscrowSettings {
  payment_mode: 'external' | 'platform';
  escrow_dispute_window_days: number;
  refund_commission_action: 'refund_full' | 'retain_fee';
  escrow_auto_release_enabled: boolean;
}

export let CURRENT_PLATFORM_SETTINGS: PlatformEscrowSettings = {
  payment_mode: 'external', // Varsayılan: Mevcut doğrudan ödeme davranışı
  escrow_dispute_window_days: 3,
  refund_commission_action: 'refund_full', // İadede komisyon da tam iade edilir
  escrow_auto_release_enabled: true,
};

// Demo Bellek İçi Olay Defteri ve İtiraz Kuyruğu
export let DEMO_PAYMENT_EVENTS: PaymentEvent[] = [];
export let DEMO_PAYMENT_DISPUTES: PaymentDispute[] = [];

/**
 * 1. PLATFORM GENEL VE FİRMA ÖDEME AYARLARI
 */
export async function getPlatformEscrowSettings(): Promise<PlatformEscrowSettings> {
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', [
          'payment_mode',
          'escrow_dispute_window_days',
          'refund_commission_action',
          'escrow_auto_release_enabled',
        ]);

      if (!error && data) {
        const settings = { ...CURRENT_PLATFORM_SETTINGS };
        data.forEach((row: any) => {
          if (row.key === 'payment_mode' && row.value?.mode) {
            settings.payment_mode = row.value.mode;
          }
          if (row.key === 'escrow_dispute_window_days' && row.value?.days) {
            settings.escrow_dispute_window_days = Number(row.value.days);
          }
          if (row.key === 'refund_commission_action' && row.value?.action) {
            settings.refund_commission_action = row.value.action;
          }
          if (row.key === 'escrow_auto_release_enabled' && row.value?.enabled !== undefined) {
            settings.escrow_auto_release_enabled = Boolean(row.value.enabled);
          }
        });
        return settings;
      }
    }
  } catch {
    // fallback
  }

  return CURRENT_PLATFORM_SETTINGS;
}

export async function updatePlatformEscrowSettings(
  newSettings: Partial<PlatformEscrowSettings>
): Promise<{ success: boolean; settings: PlatformEscrowSettings }> {
  CURRENT_PLATFORM_SETTINGS = { ...CURRENT_PLATFORM_SETTINGS, ...newSettings };
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      if (newSettings.payment_mode) {
        await supabase.from('platform_settings').upsert({
          key: 'payment_mode',
          value: { mode: newSettings.payment_mode },
          updated_at: new Date().toISOString(),
        });
      }
      if (newSettings.escrow_dispute_window_days !== undefined) {
        await supabase.from('platform_settings').upsert({
          key: 'escrow_dispute_window_days',
          value: { days: newSettings.escrow_dispute_window_days },
          updated_at: new Date().toISOString(),
        });
      }
      if (newSettings.refund_commission_action) {
        await supabase.from('platform_settings').upsert({
          key: 'refund_commission_action',
          value: { action: newSettings.refund_commission_action },
          updated_at: new Date().toISOString(),
        });
      }
    }
  } catch {
    // fallback
  }

  return { success: true, settings: CURRENT_PLATFORM_SETTINGS };
}

/**
 * 2. ALT ÜYE İŞYERİ ONBOARDING (GÜVENLİ VERİ KAYDI)
 * IBAN gibi hassas bilgi veritabanında ASLA tam saklanmaz!
 * Yalnızca son 4 hane (iban_last4) ve sağlayıcı referansı (sub_merchant_key) saklanır.
 * Kimlik numarası istenmez; kurumsal VKN kullanılır.
 */
export async function registerCompanySubMerchant(
  companyId: string,
  data: {
    legalType: 'PRIVATE_COMPANY' | 'LIMITED_OR_JOINT_STOCK_COMPANY';
    legalCompanyTitle: string;
    taxOffice: string;
    taxNumber: string; // 10 haneli VKN
    email: string;
    gsmNumber: string;
    address: string;
    iban: string; // Sadece sağlayıcıya gönderilir
  }
): Promise<{ success: boolean; subMerchantKey?: string; ibanLast4?: string; error?: string }> {
  const cleanIban = data.iban.replace(/\s/g, '').toUpperCase();
  if (!cleanIban.startsWith('TR') || cleanIban.length !== 26) {
    return { success: false, error: 'Geçersiz IBAN: TR ile başlayan 26 haneli IBAN girilmelidir.' };
  }

  if (!data.taxNumber || (data.taxNumber.length !== 10 && data.taxNumber.length !== 11)) {
    return { success: false, error: 'Geçersiz Vergi Numarası: 10 haneli kurumsal VKN girilmelidir.' };
  }

  const ibanLast4 = cleanIban.slice(-4);

  // Sağlayıcıya (iyzico) gönder
  const gatewayRes = await paymentGateway.createSubMerchant({
    externalId: companyId,
    subMerchantType: data.legalType,
    name: data.legalCompanyTitle,
    legalCompanyTitle: data.legalCompanyTitle,
    taxOffice: data.taxOffice,
    taxNumber: data.taxNumber,
    email: data.email,
    gsmNumber: data.gsmNumber,
    address: data.address,
    iban: cleanIban,
  });

  if (!gatewayRes.success || !gatewayRes.subMerchantKey) {
    return { success: false, error: gatewayRes.error || 'Alt üye işyeri kaydı sağlayıcı tarafından onaylanamadı.' };
  }

  // Veritabanına YALNIZCA son 4 hane ve anahtar kaydedilir
  try {
    const supabase = createClient();
    const isConfigured =
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('placeholder');

    if (isConfigured) {
      await supabase
        .from('companies')
        .update({
          sub_merchant_key: gatewayRes.subMerchantKey,
          sub_merchant_status: 'approved',
          iban_last4: ibanLast4,
          tax_office: data.taxOffice,
          tax_number: data.taxNumber,
          accept_platform_escrow: true,
          sub_merchant_registered_at: new Date().toISOString(),
        })
        .eq('id', companyId);
    }
  } catch {
    // fallback
  }

  return {
    success: true,
    subMerchantKey: gatewayRes.subMerchantKey,
    ibanLast4,
  };
}

/**
 * 3. ESCROW ÖDEME OTURUMU BAŞLATMA
 */
export async function createEscrowPaymentSession(params: {
  bookingId: string;
  buyerId: string;
  paymentModeRequested?: 'external' | 'platform';
}): Promise<{
  success: boolean;
  transaction?: PaymentTransaction;
  paymentPageUrl?: string;
  checkoutFormContent?: string;
  error?: string;
}> {
  const { bookingId, buyerId, paymentModeRequested } = params;
  const platformSettings = await getPlatformEscrowSettings();

  const booking = DEMO_BOOKINGS.find((b) => b.id === bookingId);
  if (!booking) {
    return { success: false, error: 'Rezervasyon kaydı bulunamadı.' };
  }

  const effectiveMode = paymentModeRequested || platformSettings.payment_mode;

  const amountCents = (booking.total_price || booking.agreed_price || 0) * 100;
  if (amountCents <= 0) {
    return { success: false, error: 'Geçersiz ödeme tutarı.' };
  }

  // 9C Komisyon Motoru: Ödeme anında dondurma
  const commission = await calculateCommissionForTransaction({
    amountCents,
    companyId: booking.company_id,
    categoryId: booking.listing?.category_id,
    paymentMethod: effectiveMode === 'platform' ? 'platform' : 'direct',
  });

  const txId = `pay-escrow-${Date.now()}`;
  const idempotencyKey = `idemp-escrow-${bookingId}-${Date.now()}`;

  const newTx: PaymentTransaction = {
    id: txId,
    booking_id: bookingId,
    quote_id: null,
    buyer_id: buyerId,
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
    is_commission_capped: commission.isCapApplied,
    commission_cap_cents: commission.capAmountCents,
    capped_commission_savings_cents: commission.cappedSavingsCents,
    payment_mode: effectiveMode,
    is_demo: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    booking,
  };

  const checkout = await paymentGateway.initiateCheckout({
    transactionId: txId,
    bookingId,
    amountCents,
    currency: 'TRY',
    buyer: {
      id: buyerId,
      name: 'Alıcı',
      surname: 'Kullanıcı',
      email: 'alici@santiyego.com',
      phone: '+905321112233',
      address: booking.site_address || 'İstanbul',
      city: 'İstanbul',
    },
    subMerchantKey: 'subm-anadolu-001',
    subMerchantPriceCents: commission.netCompanyAmountCents,
    items: [
      {
        id: booking.listing_id,
        name: booking.listing?.title || 'Şantiye İş Kalemi',
        category: 'Hizmet & Kiralama',
        priceCents: amountCents,
      },
    ],
    callbackUrl: `/api/webhooks/payment`,
  });

  DEMO_TRANSACTIONS.unshift(newTx);

  return {
    success: true,
    transaction: newTx,
    paymentPageUrl: checkout.paymentPageUrl,
    checkoutFormContent: checkout.checkoutFormContent,
  };
}

/**
 * 4. WEBHOOK İLE ÖDEMENİN HAVUZA ALINMASI (CONFIRM ESCROW PAID)
 */
export async function confirmEscrowPaymentPaid(
  paymentId: string,
  providerPaymentId?: string,
  cardLastFour: string = '4242'
): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
  const tx = DEMO_TRANSACTIONS.find((t) => t.id === paymentId);
  if (!tx) {
    return { success: false, error: 'Ödeme bulunamadı.' };
  }

  // Idempotency: Zaten havuza alınmışsa başarılı dön
  if (tx.status === 'paid' || tx.status === 'paid_escrow') {
    return { success: true, transaction: tx };
  }

  const disputeWindowDays = CURRENT_PLATFORM_SETTINGS.escrow_dispute_window_days;
  const autoReleaseAt = new Date(Date.now() + disputeWindowDays * 24 * 60 * 60 * 1000).toISOString();

  tx.status = 'paid_escrow';
  tx.card_last_four = cardLastFour;
  tx.auto_release_at = autoReleaseAt;
  tx.provider_payment_id = providerPaymentId || tx.provider_payment_id;
  tx.updated_at = new Date().toISOString();

  // Değiştirilemez Olay Defterine Ekle
  DEMO_PAYMENT_EVENTS.push({
    id: `evt-${Date.now()}`,
    payment_id: paymentId,
    from_status: 'pending',
    to_status: 'paid_escrow',
    triggered_by: 'webhook_paid',
    actor_role: 'system',
    reason: '3D Secure tahsilatı başarılı oldu; tutar iyzico korumalı havuzunda bloke edildi.',
    metadata: { providerPaymentId, autoReleaseAt },
    created_at: new Date().toISOString(),
  });

  return { success: true, transaction: tx };
}

// In-Memory Mutex Lock (PostgreSQL SELECT ... FOR UPDATE simülasyonu)
const inMemoryPaymentLocks = new Set<string>();

/**
 * 5. ALICININ İŞİ ONAYLAMASI VE ÖDEMENİN SERBEST BIRAKILMASI
 * KURAL: Firma asla kendi ödemesini serbest bırakamaz! Sadece alıcı yapabilir.
 */
export async function buyerConfirmAndReleaseEscrow(
  paymentId: string,
  actorUserId: string
): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
  const tx = DEMO_TRANSACTIONS.find((t) => t.id === paymentId);
  if (!tx) {
    return { success: false, error: 'Ödeme bulunamadı.' };
  }

  // Eşzamanlılık Kilidi (FOR UPDATE simülasyonu)
  if (inMemoryPaymentLocks.has(paymentId)) {
    return {
      success: false,
      error: 'Eşzamanlı işlem engellendi: Ödeme şu anda başka bir talep tarafından işleniyor (FOR UPDATE kilidi aktif).',
    };
  }
  inMemoryPaymentLocks.add(paymentId);

  try {
    // Yetki Kontrolü: Firma yetkilisi çağıramaz, sadece alıcı
    if (tx.buyer_id !== actorUserId) {
      return {
        success: false,
        error: 'Yetkisiz İşlem: Bir firma kendi hakedişini asla serbest bırakamaz! İş teslim onayı yalnızca alıcı tarafından verilebilir.',
      };
    }

    // Durum Makinesi Kontrolleri
    if (tx.status === 'transferred') {
      return { success: false, error: 'Ödeme zaten serbest bırakılmış ve firmaya aktarılmış.' };
    }

    if (tx.status === 'refunded') {
      return { success: false, error: 'İade edilmiş bir ödeme serbest bırakılamaz.' };
    }

    if (tx.status === 'disputed') {
      return { success: false, error: 'İtiraz edilmiş ödeme doğrudan serbest bırakılamaz. Yönetici hakem kararı beklenmelidir.' };
    }

    if (tx.status !== 'paid' && tx.status !== 'paid_escrow' && tx.status !== 'releasable') {
      return { success: false, error: `Geçersiz durum geçişi: ${tx.status}` };
    }

    // Sağlayıcıya onay gönder (iyzico approve API)
    const transferRes = await paymentGateway.approveTransferToSubMerchant({
      paymentTransactionId: tx.id,
      subMerchantKey: 'subm-anadolu-001',
      amountCents: tx.net_company_amount_cents,
    });

    if (!transferRes.success) {
      return { success: false, error: transferRes.error || 'Sağlayıcı onay transferi reddetti.' };
    }

    const fromStatus = tx.status;
    tx.status = 'transferred';
    tx.is_transferred_to_submerchant = true;
    tx.transferred_at = new Date().toISOString();
    tx.buyer_confirmed_at = new Date().toISOString();
    tx.updated_at = new Date().toISOString();

    // Olay Defteri Kaydı
    DEMO_PAYMENT_EVENTS.push({
      id: `evt-${Date.now()}`,
      payment_id: paymentId,
      from_status: fromStatus,
      to_status: 'transferred',
      triggered_by: 'buyer_confirmation',
      actor_id: actorUserId,
      actor_role: 'buyer',
      reason: 'Alıcı işi teslim aldığını onayladı ve ödemeyi serbest bıraktı.',
      metadata: { transferId: transferRes.transferId, netAmountCents: tx.net_company_amount_cents },
      created_at: new Date().toISOString(),
    });

    return { success: true, transaction: tx };
  } finally {
    inMemoryPaymentLocks.delete(paymentId);
  }
}

/**
 * 6. ALICININ İTİRAZ AÇMASI (SERBEST BIRAKMAYI DONDURUR)
 */
export async function openEscrowDispute(
  paymentId: string,
  buyerId: string,
  reason: string,
  notes?: string
): Promise<{ success: boolean; dispute?: PaymentDispute; error?: string }> {
  const tx = DEMO_TRANSACTIONS.find((t) => t.id === paymentId);
  if (!tx) {
    return { success: false, error: 'Ödeme bulunamadı.' };
  }

  if (tx.buyer_id !== buyerId) {
    return { success: false, error: 'Yalnızca siparişin alıcısı itiraz açabilir.' };
  }

  if (tx.status === 'transferred') {
    return { success: false, error: 'Ödeme zaten firmaya aktarılmış olduğundan havuz itirazı açılamaz.' };
  }

  if (tx.status === 'refunded') {
    return { success: false, error: 'İade edilmiş ödemeye itiraz açılamaz.' };
  }

  if (tx.status === 'disputed') {
    return { success: false, error: 'Bu işlem için zaten aktif bir itiraz mevcuttur.' };
  }

  // Sağlayıcıda olası otomatik aktarımı dondur
  await paymentGateway.disapproveTransfer({ paymentTransactionId: tx.id });

  const fromStatus = tx.status;
  tx.status = 'disputed';
  tx.disputed_at = new Date().toISOString();
  tx.dispute_status = 'opened';
  tx.dispute_reason = reason;
  tx.updated_at = new Date().toISOString();

  const dispute: PaymentDispute = {
    id: `disp-${Date.now()}`,
    payment_id: paymentId,
    buyer_id: buyerId,
    company_id: tx.company_id,
    reason,
    buyer_notes: notes || null,
    status: 'opened',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  DEMO_PAYMENT_DISPUTES.push(dispute);

  // Olay defterine dondurmayı yaz
  DEMO_PAYMENT_EVENTS.push({
    id: `evt-${Date.now()}`,
    payment_id: paymentId,
    from_status: fromStatus,
    to_status: 'disputed',
    triggered_by: 'dispute_opened',
    actor_id: buyerId,
    actor_role: 'buyer',
    reason,
    metadata: { disputeId: dispute.id, notes },
    created_at: new Date().toISOString(),
  });

  return { success: true, dispute };
}

/**
 * 7. FİRMANIN İTİRAZA CEVAP VERMESİ
 */
export async function companyRespondToDispute(
  disputeId: string,
  companyId: string,
  notes: string
): Promise<{ success: boolean; error?: string }> {
  const dispute = DEMO_PAYMENT_DISPUTES.find((d) => d.id === disputeId);
  if (!dispute) return { success: false, error: 'İtiraz kaydı bulunamadı.' };

  if (dispute.company_id !== companyId) {
    return { success: false, error: 'Yetkisiz işlem: Yalnızca muhatap firma cevap yazabilir.' };
  }

  dispute.company_notes = notes;
  dispute.company_responded_at = new Date().toISOString();
  dispute.status = 'under_review';
  dispute.updated_at = new Date().toISOString();

  return { success: true };
}

/**
 * 8. ADMİN İTİRAZ KARARI (ZORUNLU GEREKÇE + 2FA DOĞRULAMA LOGLU)
 */
export async function adminResolveDispute(params: {
  paymentId: string;
  adminId: string;
  resolutionType: 'transfer_to_company' | 'full_refund_to_buyer' | 'split';
  adminNotes: string;
  is2FAVerified: boolean;
  buyerRefundCents?: number;
  companyTransferCents?: number;
}): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
  const {
    paymentId,
    adminId,
    resolutionType,
    adminNotes,
    is2FAVerified,
    buyerRefundCents = 0,
    companyTransferCents = 0,
  } = params;

  if (!is2FAVerified) {
    return { success: false, error: 'Güvenlik Protokolü: Hakem kararı için 2FA doğrulaması zorunludur.' };
  }

  if (!adminNotes || adminNotes.trim().length < 5) {
    return { success: false, error: 'Gerekçe zorunludur (en az 5 karakter).' };
  }

  const tx = DEMO_TRANSACTIONS.find((t) => t.id === paymentId);
  if (!tx) return { success: false, error: 'Ödeme bulunamadı.' };

  if (tx.status !== 'disputed') {
    return { success: false, error: 'İşlem itiraz durumunda değil.' };
  }

  const dispute = DEMO_PAYMENT_DISPUTES.find((d) => d.payment_id === paymentId);

  let toStatus: 'transferred' | 'refunded' = 'transferred';

  if (resolutionType === 'transfer_to_company') {
    toStatus = 'transferred';
    await paymentGateway.approveTransferToSubMerchant({
      paymentTransactionId: tx.id,
      subMerchantKey: 'subm-anadolu-001',
      amountCents: tx.net_company_amount_cents,
    });
    tx.status = 'transferred';
    tx.is_transferred_to_submerchant = true;
    tx.transferred_at = new Date().toISOString();
    tx.dispute_status = 'resolved_transferred';
  } else if (resolutionType === 'full_refund_to_buyer') {
    toStatus = 'refunded';
    await paymentGateway.refundTransaction({
      providerPaymentId: tx.provider_payment_id || tx.id,
      amountCents: tx.amount_cents,
      reason: adminNotes,
    });
    tx.status = 'refunded';
    tx.refund_amount_cents = tx.amount_cents;
    tx.refunded_at = new Date().toISOString();
    tx.dispute_status = 'resolved_refunded';
  } else if (resolutionType === 'split') {
    toStatus = 'transferred';
    if (buyerRefundCents + companyTransferCents > tx.amount_cents) {
      return { success: false, error: 'Paylaşım tutarları toplamı ana ödemeyi aşamaz.' };
    }
    // Alıcıya iade
    if (buyerRefundCents > 0) {
      await paymentGateway.refundTransaction({
        providerPaymentId: tx.provider_payment_id || tx.id,
        amountCents: buyerRefundCents,
        reason: adminNotes,
      });
    }
    // Firmaya aktarım
    if (companyTransferCents > 0) {
      await paymentGateway.approveTransferToSubMerchant({
        paymentTransactionId: tx.id,
        subMerchantKey: 'subm-anadolu-001',
        amountCents: companyTransferCents,
      });
    }
    tx.status = 'transferred';
    tx.split_buyer_amount_cents = buyerRefundCents;
    tx.split_company_amount_cents = companyTransferCents;
    tx.refund_amount_cents = buyerRefundCents;
    tx.net_company_amount_cents = companyTransferCents;
    tx.is_transferred_to_submerchant = true;
    tx.dispute_status = 'resolved_split';
  }

  tx.dispute_resolution_notes = adminNotes;
  tx.dispute_resolved_at = new Date().toISOString();
  tx.dispute_resolved_by = adminId;
  tx.updated_at = new Date().toISOString();

  if (dispute) {
    dispute.status = `resolved_${resolutionType}` as any;
    dispute.resolution_type = resolutionType;
    dispute.admin_notes = adminNotes;
    dispute.admin_id = adminId;
    dispute.two_factor_verified_at = new Date().toISOString();
    dispute.resolved_at = new Date().toISOString();
    dispute.buyer_refund_cents = buyerRefundCents;
    dispute.company_transfer_cents = companyTransferCents;
  }

  DEMO_PAYMENT_EVENTS.push({
    id: `evt-${Date.now()}`,
    payment_id: paymentId,
    from_status: 'disputed',
    to_status: toStatus,
    triggered_by: 'dispute_resolved',
    actor_id: adminId,
    actor_role: 'admin',
    reason: adminNotes,
    metadata: { resolutionType, buyerRefundCents, companyTransferCents, twoFactorVerified: true },
    created_at: new Date().toISOString(),
  });

  return { success: true, transaction: tx };
}

/**
 * 9. OTOMATİK ZAMAN AŞIMI CRON İLE SERBEST BIRAKMA
 */
export async function cronAutoReleaseExpiredEscrows(): Promise<{
  success: boolean;
  releasedCount: number;
}> {
  const now = new Date();
  let count = 0;

  for (const tx of DEMO_TRANSACTIONS) {
    if (
      (tx.status === 'paid' || tx.status === 'paid_escrow') &&
      tx.auto_release_at &&
      new Date(tx.auto_release_at) <= now &&
      !tx.disputed_at
    ) {
      await paymentGateway.approveTransferToSubMerchant({
        paymentTransactionId: tx.id,
        subMerchantKey: 'subm-anadolu-001',
        amountCents: tx.net_company_amount_cents,
      });

      const fromStatus = tx.status;
      tx.status = 'transferred';
      tx.is_transferred_to_submerchant = true;
      tx.transferred_at = now.toISOString();
      tx.updated_at = now.toISOString();

      DEMO_PAYMENT_EVENTS.push({
        id: `evt-${Date.now()}`,
        payment_id: tx.id,
        from_status: fromStatus,
        to_status: 'transferred',
        triggered_by: 'auto_timeout',
        actor_role: 'system',
        reason: 'İtiraz süresi boyunca sorun bildirilmediğinden otomatik serbest bırakıldı.',
        metadata: { netCompanyAmountCents: tx.net_company_amount_cents },
        created_at: now.toISOString(),
      });

      count++;
    }
  }

  return { success: true, releasedCount: count };
}

/**
 * 10. GÜNLÜK MUTABAKAT VE UYUM KARŞILAŞTIRMASI
 */
export async function runDailyPaymentReconciliation(date: string): Promise<{
  success: boolean;
  date: string;
  internalTotalCents: number;
  providerTotalCents: number;
  discrepanciesCount: number;
  discrepancies: Array<{
    paymentId: string;
    issue: string;
    internalAmountCents: number;
    providerAmountCents: number;
  }>;
}> {
  const providerReport = await paymentGateway.getDailyReconciliationReport(date);

  const internalPayments = DEMO_TRANSACTIONS.filter((t) => t.created_at.startsWith(date));
  const internalTotalCents = internalPayments.reduce((acc, t) => acc + t.amount_cents, 0);

  const discrepancies: Array<{
    paymentId: string;
    issue: string;
    internalAmountCents: number;
    providerAmountCents: number;
  }> = [];

  // Check matching
  providerReport.records.forEach((rec) => {
    const match = DEMO_TRANSACTIONS.find(
      (t) => t.provider_payment_id === rec.providerPaymentId || t.id === rec.paymentTransactionId
    );
    if (!match) {
      discrepancies.push({
        paymentId: rec.providerPaymentId,
        issue: 'Sağlayıcıda var, platform veritabanında eksik!',
        internalAmountCents: 0,
        providerAmountCents: rec.amountCents,
      });
    } else if (match.amount_cents !== rec.amountCents) {
      discrepancies.push({
        paymentId: match.id,
        issue: 'Tutar uyumsuzluğu tespit edildi!',
        internalAmountCents: match.amount_cents,
        providerAmountCents: rec.amountCents,
      });
    }
  });

  return {
    success: true,
    date,
    internalTotalCents,
    providerTotalCents: providerReport.totalAmountCents,
    discrepanciesCount: discrepancies.length,
    discrepancies,
  };
}

export const cronCheckAutoReleaseEscrow = cronAutoReleaseExpiredEscrows;

export async function executeEscrowPayout(paymentId: string) {
  return buyerConfirmAndReleaseEscrow(paymentId, 'admin-system');
}

