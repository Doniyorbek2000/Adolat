import { registerAs } from '@nestjs/config';

export interface PaymentSettings {
  click: {
    merchantId: string;
    serviceId: string;
    secretKey: string;
  };
  payme: {
    merchantId: string;
    secretKey: string;
  };
}

/** To'lov provayderlar (Click/Payme) konfiguratsiyasi — Subscription/Payment bosqichida ishlatiladi. */
export default registerAs(
  'payment',
  (): PaymentSettings => ({
    click: {
      merchantId: process.env.CLICK_MERCHANT_ID ?? '',
      serviceId: process.env.CLICK_SERVICE_ID ?? '',
      secretKey: process.env.CLICK_SECRET_KEY ?? '',
    },
    payme: {
      merchantId: process.env.PAYME_MERCHANT_ID ?? '',
      secretKey: process.env.PAYME_SECRET_KEY ?? '',
    },
  }),
);
