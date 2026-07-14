import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvoiceStatus, PaymeTransaction, Prisma } from '@prisma/client';

import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentSettings } from '../../../config/payment.config';
import { PaymentsService } from '../payments.service';
import {
  PaymeCancelReason,
  PaymeState,
  PAYME_TRANSACTION_TIMEOUT_MS,
} from './payme.constants';
import {
  PaymeError,
  PaymeErrors,
  PaymeRpcRequest,
  PaymeRpcResponse,
  rpcError,
  rpcSuccess,
} from './payme.errors';

/**
 * Payme Merchant API (JSON-RPC 2.0) to'liq amalga oshirilishi.
 *
 * Metodlar: CheckPerformTransaction, CreateTransaction, PerformTransaction,
 * CancelTransaction, CheckTransaction, GetStatement.
 *
 * `handle()` har doim HTTP 200 bilan JSON-RPC javob qaytaradi (result yoki error).
 */
@Injectable()
export class PaymeMerchantService {
  private readonly logger = new Logger(PaymeMerchantService.name);
  private readonly merchantKey: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly payments: PaymentsService,
  ) {
    this.merchantKey = this.config.get<PaymentSettings>('payment')!.payme.secretKey;
  }

  // ─── Kirish nuqtasi ─────────────────────────────────────────────────────────

  async handle(payload: unknown, authorization?: string): Promise<PaymeRpcResponse> {
    const req = (payload ?? {}) as PaymeRpcRequest;
    const id = req.id ?? null;

    const authValid = this.verifyAuth(authorization);
    // Audit uchun log (asosiy oqimni to'xtatmaydi)
    await this.prisma.paymentWebhookLog
      .create({
        data: {
          provider: 'PAYME',
          rawPayload: payload as Prisma.InputJsonValue,
          signatureValid: authValid,
        },
      })
      .catch(() => undefined);

    if (!authValid) {
      return rpcError(id, PaymeErrors.insufficientPrivilege());
    }

    try {
      const result = await this.dispatch(req);
      return rpcSuccess(id, result);
    } catch (err) {
      if (err instanceof PaymeError) {
        return rpcError(id, err);
      }
      this.logger.error(`Payme handler kutilmagan xato: ${String(err)}`);
      return rpcError(id, PaymeErrors.cannotPerform());
    }
  }

  private async dispatch(req: PaymeRpcRequest): Promise<unknown> {
    const params = req.params ?? {};
    switch (req.method) {
      case 'CheckPerformTransaction':
        return this.checkPerform(params);
      case 'CreateTransaction':
        return this.createTransaction(params);
      case 'PerformTransaction':
        return this.performTransaction(params);
      case 'CancelTransaction':
        return this.cancelTransaction(params);
      case 'CheckTransaction':
        return this.checkTransaction(params);
      case 'GetStatement':
        return this.getStatement(params);
      default:
        throw PaymeErrors.methodNotFound();
    }
  }

  // ─── Autentifikatsiya ───────────────────────────────────────────────────────

  private verifyAuth(authorization?: string): boolean {
    if (!authorization?.startsWith('Basic ')) return false;
    try {
      const decoded = Buffer.from(authorization.slice(6), 'base64').toString('utf-8');
      const [, key] = decoded.split(':');
      return Boolean(this.merchantKey) && key === this.merchantKey;
    } catch {
      return false;
    }
  }

  // ─── Metodlar ───────────────────────────────────────────────────────────────

  private async checkPerform(params: PaymeRpcRequest['params']): Promise<{ allow: true }> {
    await this.resolvePayableInvoice(params);
    return { allow: true };
  }

  private async createTransaction(
    params: PaymeRpcRequest['params'],
  ): Promise<{ create_time: number; transaction: string; state: number }> {
    const paymeId = params?.id ?? '';

    const existing = await this.prisma.paymeTransaction.findUnique({ where: { paymeId } });
    if (existing) {
      if (existing.state !== PaymeState.CREATED) {
        throw PaymeErrors.cannotPerform();
      }
      if (this.isExpired(existing)) {
        await this.markCancelled(existing.id, PaymeCancelReason.CANCELLED_BY_TIMEOUT);
        throw PaymeErrors.cannotPerform();
      }
      return {
        create_time: Number(existing.createTime),
        transaction: existing.id,
        state: existing.state,
      };
    }

    // Yangi tranzaksiya — buyurtma va summani tekshiramiz
    const invoice = await this.resolvePayableInvoice(params);

    // Bitta buyurtmaga faqat bitta faol tranzaksiya
    const active = await this.prisma.paymeTransaction.findFirst({
      where: { invoiceId: invoice.id, state: { in: [PaymeState.CREATED, PaymeState.PAID] } },
    });
    if (active) {
      throw PaymeErrors.cannotPerform();
    }

    const createTime = params?.time ?? Date.now();
    const created = await this.prisma.paymeTransaction.create({
      data: {
        paymeId,
        invoiceId: invoice.id,
        amount: BigInt(params?.amount ?? 0),
        state: PaymeState.CREATED,
        createTime: BigInt(createTime),
      },
    });

    return { create_time: Number(created.createTime), transaction: created.id, state: created.state };
  }

  private async performTransaction(
    params: PaymeRpcRequest['params'],
  ): Promise<{ transaction: string; perform_time: number; state: number }> {
    const tx = await this.findByPaymeId(params?.id);

    if (tx.state === PaymeState.CREATED) {
      if (this.isExpired(tx)) {
        await this.markCancelled(tx.id, PaymeCancelReason.CANCELLED_BY_TIMEOUT);
        throw PaymeErrors.cannotPerform();
      }
      const performTime = Date.now();
      const updated = await this.prisma.paymeTransaction.update({
        where: { id: tx.id },
        data: { state: PaymeState.PAID, performTime: BigInt(performTime) },
      });
      // Invoice'ni to'langan deb belgilaymiz va obunani faollashtiramiz
      await this.payments.settlePaymePaid(tx.invoiceId);
      return { transaction: updated.id, perform_time: Number(updated.performTime), state: updated.state };
    }

    if (tx.state === PaymeState.PAID) {
      return { transaction: tx.id, perform_time: Number(tx.performTime), state: tx.state };
    }

    throw PaymeErrors.cannotPerform();
  }

  private async cancelTransaction(
    params: PaymeRpcRequest['params'],
  ): Promise<{ transaction: string; cancel_time: number; state: number }> {
    const tx = await this.findByPaymeId(params?.id);
    const reason = params?.reason ?? PaymeCancelReason.UNKNOWN;

    if (tx.state === PaymeState.CREATED || tx.state === PaymeState.PAID) {
      const newState =
        tx.state === PaymeState.PAID ? PaymeState.CANCELLED_AFTER_PAID : PaymeState.CANCELLED;
      const updated = await this.markCancelled(tx.id, reason, newState);
      await this.payments.settlePaymeCancelled(tx.invoiceId);
      return { transaction: updated.id, cancel_time: Number(updated.cancelTime), state: updated.state };
    }

    // Allaqachon bekor qilingan — idempotent
    return { transaction: tx.id, cancel_time: Number(tx.cancelTime), state: tx.state };
  }

  private async checkTransaction(params: PaymeRpcRequest['params']): Promise<{
    create_time: number;
    perform_time: number;
    cancel_time: number;
    transaction: string;
    state: number;
    reason: number | null;
  }> {
    const tx = await this.findByPaymeId(params?.id);
    return {
      create_time: Number(tx.createTime),
      perform_time: Number(tx.performTime),
      cancel_time: Number(tx.cancelTime),
      transaction: tx.id,
      state: tx.state,
      reason: tx.reason ?? null,
    };
  }

  private async getStatement(
    params: PaymeRpcRequest['params'],
  ): Promise<{ transactions: unknown[] }> {
    const from = BigInt(params?.from ?? 0);
    const to = BigInt(params?.to ?? Date.now());

    const rows = await this.prisma.paymeTransaction.findMany({
      where: { createTime: { gte: from, lte: to } },
      orderBy: { createTime: 'asc' },
    });

    return {
      transactions: rows.map((tx) => ({
        id: tx.paymeId,
        time: Number(tx.createTime),
        amount: Number(tx.amount),
        account: { invoice_id: tx.invoiceId },
        create_time: Number(tx.createTime),
        perform_time: Number(tx.performTime),
        cancel_time: Number(tx.cancelTime),
        transaction: tx.id,
        state: tx.state,
        reason: tx.reason ?? null,
      })),
    };
  }

  // ─── Yordamchilar ───────────────────────────────────────────────────────────

  /** Buyurtmani topadi va summasini tekshiradi (CheckPerform/Create uchun). */
  private async resolvePayableInvoice(params: PaymeRpcRequest['params']) {
    const invoiceId = params?.account?.invoice_id;
    if (!invoiceId) {
      throw PaymeErrors.orderNotFound();
    }

    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) {
      throw PaymeErrors.orderNotFound();
    }
    if (invoice.status === InvoiceStatus.PAID) {
      throw PaymeErrors.orderAlreadyPaid();
    }

    const expectedTiyin = Math.round(Number(invoice.amountUzs) * 100);
    if (Number(params?.amount) !== expectedTiyin) {
      throw PaymeErrors.invalidAmount();
    }

    return invoice;
  }

  private async findByPaymeId(paymeId?: string): Promise<PaymeTransaction> {
    const tx = paymeId
      ? await this.prisma.paymeTransaction.findUnique({ where: { paymeId } })
      : null;
    if (!tx) {
      throw PaymeErrors.transactionNotFound();
    }
    return tx;
  }

  private isExpired(tx: PaymeTransaction): boolean {
    return Date.now() - Number(tx.createTime) > PAYME_TRANSACTION_TIMEOUT_MS;
  }

  private markCancelled(
    id: string,
    reason: number,
    state: PaymeState = PaymeState.CANCELLED,
  ): Promise<PaymeTransaction> {
    return this.prisma.paymeTransaction.update({
      where: { id },
      data: { state, cancelTime: BigInt(Date.now()), reason },
    });
  }
}
