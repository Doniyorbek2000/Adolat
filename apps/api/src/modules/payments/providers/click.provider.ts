import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Invoice, PaymentProvider } from '@prisma/client';

import { PaymentProviderInterface, CreatePaymentUrlResult, WebhookResult } from './payment-provider.interface';
import { AppSettings } from '../../../config/app.config';
import { PaymentSettings } from '../../../config/payment.config';

interface ClickWebhookPayload {
  click_trans_id?: string | number;
  service_id?: string | number;
  click_paydoc_id?: string | number;
  merchant_trans_id?: string;
  amount?: string | number;
  action?: string | number;
  error?: string | number;
  error_note?: string;
  sign_time?: string;
  sign_string?: string;
}

@Injectable()
export class ClickProvider implements PaymentProviderInterface {
  readonly name = PaymentProvider.CLICK;

  private readonly logger = new Logger(ClickProvider.name);
  private readonly merchantId: string;
  private readonly serviceId: string;
  private readonly secretKey: string;
  private readonly frontendUrl: string;

  constructor(private readonly config: ConfigService) {
    const payment = this.config.get<PaymentSettings>('payment')!;
    const app = this.config.get<AppSettings>('app')!;
    this.merchantId = payment.click.merchantId;
    this.serviceId = payment.click.serviceId;
    this.secretKey = payment.click.secretKey;
    this.frontendUrl = app.frontendUrl;
  }

  async createPaymentUrl(invoice: Invoice): Promise<CreatePaymentUrlResult> {
    const amount = Number(invoice.amountUzs);
    const url =
      `https://my.click.uz/services/pay` +
      `?service_id=${this.serviceId}` +
      `&merchant_id=${this.merchantId}` +
      `&amount=${amount}` +
      `&transaction_param=${invoice.id}` +
      `&return_url=${encodeURIComponent(`${this.frontendUrl}/payment/success`)}`;

    this.logger.debug(`Click payment URL created for invoice ${invoice.id}`);
    return { url };
  }

  verifyWebhook(payload: unknown, _signature?: string): boolean {
    try {
      const p = payload as ClickWebhookPayload;
      if (!p.merchant_trans_id || !p.click_trans_id || !p.amount || p.sign_time === undefined) {
        return false;
      }

      const expected = createHash('md5')
        .update(
          `${p.click_trans_id}${this.serviceId}${this.secretKey}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`,
        )
        .digest('hex');

      return expected === p.sign_string;
    } catch (err) {
      this.logger.warn(`Click webhook signature verification failed: ${(err as Error).message}`);
      return false;
    }
  }

  async processWebhook(payload: unknown): Promise<WebhookResult> {
    const p = payload as ClickWebhookPayload;
    const invoiceId = p.merchant_trans_id ?? '';
    const error = Number(p.error ?? 0);
    const action = Number(p.action ?? 0);

    // Click action=1 = perform transaction; error=0 = success
    let status: WebhookResult['status'];
    if (action === 1 && error === 0) {
      status = 'paid';
    } else if (error < 0) {
      status = 'failed';
    } else {
      status = 'cancelled';
    }

    return { invoiceId, status };
  }
}
