import { Invoice, PaymentProvider } from '@prisma/client';

export interface CreatePaymentUrlResult {
  url: string;
  externalId?: string;
}

export interface WebhookResult {
  invoiceId: string;
  status: 'paid' | 'failed' | 'cancelled';
}

/**
 * Contract that every payment provider adapter must satisfy.
 * Each provider handles URL generation, webhook signature verification,
 * and webhook payload processing independently.
 */
export interface PaymentProviderInterface {
  /** Identifies which provider this adapter is for */
  readonly name: PaymentProvider;

  /**
   * Generates a payment URL for the given invoice.
   * Returns the redirect URL and optionally a provider-side transaction ID.
   */
  createPaymentUrl(invoice: Invoice): Promise<CreatePaymentUrlResult>;

  /**
   * Verifies the authenticity of a webhook payload using the provider's
   * signing mechanism.  Returns true if the signature is valid.
   */
  verifyWebhook(payload: unknown, signature?: string): boolean;

  /**
   * Parses a verified webhook payload and returns a normalised result
   * containing the local invoice ID and the payment outcome.
   */
  processWebhook(payload: unknown): Promise<WebhookResult>;
}
