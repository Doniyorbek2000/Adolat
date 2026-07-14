import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { Invoice } from '@prisma/client';

import { ClickProvider } from './click.provider';

const CLICK = { merchantId: 'M1', serviceId: 'S1', secretKey: 'SECRET' };

function makeProvider(): ClickProvider {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'payment') return { click: CLICK, payme: { merchantId: '', secretKey: '' } };
      if (key === 'app') return { frontendUrl: 'https://app.adolat.uz' };
      return undefined;
    }),
  } as unknown as ConfigService;
  return new ClickProvider(config);
}

/** Click imzosini xuddi provider kabi hisoblaydi. */
function sign(p: Record<string, string | number>): string {
  return createHash('md5')
    .update(
      `${p.click_trans_id}${CLICK.serviceId}${CLICK.secretKey}${p.merchant_trans_id}${p.amount}${p.action}${p.sign_time}`,
    )
    .digest('hex');
}

describe('ClickProvider', () => {
  let provider: ClickProvider;

  beforeEach(() => {
    provider = makeProvider();
  });

  describe('verifyWebhook', () => {
    const base = {
      click_trans_id: 111,
      merchant_trans_id: 'inv-1',
      amount: 5000,
      action: 1,
      sign_time: '2024-01-01 10:00:00',
    };

    it('accepts a payload with a valid signature', () => {
      const payload = { ...base, sign_string: sign(base) };
      expect(provider.verifyWebhook(payload)).toBe(true);
    });

    it('rejects a payload with a tampered signature', () => {
      const payload = { ...base, sign_string: 'deadbeef' };
      expect(provider.verifyWebhook(payload)).toBe(false);
    });

    it('rejects a payload with missing required fields', () => {
      expect(provider.verifyWebhook({ amount: 5000 })).toBe(false);
    });

    it('rejects a tampered amount', () => {
      const payload = { ...base, sign_string: sign(base), amount: 9999 };
      expect(provider.verifyWebhook(payload)).toBe(false);
    });
  });

  describe('processWebhook', () => {
    it('maps action=1, error=0 to paid', async () => {
      const r = await provider.processWebhook({ merchant_trans_id: 'inv-1', action: 1, error: 0 });
      expect(r).toEqual({ invoiceId: 'inv-1', status: 'paid' });
    });

    it('maps negative error to failed', async () => {
      const r = await provider.processWebhook({ merchant_trans_id: 'inv-1', action: 1, error: -5 });
      expect(r.status).toBe('failed');
    });

    it('maps non-terminal actions to cancelled', async () => {
      const r = await provider.processWebhook({ merchant_trans_id: 'inv-1', action: 0, error: 0 });
      expect(r.status).toBe('cancelled');
    });
  });

  describe('createPaymentUrl', () => {
    it('builds a URL with service, merchant, amount and invoice id', async () => {
      const invoice = { id: 'inv-1', amountUzs: 5000 } as unknown as Invoice;
      const { url } = await provider.createPaymentUrl(invoice);
      expect(url).toContain('service_id=S1');
      expect(url).toContain('merchant_id=M1');
      expect(url).toContain('amount=5000');
      expect(url).toContain('transaction_param=inv-1');
    });
  });
});
