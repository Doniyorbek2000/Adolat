import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Invoice,
  InvoiceStatus,
  PaymentProvider,
  PaymentStatus,
  Prisma,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { ClickProvider } from './providers/click.provider';
import { PaymeProvider } from './providers/payme.provider';
import { PaymentProviderInterface } from './providers/payment-provider.interface';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly providers: Map<PaymentProvider, PaymentProviderInterface>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly subscriptionsService: SubscriptionsService,
    private readonly auditLogs: AuditLogsService,
    private readonly clickProvider: ClickProvider,
    private readonly paymeProvider: PaymeProvider,
  ) {
    this.providers = new Map<PaymentProvider, PaymentProviderInterface>([
      [PaymentProvider.CLICK, this.clickProvider],
      [PaymentProvider.PAYME, this.paymeProvider],
    ]);
  }

  // ----------------------------------------------------------------
  // Invoice creation
  // ----------------------------------------------------------------

  async createInvoice(
    userId: string,
    dto: CreateInvoiceDto,
  ): Promise<{ invoice: Invoice; paymentUrl: string }> {
    const invoice = await this.subscriptionsService.createInvoiceForPlan(userId, dto.planId);

    const provider = this.getProvider(dto.provider);
    const { url, externalId } = await provider.createPaymentUrl(invoice);

    // Store provider metadata on the invoice
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        metadata: {
          provider: dto.provider,
          paymentUrl: url,
          ...(externalId ? { externalId } : {}),
        } as Prisma.InputJsonValue,
      },
    });

    // Create a PENDING payment record
    await this.prisma.payment.create({
      data: {
        userId,
        invoiceId: invoice.id,
        provider: dto.provider,
        amountUzs: invoice.amountUzs,
        status: PaymentStatus.PENDING,
        ...(externalId ? { providerTxId: externalId } : {}),
      },
    });

    return { invoice: updatedInvoice, paymentUrl: url };
  }

  // ----------------------------------------------------------------
  // History & lookup
  // ----------------------------------------------------------------

  async getHistory(userId: string): Promise<Invoice[]> {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { plan: true },
    });
  }

  async getInvoice(userId: string, invoiceId: string): Promise<Invoice> {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, userId },
      include: { plan: true },
    });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} topilmadi`);
    }
    return invoice;
  }

  // ----------------------------------------------------------------
  // Webhook handling
  // ----------------------------------------------------------------

  async handleClickWebhook(payload: unknown, signature?: string): Promise<void> {
    const valid = this.clickProvider.verifyWebhook(payload, signature);

    await this.prisma.paymentWebhookLog.create({
      data: {
        provider: PaymentProvider.CLICK,
        rawPayload: payload as Prisma.InputJsonValue,
        signatureValid: valid,
      },
    });

    if (!valid) {
      this.logger.warn('Click webhook signature invalid — logged but not processed');
      return;
    }

    const result = await this.clickProvider.processWebhook(payload);
    if (result.status === 'paid') {
      await this.processPayment(result.invoiceId, PaymentProvider.CLICK);
    } else if (result.status === 'failed' || result.status === 'cancelled') {
      await this.markInvoiceFailed(result.invoiceId, result.status);
    }
  }

  async handlePaymeWebhook(payload: unknown, authorization?: string): Promise<void> {
    const valid = this.paymeProvider.verifyWebhook(payload, authorization);

    await this.prisma.paymentWebhookLog.create({
      data: {
        provider: PaymentProvider.PAYME,
        rawPayload: payload as Prisma.InputJsonValue,
        signatureValid: valid,
      },
    });

    if (!valid) {
      this.logger.warn('Payme webhook auth invalid — logged but not processed');
      return;
    }

    const result = await this.paymeProvider.processWebhook(payload);
    if (result.status === 'paid') {
      await this.processPayment(result.invoiceId, PaymentProvider.PAYME);
    } else if (result.status === 'failed' || result.status === 'cancelled') {
      await this.markInvoiceFailed(result.invoiceId, result.status);
    }
  }

  // ----------------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------------

  private async processPayment(invoiceId: string, provider: PaymentProvider): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
    });

    if (!invoice) {
      this.logger.warn(`processPayment: invoice ${invoiceId} not found`);
      return;
    }

    if (invoice.status === InvoiceStatus.PAID) {
      this.logger.debug(`Invoice ${invoiceId} already marked PAID — skipping`);
      return;
    }

    const now = new Date();

    // Mark invoice paid
    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: InvoiceStatus.PAID, paidAt: now },
    });

    // Mark all pending payments for this invoice as paid
    await this.prisma.payment.updateMany({
      where: { invoiceId, provider, status: PaymentStatus.PENDING },
      data: { status: PaymentStatus.PAID, paidAt: now },
    });

    // Activate subscription if invoice has a plan
    if (invoice.planId) {
      await this.subscriptionsService.activateSubscription(invoice.userId, invoice.planId);
    }

    await this.auditLogs.createLog({
      userId: invoice.userId,
      action: 'PAYMENT',
      entityType: 'Invoice',
      entityId: invoiceId,
      metadata: { provider, status: 'paid' },
    });

    this.logger.log(`Payment processed for invoice ${invoiceId} (${provider})`);
  }

  private async markInvoiceFailed(
    invoiceId: string,
    status: 'failed' | 'cancelled',
  ): Promise<void> {
    const newStatus =
      status === 'cancelled' ? InvoiceStatus.CANCELLED : InvoiceStatus.EXPIRED;

    await this.prisma.invoice.update({
      where: { id: invoiceId },
      data: { status: newStatus },
    }).catch((err) => {
      this.logger.warn(`Failed to update invoice ${invoiceId}: ${(err as Error).message}`);
    });

    await this.prisma.payment.updateMany({
      where: { invoiceId, status: PaymentStatus.PENDING },
      data: {
        status: status === 'cancelled' ? PaymentStatus.CANCELLED : PaymentStatus.FAILED,
      },
    });
  }

  private getProvider(name: PaymentProvider): PaymentProviderInterface {
    const provider = this.providers.get(name);
    if (!provider) {
      throw new BadRequestException(`To'lov provayderi qo'llab-quvvatlanmaydi: ${name}`);
    }
    return provider;
  }
}
