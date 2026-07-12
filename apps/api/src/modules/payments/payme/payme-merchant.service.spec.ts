import { ConfigService } from '@nestjs/config';

import { PaymeMerchantService } from './payme-merchant.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentsService } from '../payments.service';
import { PaymeErrorCode, PaymeState } from './payme.constants';
import { PaymeRpcErrorResponse, PaymeRpcSuccess } from './payme.errors';

const KEY = 'PAYME_KEY';
const INVOICE_ID = '11111111-1111-1111-1111-111111111111';
const AMOUNT_TIYIN = 500000; // 5000 UZS

function auth(key = KEY): string {
  return 'Basic ' + Buffer.from(`Paycom:${key}`).toString('base64');
}

function setup() {
  const prisma = {
    invoice: { findUnique: jest.fn() },
    paymeTransaction: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    paymentWebhookLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const config = {
    get: jest.fn().mockReturnValue({ payme: { secretKey: KEY }, click: {} }),
  };
  const payments = {
    settlePaymePaid: jest.fn().mockResolvedValue(undefined),
    settlePaymeCancelled: jest.fn().mockResolvedValue(undefined),
  };
  const service = new PaymeMerchantService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    payments as unknown as PaymentsService,
  );
  return { service, prisma, payments };
}

const payableInvoice = { id: INVOICE_ID, status: 'PENDING', amountUzs: 5000 };

function req(method: string, params: Record<string, unknown> = {}, id = 1) {
  return { method, params, id };
}

const ok = (r: unknown) => r as PaymeRpcSuccess;
const errResp = (r: unknown) => r as PaymeRpcErrorResponse;

describe('PaymeMerchantService', () => {
  describe('auth & routing', () => {
    it('rejects a wrong merchant key with -32504', async () => {
      const { service } = setup();
      const res = errResp(await service.handle(req('CheckPerformTransaction'), auth('WRONG')));
      expect(res.error.code).toBe(PaymeErrorCode.INSUFFICIENT_PRIVILEGE);
    });

    it('rejects a missing auth header', async () => {
      const { service } = setup();
      const res = errResp(await service.handle(req('CheckPerformTransaction')));
      expect(res.error.code).toBe(PaymeErrorCode.INSUFFICIENT_PRIVILEGE);
    });

    it('returns -32601 for an unknown method', async () => {
      const { service } = setup();
      const res = errResp(await service.handle(req('Nonsense'), auth()));
      expect(res.error.code).toBe(PaymeErrorCode.METHOD_NOT_FOUND);
    });
  });

  describe('CheckPerformTransaction', () => {
    it('allows a valid, payable order with the correct amount', async () => {
      const { service, prisma } = setup();
      prisma.invoice.findUnique.mockResolvedValue(payableInvoice);
      const res = ok(
        await service.handle(
          req('CheckPerformTransaction', { account: { invoice_id: INVOICE_ID }, amount: AMOUNT_TIYIN }),
          auth(),
        ),
      );
      expect(res.result).toEqual({ allow: true });
    });

    it('rejects an unknown order with -31050', async () => {
      const { service, prisma } = setup();
      prisma.invoice.findUnique.mockResolvedValue(null);
      const res = errResp(
        await service.handle(
          req('CheckPerformTransaction', { account: { invoice_id: 'x' }, amount: AMOUNT_TIYIN }),
          auth(),
        ),
      );
      expect(res.error.code).toBe(PaymeErrorCode.ORDER_NOT_FOUND);
    });

    it('rejects a wrong amount with -31001', async () => {
      const { service, prisma } = setup();
      prisma.invoice.findUnique.mockResolvedValue(payableInvoice);
      const res = errResp(
        await service.handle(
          req('CheckPerformTransaction', { account: { invoice_id: INVOICE_ID }, amount: 999 }),
          auth(),
        ),
      );
      expect(res.error.code).toBe(PaymeErrorCode.INVALID_AMOUNT);
    });

    it('rejects an already-paid order with -31051', async () => {
      const { service, prisma } = setup();
      prisma.invoice.findUnique.mockResolvedValue({ ...payableInvoice, status: 'PAID' });
      const res = errResp(
        await service.handle(
          req('CheckPerformTransaction', { account: { invoice_id: INVOICE_ID }, amount: AMOUNT_TIYIN }),
          auth(),
        ),
      );
      expect(res.error.code).toBe(PaymeErrorCode.ORDER_ALREADY_PAID);
    });
  });

  describe('CreateTransaction', () => {
    it('creates a new transaction in state 1', async () => {
      const { service, prisma } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue(null);
      prisma.invoice.findUnique.mockResolvedValue(payableInvoice);
      prisma.paymeTransaction.findFirst.mockResolvedValue(null);
      prisma.paymeTransaction.create.mockResolvedValue({
        id: 'local-1',
        createTime: BigInt(1000),
        state: PaymeState.CREATED,
      });

      const res = ok(
        await service.handle(
          req('CreateTransaction', {
            id: 'ptx-1',
            time: 1000,
            amount: AMOUNT_TIYIN,
            account: { invoice_id: INVOICE_ID },
          }),
          auth(),
        ),
      );
      expect(res.result).toMatchObject({ transaction: 'local-1', state: PaymeState.CREATED });
      expect(prisma.paymeTransaction.create).toHaveBeenCalledTimes(1);
    });

    it('is idempotent for an existing non-expired transaction', async () => {
      const { service, prisma } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'local-1',
        createTime: BigInt(Date.now()),
        state: PaymeState.CREATED,
      });
      const res = ok(
        await service.handle(req('CreateTransaction', { id: 'ptx-1' }), auth()),
      );
      expect(res.result).toMatchObject({ transaction: 'local-1', state: PaymeState.CREATED });
      expect(prisma.paymeTransaction.create).not.toHaveBeenCalled();
    });

    it('rejects a wrong amount on create with -31001', async () => {
      const { service, prisma } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue(null);
      prisma.invoice.findUnique.mockResolvedValue(payableInvoice);
      const res = errResp(
        await service.handle(
          req('CreateTransaction', { id: 'ptx-1', amount: 1, account: { invoice_id: INVOICE_ID } }),
          auth(),
        ),
      );
      expect(res.error.code).toBe(PaymeErrorCode.INVALID_AMOUNT);
    });
  });

  describe('PerformTransaction', () => {
    it('performs a created transaction, marks it paid and settles the invoice', async () => {
      const { service, prisma, payments } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'local-1',
        invoiceId: INVOICE_ID,
        createTime: BigInt(Date.now()),
        state: PaymeState.CREATED,
      });
      prisma.paymeTransaction.update.mockResolvedValue({
        id: 'local-1',
        performTime: BigInt(2000),
        state: PaymeState.PAID,
      });
      const res = ok(await service.handle(req('PerformTransaction', { id: 'ptx-1' }), auth()));
      expect(res.result).toMatchObject({ transaction: 'local-1', state: PaymeState.PAID });
      expect(payments.settlePaymePaid).toHaveBeenCalledWith(INVOICE_ID);
    });

    it('is idempotent when already paid', async () => {
      const { service, prisma, payments } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'local-1',
        invoiceId: INVOICE_ID,
        performTime: BigInt(2000),
        state: PaymeState.PAID,
      });
      const res = ok(await service.handle(req('PerformTransaction', { id: 'ptx-1' }), auth()));
      expect(res.result).toMatchObject({ state: PaymeState.PAID });
      expect(payments.settlePaymePaid).not.toHaveBeenCalled();
    });

    it('returns -31003 for an unknown transaction', async () => {
      const { service, prisma } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue(null);
      const res = errResp(await service.handle(req('PerformTransaction', { id: 'x' }), auth()));
      expect(res.error.code).toBe(PaymeErrorCode.TRANSACTION_NOT_FOUND);
    });
  });

  describe('CancelTransaction', () => {
    it('cancels a created transaction (state -1) and settles cancellation', async () => {
      const { service, prisma, payments } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'local-1',
        invoiceId: INVOICE_ID,
        state: PaymeState.CREATED,
      });
      prisma.paymeTransaction.update.mockResolvedValue({
        id: 'local-1',
        cancelTime: BigInt(3000),
        state: PaymeState.CANCELLED,
      });
      const res = ok(await service.handle(req('CancelTransaction', { id: 'ptx-1', reason: 3 }), auth()));
      expect(res.result).toMatchObject({ state: PaymeState.CANCELLED });
      expect(payments.settlePaymeCancelled).toHaveBeenCalledWith(INVOICE_ID);
    });

    it('cancels a paid transaction with state -2', async () => {
      const { service, prisma } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'local-1',
        invoiceId: INVOICE_ID,
        state: PaymeState.PAID,
      });
      prisma.paymeTransaction.update.mockResolvedValue({
        id: 'local-1',
        cancelTime: BigInt(3000),
        state: PaymeState.CANCELLED_AFTER_PAID,
      });
      const res = ok(await service.handle(req('CancelTransaction', { id: 'ptx-1', reason: 5 }), auth()));
      expect(res.result).toMatchObject({ state: PaymeState.CANCELLED_AFTER_PAID });
    });
  });

  describe('CheckTransaction & GetStatement', () => {
    it('returns transaction state on CheckTransaction', async () => {
      const { service, prisma } = setup();
      prisma.paymeTransaction.findUnique.mockResolvedValue({
        id: 'local-1',
        createTime: BigInt(1000),
        performTime: BigInt(2000),
        cancelTime: BigInt(0),
        state: PaymeState.PAID,
        reason: null,
      });
      const res = ok(await service.handle(req('CheckTransaction', { id: 'ptx-1' }), auth()));
      expect(res.result).toMatchObject({
        create_time: 1000,
        perform_time: 2000,
        cancel_time: 0,
        state: PaymeState.PAID,
      });
    });

    it('returns a transactions list on GetStatement', async () => {
      const { service, prisma } = setup();
      prisma.paymeTransaction.findMany.mockResolvedValue([
        {
          paymeId: 'ptx-1',
          invoiceId: INVOICE_ID,
          amount: BigInt(AMOUNT_TIYIN),
          createTime: BigInt(1000),
          performTime: BigInt(2000),
          cancelTime: BigInt(0),
          state: PaymeState.PAID,
          id: 'local-1',
          reason: null,
        },
      ]);
      const res = ok(
        await service.handle(req('GetStatement', { from: 0, to: Date.now() }), auth()),
      );
      expect((res.result as { transactions: unknown[] }).transactions).toHaveLength(1);
    });
  });
});
