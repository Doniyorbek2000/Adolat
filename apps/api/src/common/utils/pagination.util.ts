import { PaginationMeta, PaginationQuery } from '../types/pagination.types';

export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

export interface NormalizedPagination {
  page: number;
  limit: number;
  skip: number;
  take: number;
}

/** Foydalanuvchidan kelgan page/limit qiymatlarini xavfsiz chegaralarga keltiradi (Prisma skip/take uchun). */
export function normalizePagination(query: PaginationQuery): NormalizedPagination {
  const page = query.page && query.page > 0 ? Math.floor(query.page) : DEFAULT_PAGE;
  const limit = query.limit && query.limit > 0 ? Math.min(Math.floor(query.limit), MAX_LIMIT) : DEFAULT_LIMIT;

  return { page, limit, skip: (page - 1) * limit, take: limit };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
