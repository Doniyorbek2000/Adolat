/**
 * Payme Merchant API — konstantalar (JSON-RPC 2.0).
 * Rasmiy spetsifikatsiya: https://developer.help.paycom.uz/
 */

/** Tranzaksiya holatlari (Payme talab qiladigan qiymatlar). */
export enum PaymeState {
  CREATED = 1,
  PAID = 2,
  CANCELLED = -1, // yaratilgandan keyin bekor qilingan
  CANCELLED_AFTER_PAID = -2, // to'langandan keyin bekor (qaytarish)
}

/** Payme xato kodlari. */
export enum PaymeErrorCode {
  // JSON-RPC / tizim
  INVALID_JSON_RPC = -32600,
  METHOD_NOT_FOUND = -32601,
  INSUFFICIENT_PRIVILEGE = -32504, // autentifikatsiya xatosi
  // Biznes
  INVALID_AMOUNT = -31001,
  TRANSACTION_NOT_FOUND = -31003,
  CANNOT_CANCEL = -31007, // yakunlangan tranzaksiyani bekor qilib bo'lmaydi
  CANNOT_PERFORM = -31008,
  // Maxsus diapazon (-31099..-31050): buyurtma/akkaunt xatolari
  ORDER_NOT_FOUND = -31050,
  ORDER_ALREADY_PAID = -31051,
}

/** Bekor qilish sabablari (Payme). */
export enum PaymeCancelReason {
  RECEIVERS_NOT_FOUND = 1,
  PROCESSING_ERROR = 2,
  CANCELLED_BY_TIMEOUT = 4,
  REFUND = 5,
  UNKNOWN = 10,
}

/** Tranzaksiya yaratish uchun ruxsat etilgan maksimal muddat (12 soat, ms). */
export const PAYME_TRANSACTION_TIMEOUT_MS = 12 * 60 * 60 * 1000;
