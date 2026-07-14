/**
 * Click Merchant API (Shop API) — konstantalar.
 * Rasmiy: https://docs.click.uz/
 */

export enum ClickAction {
  PREPARE = 0,
  COMPLETE = 1,
}

/** Click javob xato kodlari. */
export enum ClickError {
  SUCCESS = 0,
  SIGN_CHECK_FAILED = -1,
  INVALID_AMOUNT = -2,
  ACTION_NOT_FOUND = -3,
  ALREADY_PAID = -4,
  ORDER_NOT_FOUND = -5, // foydalanuvchi/buyurtma topilmadi
  TRANSACTION_NOT_FOUND = -6,
  FAILED_TO_UPDATE = -7,
  BAD_REQUEST = -8,
  TRANSACTION_CANCELLED = -9,
}

export const CLICK_ERROR_NOTE: Record<ClickError, string> = {
  [ClickError.SUCCESS]: 'Success',
  [ClickError.SIGN_CHECK_FAILED]: 'SIGN CHECK FAILED',
  [ClickError.INVALID_AMOUNT]: 'Incorrect parameter amount',
  [ClickError.ACTION_NOT_FOUND]: 'Action not found',
  [ClickError.ALREADY_PAID]: 'Already paid',
  [ClickError.ORDER_NOT_FOUND]: 'Order not found',
  [ClickError.TRANSACTION_NOT_FOUND]: 'Transaction not found',
  [ClickError.FAILED_TO_UPDATE]: 'Failed to update',
  [ClickError.BAD_REQUEST]: 'Bad request from Click',
  [ClickError.TRANSACTION_CANCELLED]: 'Transaction cancelled',
};
