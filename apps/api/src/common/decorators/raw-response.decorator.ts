import { SetMetadata } from '@nestjs/common';

/**
 * Handler javobini standart `{ success, data, message, timestamp }` konvertiga
 * O'RAMASLIKNI belgilaydi. Tashqi protokollar (masalan Payme JSON-RPC) xom
 * javob kutgan endpointlar uchun ishlatiladi.
 */
export const RAW_RESPONSE_KEY = 'rawResponse';
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
