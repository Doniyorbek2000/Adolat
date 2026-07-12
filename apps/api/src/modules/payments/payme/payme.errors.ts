import { PaymeErrorCode } from './payme.constants';

/** Ko'p tilli xato xabari (Payme shu formatni kutadi). */
export interface PaymeLocalizedMessage {
  uz: string;
  ru: string;
  en: string;
}

/** JSON-RPC so'rov (Payme'dan keladi). */
export interface PaymeRpcRequest {
  method?: string;
  params?: {
    id?: string;
    time?: number;
    amount?: number;
    account?: Record<string, string | undefined>;
    reason?: number;
    from?: number;
    to?: number;
  };
  id?: number | string | null;
}

/** JSON-RPC muvaffaqiyatli javob. */
export interface PaymeRpcSuccess<T = unknown> {
  jsonrpc: '2.0';
  id: number | string | null;
  result: T;
}

/** JSON-RPC xato javob. */
export interface PaymeRpcErrorResponse {
  jsonrpc: '2.0';
  id: number | string | null;
  error: { code: number; message: PaymeLocalizedMessage | string; data?: string };
}

export type PaymeRpcResponse = PaymeRpcSuccess | PaymeRpcErrorResponse;

/**
 * Payme biznes-xatosi. Handler ichida throw qilinadi, dispatcher uni
 * JSON-RPC error javobiga aylantiradi (HTTP 200 bilan).
 */
export class PaymeError extends Error {
  constructor(
    readonly code: PaymeErrorCode,
    readonly localizedMessage: PaymeLocalizedMessage,
    readonly data?: string,
  ) {
    super(localizedMessage.en);
  }
}

// ─── Tayyor xatolar ─────────────────────────────────────────────────────────

export const PaymeErrors = {
  invalidAmount: () =>
    new PaymeError(
      PaymeErrorCode.INVALID_AMOUNT,
      { uz: 'Noto\'g\'ri to\'lov summasi', ru: 'Неверная сумма', en: 'Invalid amount' },
      'amount',
    ),
  orderNotFound: (accountField = 'invoice_id') =>
    new PaymeError(
      PaymeErrorCode.ORDER_NOT_FOUND,
      { uz: 'Buyurtma topilmadi', ru: 'Заказ не найден', en: 'Order not found' },
      accountField,
    ),
  orderAlreadyPaid: () =>
    new PaymeError(PaymeErrorCode.ORDER_ALREADY_PAID, {
      uz: 'Buyurtma allaqachon to\'langan',
      ru: 'Заказ уже оплачен',
      en: 'Order already paid',
    }),
  transactionNotFound: () =>
    new PaymeError(PaymeErrorCode.TRANSACTION_NOT_FOUND, {
      uz: 'Tranzaksiya topilmadi',
      ru: 'Транзакция не найдена',
      en: 'Transaction not found',
    }),
  cannotPerform: () =>
    new PaymeError(PaymeErrorCode.CANNOT_PERFORM, {
      uz: 'Operatsiyani bajarib bo\'lmaydi',
      ru: 'Невозможно выполнить операцию',
      en: 'Unable to perform operation',
    }),
  cannotCancel: () =>
    new PaymeError(PaymeErrorCode.CANNOT_CANCEL, {
      uz: 'Tranzaksiyani bekor qilib bo\'lmaydi',
      ru: 'Невозможно отменить транзакцию',
      en: 'Unable to cancel transaction',
    }),
  insufficientPrivilege: () =>
    new PaymeError(PaymeErrorCode.INSUFFICIENT_PRIVILEGE, {
      uz: 'Ruxsat yetarli emas',
      ru: 'Недостаточно привилегий',
      en: 'Insufficient privilege',
    }),
  methodNotFound: () =>
    new PaymeError(PaymeErrorCode.METHOD_NOT_FOUND, {
      uz: 'Metod topilmadi',
      ru: 'Метод не найден',
      en: 'Method not found',
    }),
};

// ─── Javob quruvchilari ─────────────────────────────────────────────────────

export function rpcSuccess<T>(id: PaymeRpcRequest['id'], result: T): PaymeRpcSuccess<T> {
  return { jsonrpc: '2.0', id: id ?? null, result };
}

export function rpcError(id: PaymeRpcRequest['id'], err: PaymeError): PaymeRpcErrorResponse {
  return {
    jsonrpc: '2.0',
    id: id ?? null,
    error: { code: err.code, message: err.localizedMessage, data: err.data },
  };
}
