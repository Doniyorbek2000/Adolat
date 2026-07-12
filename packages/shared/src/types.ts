/**
 * Umumiy API kontrakt tiplari — backend qaytaradigan va admin/mobil
 * iste'mol qiladigan javob formatlari.
 */

/** Barcha muvaffaqiyatli javoblar uchun yagona format. */
export interface SuccessResponseBody<T> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

/** Xatolik javoblari uchun yagona format (HttpExceptionFilter chiqaradi). */
export interface ErrorResponseBody {
  success: false;
  statusCode: number;
  message: string;
  error?: string;
  timestamp: string;
  path?: string;
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  items: T[];
  meta: PaginationMeta;
}
