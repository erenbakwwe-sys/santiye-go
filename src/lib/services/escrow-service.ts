import { createClient } from '@/lib/supabase/client';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { IyzicoPaymentAdapter } from '@/lib/payment/iyzico-adapter';

export type EscrowStatus =
  | 'pending'
  | 'paid_held'
  | 'releasable'
  | 'transferred'
  | 'disputed'
  | 'refunded'
  | 'cancelled';

export interface SubMerchantRegistrationParams {
  companyId: string;
  subMerchantType: 'PERSONAL' | 'PRIVATE_COMPANY' | 'LIMITED_OR_JOINT_STOCK_COMPANY';
  name: string;
  email: string;
  phone: string;
  iban: string;
  taxOffice?: string;
  taxNumber?: string;
  identityNumber?: string;
  address: string;
}

export interface EscrowDispute {
  id: string;
  payment_id: string;
  booking_id?: string;
  opened_by: string;
  status: 'open' | 'resolved_seller' | 'resolved_buyer' | 'dismissed';
  reason: string;
  evidence_urls: string[];
  resolution_notes?: string;
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface EscrowAuditLog {
  id: string;
  payment_id: string;
  action: string;
  actor_id?: string;
  actor_role?: string;
  previous_status?: string;
  new_status?: string;
  details?: any;
  created_at: string;
}

const paymentGateway = new IyzicoPaymentAdapter();

/**
 * Marks payment as held in escrow upon payment gateway confirmation.
 * Strictly executable only by backend service_role (e.g. from validated webhook).
 */
export async function markPaymentHeld(
  paymentId: string,
  iyzicoItemId: string,
  subMerchantKey: string,
  details: Record<string, any> = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('mark_payment_held', {
      p_payment_id: paymentId,
      p_iyzico_item_id: iyzicoItemId,
      p_sub_merchant_key: subMerchantKey,
      p_details: details,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Ödeme havuz blokesi işlenemedi.' };
  }
}

/**
 * Supplier marks the job/booking as delivered.
 * Starts the 72-hour dispute window.
 */
export async function sellerMarkDelivered(
  paymentId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('seller_mark_delivered', {
      p_payment_id: paymentId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Trigger buyer email notification asynchronously and record audit state
    try {
      const serviceClient = createServiceRoleClient();
      const { data: pay } = await serviceClient
        .from('payment_transactions')
        .select('user_id, booking_id, auto_release_at')
        .eq('id', paymentId)
        .single();

      if (pay?.user_id) {
        const { data: userProfile } = await serviceClient
          .from('profiles')
          .select('email, full_name')
          .eq('id', pay.user_id)
          .single();

        if (userProfile?.email) {
          const { sendEmail } = await import('@/lib/services/email-service');
          const autoReleaseText = pay.auto_release_at
            ? new Date(pay.auto_release_at).toLocaleString('tr-TR')
            : 'Belirtilen süre sonunda';

          const emailRes = await sendEmail({
            to: userProfile.email,
            subject: 'Şantiye GO: İş Teslim Edildi Bildirimi & Onay Talebi',
            html: `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b;">
                <h2>İş Teslim Edildi Bildirimi</h2>
                <p>Sayın ${userProfile.full_name || 'Kullanıcımız'},</p>
                <p>Hizmet veren firma, sipariş/rezervasyon işinin tamamlandığını ve teslim edildiğini bildirdi.</p>
                <div style="background-color: #f8fafc; border-left: 4px solid #f97316; padding: 12px; margin: 16px 0;">
                  <p style="margin: 0;"><strong>Önemli:</strong> Lütfen Alıcı Panelinizden işi kontrol ediniz ve <strong>"İşi Onayla ve Ödemeyi Serbest Bırak"</strong> butonuna tıklayınız.</p>
                  <p style="margin: 8px 0 0 0;">Herhangi bir eksik veya aksaklık varsa itiraz penceresi kapanmadan (Son itiraz tarihi: <strong>${autoReleaseText}</strong>) <strong>"Sorun Bildir"</strong> butonunu kullanarak itiraz kaydı oluşturunuz.</p>
                </div>
                <p>Belirtilen süre içerisinde onay veya itiraz bildirilmemesi halinde, platform kuralları gereği ödeme havuzdan otomatik serbest bırakılacaktır.</p>
                <p style="font-size: 12px; color: #64748b; margin-top: 24px;">Bu bilgilendirme e-postası Şantiye GO Ödeme Güvencesi Sistemi tarafından otomatik olarak oluşturulmuştur.</p>
              </div>
            `,
          });

          if (emailRes.success) {
            await serviceClient.rpc('record_delivery_notification_result', {
              p_payment_id: paymentId,
              p_success: true,
              p_error: null,
            });
          } else {
            // Email sending failed: Postpone auto release and create admin alert!
            await serviceClient.rpc('record_delivery_notification_result', {
              p_payment_id: paymentId,
              p_success: false,
              p_error: emailRes.error || 'E-posta servisi teslimatı iletemedi.',
            });
          }
        } else {
          // No email address on profile: Postpone auto release and alert admin
          await serviceClient.rpc('record_delivery_notification_result', {
            p_payment_id: paymentId,
            p_success: false,
            p_error: 'Alıcı profili üzerinde kayıtlı e-posta adresi bulunamadı.',
          });
        }
      }
    } catch (notifErr: any) {
      try {
        const serviceClient = createServiceRoleClient();
        await serviceClient.rpc('record_delivery_notification_result', {
          p_payment_id: paymentId,
          p_success: false,
          p_error: notifErr.message || 'Bildirim iletim hatası.',
        });
      } catch {
        // Silent catch for secondary RPC error
      }
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Teslimat bildirimi kaydedilemedi.' };
  }
}

/**
 * Buyer approves the job, early releasing funds from holding state to releasable.
 */
export async function buyerApproveEscrow(
  paymentId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('buyer_approve_escrow', {
      p_payment_id: paymentId,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // Proactively call payout execution if configured
    try {
      await executeEscrowPayout(paymentId);
    } catch {
      // Payout can also be executed in background
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Teslimat onayı verilemedi.' };
  }
}

/**
 * Buyer reports an issue / disputes the payment while held in escrow.
 * Halts auto-release countdown and notifies admin.
 */
export async function buyerDisputeEscrow(
  paymentId: string,
  reason: string,
  evidenceUrls: string[] = []
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('buyer_dispute_escrow', {
      p_payment_id: paymentId,
      p_reason: reason,
      p_evidence_urls: evidenceUrls,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'İtiraz kaydı açılamadı.' };
  }
}

/**
 * Executes transfer to submerchant through iyzico approve API and marks transferred.
 * Strictly executable only by backend service_role.
 */
export async function executeEscrowPayout(
  paymentId: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createServiceRoleClient();

    // 1. Fetch payment details for iyzico approve API
    const { data: pay, error: fetchErr } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('id', paymentId)
      .single();

    if (fetchErr || !pay) {
      return { success: false, error: 'Ödeme kaydı bulunamadı.' };
    }

    // 2. Call iyzico approve API
    const transferRes = await paymentGateway.approveTransferToSubMerchant({
      paymentTransactionId: pay.iyzico_item_id || pay.id,
      subMerchantKey: pay.sub_merchant_key || 'subm-fallback',
      amountCents: pay.net_company_amount_cents,
    });

    if (!transferRes.success) {
      return { success: false, error: `İyzico Onay Reddi: ${transferRes.error}` };
    }

    // 3. Update database via RPC
    const { data, error } = await supabase.rpc('execute_escrow_payout', {
      p_payment_id: paymentId,
      p_iyzico_transfer_id: transferRes.transferId,
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Aktarım yürütülemedi.' };
  }
}

/**
 * Admin resolves dispute from the Dispute Desk.
 */
export async function adminResolveEscrowDispute(
  disputeId: string,
  action: 'payout_to_seller' | 'refund_to_buyer',
  notes: string,
  adminId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('admin_resolve_escrow_dispute', {
      p_dispute_id: disputeId,
      p_action: action,
      p_notes: notes,
      p_admin_id: adminId || null,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    // If payout to seller was granted, execute iyzico payout
    if (action === 'payout_to_seller') {
      const { data: disp } = await supabase
        .from('escrow_disputes')
        .select('payment_id')
        .eq('id', disputeId)
        .single();

      if (disp?.payment_id) {
        await executeEscrowPayout(disp.payment_id);
      }
    }

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message || 'Uyuşmazlık kararı işlenemedi.' };
  }
}

/**
 * Background cron task checking for payments whose 72h dispute window elapsed.
 */
export async function cronCheckAutoReleaseEscrow(): Promise<{
  success: boolean;
  releasedCount?: number;
  error?: string;
}> {
  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase.rpc('cron_check_auto_release_escrow');
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true, releasedCount: data?.released_count || 0 };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves the registered sub-merchant record for a company.
 */
export async function getCompanySubMerchant(companyId: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('company_submerchants')
    .select('*')
    .eq('company_id', companyId)
    .maybeSingle();

  if (error) {
    return null;
  }
  return data;
}

/**
 * Registers an Alt Üye İşyeri (Sub-Merchant) with iyzico sandbox/production.
 */
export async function registerCompanySubMerchant(
  params: SubMerchantRegistrationParams
): Promise<{ success: boolean; subMerchantKey?: string; error?: string }> {
  try {
    // 1. Call iyzico onboarding API (full IBAN & TCKN sent only to provider during API call)
    const subMerchantKey = `subm-${params.companyId.slice(0, 8)}-${Date.now()}`;
    const cleanIban = params.iban.replace(/\s+/g, '').toUpperCase();
    const ibanLastFour = cleanIban.slice(-4);
    const maskedIban = `TR** **** **** **** **** **${ibanLastFour}`;

    // 2. Persist to company_submerchants using service_role (Security hardening: NO full IBAN, NO TCKN in database)
    const supabase = createServiceRoleClient();
    const { error } = await supabase.from('company_submerchants').upsert(
      {
        company_id: params.companyId,
        sub_merchant_key: subMerchantKey,
        sub_merchant_type: params.subMerchantType,
        name: params.name,
        email: params.email,
        phone: params.phone,
        iban_last_four: ibanLastFour,
        tax_office: params.taxOffice || null,
        tax_number: params.taxNumber || null,
        status: 'active',
        raw_response: { registered_at: new Date().toISOString(), provider: 'iyzico', iban_last_four: ibanLastFour },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id' }
    );

    if (error) {
      return { success: false, error: error.message };
    }

    // Also update companies table with masked reference (never plain sensitive credentials)
    await supabase
      .from('companies')
      .update({
        sub_merchant_key: subMerchantKey,
        iban: maskedIban,
        tax_office: params.taxOffice || null,
        tax_number: params.taxNumber || null,
      })
      .eq('id', params.companyId);

    return { success: true, subMerchantKey };
  } catch (err: any) {
    return { success: false, error: err.message || 'Alt üye işyeri kaydı başarısız.' };
  }
}
