export interface CheckoutItem {
  id: string;
  name: string;
  category: string;
  priceCents: number;
}

export interface InitiateCheckoutParams {
  transactionId: string;
  bookingId?: string;
  amountCents: number;
  currency: string;
  buyer: {
    id: string;
    name: string;
    surname: string;
    email: string;
    phone: string;
    identityNumber?: string;
    address: string;
    city: string;
  };
  subMerchantKey?: string | null;
  subMerchantPriceCents?: number;
  items: CheckoutItem[];
  callbackUrl: string;
}

export interface CheckoutResult {
  success: boolean;
  paymentId?: string;
  token?: string;
  checkoutFormContent?: string;
  paymentPageUrl?: string;
  error?: string;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  paymentId?: string;
  status?: 'paid' | 'failed';
  amountCents?: number;
  rawPayload?: any;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  error?: string;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundedAmountCents?: number;
  error?: string;
}

/**
 * Universal Payment Gateway Adapter Interface
 * Allows seamless switching between iyzico, PayTR, or local Mock provider.
 */
export interface PaymentGatewayAdapter {
  readonly providerName: string;

  initiateCheckout(params: InitiateCheckoutParams): Promise<CheckoutResult>;
  verifyWebhook(headers: Record<string, string>, body: any): Promise<WebhookVerificationResult>;
  approveTransferToSubMerchant(params: {
    paymentTransactionId: string;
    subMerchantKey: string;
    amountCents: number;
  }): Promise<TransferResult>;
  refundTransaction(params: {
    providerPaymentId: string;
    amountCents: number;
    reason?: string;
  }): Promise<RefundResult>;
}
