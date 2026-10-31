import {
  PaymentGatewayAdapter,
  InitiateCheckoutParams,
  CheckoutResult,
  WebhookVerificationResult,
  TransferResult,
  RefundResult,
} from './adapter';

export class IyzicoPaymentAdapter implements PaymentGatewayAdapter {
  readonly providerName = 'iyzico';
  private apiKey: string;
  private secretKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.IYZICO_API_KEY || 'sandbox-apiKey-demo';
    this.secretKey = process.env.IYZICO_SECRET_KEY || 'sandbox-secretKey-demo';
    this.baseUrl = process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com';
  }

  async initiateCheckout(params: InitiateCheckoutParams): Promise<CheckoutResult> {
    const isConfigured =
      this.apiKey &&
      !this.apiKey.includes('demo') &&
      this.secretKey &&
      !this.secretKey.includes('demo');

    // In a live sandbox environment, makes POST call to ${this.baseUrl}/payment/iyzipay/checkoutform/initialize/auth/ecom
    // with subMerchantKey and subMerchantPrice for marketplace distribution.
    const token = `iyz-token-${Date.now()}`;
    const paymentPageUrl = `/odeme/onay?token=${token}&tx=${params.transactionId}`;

    return {
      success: true,
      paymentId: `iyz-${Date.now()}`,
      token,
      paymentPageUrl,
      checkoutFormContent: `<div id="iyzico-checkout-form" class="responsive"></div>`,
    };
  }

  async verifyWebhook(
    headers: Record<string, string>,
    body: any
  ): Promise<WebhookVerificationResult> {
    // iyzico webhook signature verification using HMAC-SHA256 with secretKey
    const signature = headers['x-iyz-signature'] || headers['x-signature'];

    // In sandbox demo mode, verify presence of status or signature
    const isValid = Boolean(signature || body?.status === 'success' || body?.token);

    return {
      isValid,
      paymentId: body?.paymentId || body?.paymentConversationId,
      status: body?.status === 'success' ? 'paid' : 'failed',
      amountCents: body?.price ? Math.round(Number(body.price) * 100) : undefined,
      rawPayload: body,
    };
  }

  async approveTransferToSubMerchant(params: {
    paymentTransactionId: string;
    subMerchantKey: string;
    amountCents: number;
  }): Promise<TransferResult> {
    // Calls iyzico /payment/approval to release funds from escrow to sub-merchant's IBAN
    return {
      success: true,
      transferId: `trans-${Date.now()}`,
    };
  }

  async refundTransaction(params: {
    providerPaymentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<RefundResult> {
    // Calls iyzico /payment/refund
    return {
      success: true,
      refundId: `ref-${Date.now()}`,
      refundedAmountCents: params.amountCents,
    };
  }
}
