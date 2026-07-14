import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';

import { ClickMerchantService } from './click-merchant.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { PaymentsService } from '../payments.service';
import { ClickAction, ClickError } from './click.constants';

const SERVICE_ID = 'SVC';
const SECRET = 'CLICK_SECRET';
const INVOICE_ID = '11111111-1111-1111-1111-111111111111';
const AMOUNT = 5000;

function setup() {
  const prisma = {
    invoice: { findUnique: jest.fn() },
    clickTransaction: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    paymentWebhookLog: { create: jest.fn().mockResolvedValue({}) },
  };
  const config = { get: () => ({ click: { serviceId: SERVICE_ID, secretKey: SECRET } }) };
  const payments = {
    settleClickPaid: jest.fn().mockResolvedValue(undefined),
    settleClickCancelled: jest.fn().mockResolvedValue(undefined),
  };
  const service = new ClickMerchantService(
    prisma as unknown as PrismaService,
    config as unknown as ConfigService,
    payments as unknown as PaymentsService,
  );
  return { service, prisma, payments };
}

function prepareSign(p: Record<string, unknown>): string {
  return createHash('md5')
    .update(`${p.click_trans_id}${SERVICE_ID}${SECRET}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`)
    .digest('hex');
}
function completeSign(p: Record<string, unknown>): string {
  return createHash('md5')
    .update(
      `${p.click_trans_id}${SERVICE_ID}${SECRET}${p.merchant_trans_id}${p.merchant_prepare_id}${p.amount}${p.action}${p.sign_time}`,
    )
    .digest('hex');
}

const basePrepare = {
  click_trans_id: 555,
  merchant_trans_id: INVOICE_ID,
  amount: AMOUNT,
  action: ClickAction.PREPARE,
  sign_time: '2024-01-01 10:00:00',
};

describe('ClickMerchantService', () => {
  it('rejects a bad signature with -1', async () => {
    const { service } = setup();
    const r = await service.handle({ ...basePrepare, sign_string: 'bad' });
    expect(r.error).toBe(ClickError.SIGN_CHECK_FAILED);
  });

  it('rejects an unknown action with -3', async () => {
    const { service } = setup();
    const p = { ...basePrepare, action: 9 };
    const r = await service.handle({ ...p, sign_string: prepareSign(p) });
    expect(r.error).toBe(ClickError.ACTION_NOT_FOUND);
  });

  describe('Prepare', () => {
    it('prepares a valid order and stores a transaction', async () => {
      const { service, prisma } = setup();
      prisma.invoice.findUnique.mockResolvedValue({ id: INVOICE_ID, status: 'PENDING', amountUzs: AMOUNT });
      prisma.clickTransaction.findUnique.mockResolvedValue(null);

      const r = await service.handle({ ...basePrepare, sign_string: prepareSign(basePrepare) });
      expect(r.error).toBe(ClickError.SUCCESS);
      expect(r.merchant_prepare_id).toBeDefined();
      expect(prisma.clickTransaction.create).toHaveBeenCalledTimes(1);
    });

    it('rejects an unknown order with -5', async () => {
      const { service, prisma } = setup();
      prisma.invoice.findUnique.mockResolvedValue(null);
      const r = await service.handle({ ...basePrepare, sign_string: prepareSign(basePrepare) });
      expect(r.error).toBe(ClickError.ORDER_NOT_FOUND);
    });

    it('rejects an already-paid order with -4', async () => {
      const { service, prisma } = setup();
      prisma.invoice.findUnique.mockResolvedValue({ id: INVOICE_ID, status: 'PAID', amountUzs: AMOUNT });
      const r = await service.handle({ ...basePrepare, sign_string: prepareSign(basePrepare) });
      expect(r.error).toBe(ClickError.ALREADY_PAID);
    });

    it('rejects a wrong amount with -2', async () => {
      const { service, prisma } = setup();
      prisma.invoice.findUnique.mockResolvedValue({ id: INVOICE_ID, status: 'PENDING', amountUzs: AMOUNT });
      const p = { ...basePrepare, amount: 999 };
      const r = await service.handle({ ...p, sign_string: prepareSign(p) });
      expect(r.error).toBe(ClickError.INVALID_AMOUNT);
    });
  });

  describe('Complete', () => {
    const baseComplete = {
      click_trans_id: 555,
      merchant_trans_id: INVOICE_ID,
      merchant_prepare_id: '1700000000000',
      amount: AMOUNT,
      action: ClickAction.COMPLETE,
      sign_time: '2024-01-01 10:05:00',
      error: 0,
    };
    const tx = {
      id: 'tx-1',
      invoiceId: INVOICE_ID,
      amount: AMOUNT,
      merchantPrepareId: '1700000000000',
      status: 'PREPARING',
    };

    it('completes a valid transaction, marks paid and settles', async () => {
      const { service, prisma, payments } = setup();
      prisma.clickTransaction.findUnique.mockResolvedValue(tx);
      const r = await service.handle({ ...baseComplete, sign_string: completeSign(baseComplete) });
      expect(r.error).toBe(ClickError.SUCCESS);
      expect(payments.settleClickPaid).toHaveBeenCalledWith(INVOICE_ID);
    });

    it('returns -6 for an unknown transaction', async () => {
      const { service, prisma } = setup();
      prisma.clickTransaction.findUnique.mockResolvedValue(null);
      const r = await service.handle({ ...baseComplete, sign_string: completeSign(baseComplete) });
      expect(r.error).toBe(ClickError.TRANSACTION_NOT_FOUND);
    });

    it('cancels when Click sends error<0 (-9) and settles cancellation', async () => {
      const { service, prisma, payments } = setup();
      prisma.clickTransaction.findUnique.mockResolvedValue(tx);
      const p = { ...baseComplete, error: -5 };
      const r = await service.handle({ ...p, sign_string: completeSign(p) });
      expect(r.error).toBe(ClickError.TRANSACTION_CANCELLED);
      expect(payments.settleClickCancelled).toHaveBeenCalledWith(INVOICE_ID);
    });

    it('is idempotent when already paid (-4)', async () => {
      const { service, prisma, payments } = setup();
      prisma.clickTransaction.findUnique.mockResolvedValue({ ...tx, status: 'PAID' });
      const r = await service.handle({ ...baseComplete, sign_string: completeSign(baseComplete) });
      expect(r.error).toBe(ClickError.ALREADY_PAID);
      expect(payments.settleClickPaid).not.toHaveBeenCalled();
    });
  });
});
