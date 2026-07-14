import { ConfigService } from '@nestjs/config';
import { Invoice } from '@prisma/client';

import { PaymeProvider } from './payme.provider';

const PAYME = { merchantId: 'MERCH', secretKey: 'PAYME_KEY' };

function makeProvider(): PaymeProvider {
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'payment') return { click: { merchantId: '', serviceId: '', secretKey: '' }, payme: PAYME };
      if (key === 'app') return { frontendUrl: 'https://app.adolat.uz' };
      return undefined;
    }),
  } as unknown as ConfigService;
  return new PaymeProvider(config);
}

function basicAuth(user: string, key: string): string {
  return 'Basic ' + Buffer.from(`${user}:${key}`).toString('base64');
}

describe('PaymeProvider', () => {
  let provider: PaymeProvider;

  beforeEach(() => {
    provider = makeProvider();
  });

  describe('verifyWebhook', () => {
    it('accepts a valid Basic auth header with the merchant key', () => {
      expect(provider.verifyWebhook({}, basicAuth('Paycom', 'PAYME_KEY'))).toBe(true);
    });

    it('rejects a wrong merchant key', () => {
      expect(provider.verifyWebhook({}, basicAuth('Paycom', 'WRONG'))).toBe(false);
    });

    it('rejects a missing / non-Basic header', () => {
      expect(provider.verifyWebhook({})).toBe(false);
      expect(provider.verifyWebhook({}, 'Bearer x')).toBe(false);
    });
  });

  describe('processWebhook', () => {
    const account = { account: { invoice_id: 'inv-9' } };

    it('maps PerformTransaction to paid', async () => {
      const r = await provider.processWebhook({ method: 'PerformTransaction', params: account });
      expect(r).toEqual({ invoiceId: 'inv-9', status: 'paid' });
    });

    it('maps CancelTransaction to cancelled', async () => {
      const r = await provider.processWebhook({ method: 'CancelTransaction', params: account });
      expect(r.status).toBe('cancelled');
    });

    it('maps non-terminal methods to failed', async () => {
      const r = await provider.processWebhook({ method: 'CheckPerformTransaction', params: account });
      expect(r.status).toBe('failed');
    });
  });

  describe('createPaymentUrl', () => {
    it('encodes amount in tiyin (UZS * 100) and the invoice id', async () => {
      const invoice = { id: 'inv-9', amountUzs: 5000 } as unknown as Invoice;
      const { url } = await provider.createPaymentUrl(invoice);
      expect(url.startsWith('https://checkout.paycom.uz/')).toBe(true);
      const decoded = Buffer.from(url.replace('https://checkout.paycom.uz/', ''), 'base64').toString('utf-8');
      expect(decoded).toContain('m=MERCH');
      expect(decoded).toContain('ac.invoice_id=inv-9');
      expect(decoded).toContain('a=500000'); // 5000 UZS = 500000 tiyin
    });
  });
});
