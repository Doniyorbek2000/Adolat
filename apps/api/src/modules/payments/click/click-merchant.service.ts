import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { InvoiceStatus, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentSettings } from '../../../config/payment.config';
import { PaymentsService } from '../payments.service';
import { ClickAction, ClickError, CLICK_ERROR_NOTE } from './click.constants';

export interface ClickWebhookPayload {
  click_trans_id?: string | number;
  service_id?: string | number;
  merchant_trans_id?: string;
  merchant_prepare_id?: string | number;
  amount?: string | number;
  action?: string | number;
  sign_time?: string;
  sign_string?: string;
  error?: string | number;
}

export interface ClickResponse {
  click_trans_id: string | number;
  merchant_trans_id: string;
  merchant_prepare_id?: string | number;
  merchant_confirm_id?: string | number;
  error: number;
  error_note: string;
}

/**
 * Click Merchant API — Prepare (action=0) va Complete (action=1) protokoli.
 * Har bir bosqichda imzo (md5) tekshiriladi, tranzaksiya holati saqlanadi,
 * to'lov tasdiqlanganda invoice to'langan deb belgilanadi.
 */
@Injectable()
export class ClickMerchantService {
  private readonly logger = new Logger(ClickMerchantService.name);
  private readonly serviceId: string;
  private readonly secretKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
  ) {
    const payment = this.config.get<PaymentSettings>('payment')!;
    this.serviceId = payment.click.serviceId;
    this.secretKey = payment.click.secretKey;
  }

  async handle(payload: unknown): Promise<ClickResponse> {
    const p = (payload ?? {}) as ClickWebhookPayload;

    await this.prisma.paymentWebhookLog
      .create({
        data: {
          provider: 'CLICK',
          rawPayload: payload as Prisma.InputJsonValue,
          signatureValid: this.verifySign(p),
        },
      })
      .catch(() => undefined);

    if (!this.verifySign(p)) {
      return this.resp(p, ClickError.SIGN_CHECK_FAILED);
    }

    const action = Number(p.action);
    if (action === ClickAction.PREPARE) return this.prepare(p);
    if (action === ClickAction.COMPLETE) return this.complete(p);
    return this.resp(p, ClickError.ACTION_NOT_FOUND);
  }

  // ─── Prepare ───────────────────────────────────────────────────────────────

  private async prepare(p: ClickWebhookPayload): Promise<ClickResponse> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: p.merchant_trans_id ?? '' },
    });
    if (!invoice) return this.resp(p, ClickError.ORDER_NOT_FOUND);
    if (invoice.status === InvoiceStatus.PAID) return this.resp(p, ClickError.ALREADY_PAID);

    if (!this.amountMatches(invoice.amountUzs, p.amount)) {
      return this.resp(p, ClickError.INVALID_AMOUNT);
    }

    const clickTransId = String(p.click_trans_id);
    const merchantPrepareId = Date.now().toString();

    // Idempotentlik: shu click_trans_id bo'yicha allaqachon bor bo'lsa qайta ishlatamiz
    const existing = await this.prisma.clickTransaction.findUnique({ where: { clickTransId } });
    const prepareId = existing?.merchantPrepareId ?? merchantPrepareId;

    if (!existing) {
      await this.prisma.clickTransaction.create({
        data: {
          clickTransId,
          invoiceId: invoice.id,
          amount: invoice.amountUzs,
          merchantPrepareId: prepareId,
          status: 'PREPARING',
        },
      });
    }

    return this.resp(p, ClickError.SUCCESS, { merchant_prepare_id: prepareId });
  }

  // ─── Complete ──────────────────────────────────────────────────────────────

  private async complete(p: ClickWebhookPayload): Promise<ClickResponse> {
    const clickTransId = String(p.click_trans_id);
    const tx = await this.prisma.clickTransaction.findUnique({ where: { clickTransId } });
    if (!tx) return this.resp(p, ClickError.TRANSACTION_NOT_FOUND);

    if (String(tx.merchantPrepareId) !== String(p.merchant_prepare_id)) {
      return this.resp(p, ClickError.TRANSACTION_NOT_FOUND);
    }

    if (!this.amountMatches(tx.amount, p.amount)) {
      return this.resp(p, ClickError.INVALID_AMOUNT);
    }

    // Click error<0 bo'lsa — to'lov bekor qilingan
    if (Number(p.error) < 0) {
      if (tx.status !== 'CANCELLED') {
        await this.prisma.clickTransaction.update({
          where: { id: tx.id },
          data: { status: 'CANCELLED', cancelledAt: new Date() },
        });
        await this.payments.settleClickCancelled(tx.invoiceId);
      }
      return this.resp(p, ClickError.TRANSACTION_CANCELLED, {
        merchant_prepare_id: tx.merchantPrepareId ?? undefined,
      });
    }

    if (tx.status === 'PAID') {
      return this.resp(p, ClickError.ALREADY_PAID, {
        merchant_prepare_id: tx.merchantPrepareId ?? undefined,
      });
    }

    await this.prisma.clickTransaction.update({
      where: { id: tx.id },
      data: { status: 'PAID', paidAt: new Date() },
    });
    await this.payments.settleClickPaid(tx.invoiceId);

    return this.resp(p, ClickError.SUCCESS, {
      merchant_prepare_id: tx.merchantPrepareId ?? undefined,
      merchant_confirm_id: tx.merchantPrepareId ?? undefined,
    });
  }

  // ─── Yordamchilar ──────────────────────────────────────────────────────────

  private verifySign(p: ClickWebhookPayload): boolean {
    if (!this.secretKey || !p.sign_string || p.sign_time === undefined) return false;
    const action = Number(p.action);
    // Prepare va Complete imzosi farq qiladi (Complete'da merchant_prepare_id bor)
    const base =
      action === ClickAction.COMPLETE
        ? `${p.click_trans_id}${this.serviceId}${this.secretKey}${p.merchant_trans_id}${p.merchant_prepare_id}${p.amount}${p.action}${p.sign_time}`
        : `${p.click_trans_id}${this.serviceId}${this.secretKey}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`;
    const expected = createHash('md5').update(base).digest('hex');
    return expected === p.sign_string;
  }

  private amountMatches(invoiceAmount: Prisma.Decimal, incoming?: string | number): boolean {
    return Math.round(Number(invoiceAmount)) === Math.round(Number(incoming));
  }

  private resp(
    p: ClickWebhookPayload,
    error: ClickError,
    extra: Partial<ClickResponse> = {},
  ): ClickResponse {
    return {
      click_trans_id: p.click_trans_id ?? '',
      merchant_trans_id: p.merchant_trans_id ?? '',
      error,
      error_note: CLICK_ERROR_NOTE[error],
      ...extra,
    };
  }
}
