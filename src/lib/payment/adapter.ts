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
  rawResponse?: any;
}

export interface WebhookVerificationResult {
  isValid: boolean;
  paymentId?: string;
  status?: 'paid' | 'failed';
  amountCents?: number;
  rawPayload?: any;
  eventId?: string;
}

export interface TransferResult {
  success: boolean;
  transferId?: string;
  error?: string;
  rawResponse?: any;
}

export interface RefundResult {
  success: boolean;
  refundId?: string;
  refundedAmountCents?: number;
  error?: string;
  rawResponse?: any;
}

export interface CreateSubMerchantParams {
  externalId: string;
  subMerchantType: 'PERSONAL' | 'PRIVATE_COMPANY' | 'LIMITED_OR_JOINT_STOCK_COMPANY';
  name: string;
  email: string;
  gsmNumber: string;
  address: string;
  iban: string;
  identityNumber?: string;
  taxNumber?: string;
  taxOffice?: string;
}

export interface SubMerchantResult {
  success: boolean;
  subMerchantKey?: string;
  error?: string;
  rawResponse?: any;
}

/**
 * Universal Payment Gateway Adapter Interface
 * Allows seamless switching between iyzico, PayTR, or future banking adapters.
 */
export interface PaymentGatewayAdapter {
  readonly providerName: string;

  isConfigured(): boolean;
  createSubMerchant(params: CreateSubMerchantParams): Promise<SubMerchantResult>;
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
