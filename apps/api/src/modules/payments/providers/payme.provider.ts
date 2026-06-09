import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Invoice, PaymentProvider } from '@prisma/client';

import { PaymentProviderInterface, CreatePaymentUrlResult, WebhookResult } from './payment-provider.interface';
import { AppSettings } from '../../../config/app.config';
import { PaymentSettings } from '../../../config/payment.config';

interface PaymeRpcPayload {
  method?: string;
  params?: {
    id?: string;
    amount?: number;
    account?: { order_id?: string; invoice_id?: string };
    reason?: number;
  };
}

@Injectable()
export class PaymeProvider implements PaymentProviderInterface {
  readonly name = PaymentProvider.PAYME;

  private readonly logger = new Logger(PaymeProvider.name);
  private readonly merchantId: string;
  private readonly secretKey: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const payment = this.config.get<PaymentSettings>('payment')!;
    const app = this.config.get<AppSettings>('app')!;
    this.merchantId = payment.payme.merchantId;
    this.secretKey = payment.payme.secretKey;
    this.frontendUrl = app.frontendUrl;
  }

  async createPaymentUrl(invoice: Invoice): Promise<CreatePaymentUrlResult> {
    // Payme expects amount in tiyin (1 UZS = 100 tiyin)
    const amountTiyin = Math.round(Number(invoice.amountUzs) * 100);
    const params = Buffer.from(
      `m=${this.merchantId};ac.invoice_id=${invoice.id};a=${amountTiyin};c=${encodeURIComponent(`${this.frontendUrl}/payment/success`)}`,
    ).toString('base64');

    const url = `https://checkout.paycom.uz/${params}`;
    this.logger.debug(`Payme payment URL created for invoice ${invoice.id}`);
    return { url };
  }

  verifyWebhook(_payload: unknown, authorization?: string): boolean {
    try {
      // Payme sends HTTP Basic auth header: "Basic base64(Paycom:<merchant_key>)"
      const authHeader = authorization ?? '';
      if (!authHeader.startsWith('Basic ')) {
        this.logger.warn('Payme webhook: Authorization header missing or not Basic');
        return false;
      }
      const decoded = Buffer.from(authHeader.slice(6), 'base64').toString('utf-8');
      const [, key] = decoded.split(':');
      return key === this.secretKey;
    } catch (err) {
      this.logger.warn(`Payme webhook auth verification failed: ${(err as Error).message}`);
      return false;
    }
  }

  async processWebhook(payload: unknown): Promise<WebhookResult> {
    const rpc = payload as PaymeRpcPayload;
    const method = rpc.method ?? '';
    const invoiceId =
      rpc.params?.account?.invoice_id ?? rpc.params?.account?.order_id ?? rpc.params?.id ?? '';

    let status: WebhookResult['status'];

    switch (method) {
      case 'PerformTransaction':
        status = 'paid';
        break;
      case 'CancelTransaction':
        status = 'cancelled';
        break;
      default:
        // CheckPerformTransaction, CreateTransaction — not terminal states
        status = 'failed';
        break;
    }

    return { invoiceId, status };
  }
}
