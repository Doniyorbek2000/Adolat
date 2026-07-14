/**
 * Domen enum'lari — Prisma sxemasidagi (`apps/api/prisma/schema.prisma`) enum'lar
 * bilan bir xil qiymatlarga ega. Backend, admin va mobil ilova o'rtasida
 * yagona kontrakt sifatida ishlatiladi.
 *
 * MUHIM: bu qiymatlar Prisma enum'lari bilan sinxron bo'lishi shart.
 */

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  DELETED = 'DELETED',
}

export enum Language {
  UZ = 'UZ',
  RU = 'RU',
}

export enum OtpType {
  REGISTER = 'REGISTER',
  LOGIN = 'LOGIN',
  PASSWORD_RESET = 'PASSWORD_RESET',
  TWO_FACTOR = 'TWO_FACTOR',
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  REVOKED = 'REVOKED',
  EXPIRED = 'EXPIRED',
}

export enum PlanCode {
  FREE = 'FREE',
  ODDIY = 'ODDIY',
  PRO = 'PRO',
  BUSINESS = 'BUSINESS',
  VIP = 'VIP',
  PAY_AS_YOU_GO = 'PAY_AS_YOU_GO',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
}

export enum PaymentProvider {
  CLICK = 'CLICK',
  PAYME = 'PAYME',
  MANUAL = 'MANUAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PAID = 'PAID',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum PromoType {
  DISCOUNT = 'DISCOUNT',
  FREE_PLAN = 'FREE_PLAN',
  EXTRA_USAGE = 'EXTRA_USAGE',
}

export enum ChatRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

export enum AiProvider {
  OPENAI = 'OPENAI',
  GEMINI = 'GEMINI',
  CLAUDE = 'CLAUDE',
}

export enum AiRequestStatus {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  FALLBACK = 'FALLBACK',
}

export enum FileStatus {
  UPLOADED = 'UPLOADED',
  PROCESSING = 'PROCESSING',
  READY = 'READY',
  FAILED = 'FAILED',
}

export enum DocumentAnalysisStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum GeneratedDocumentStatus {
  DRAFT = 'DRAFT',
  GENERATED = 'GENERATED',
  FAILED = 'FAILED',
}

export enum LegalSourceType {
  LEGAL = 'LEGAL',
  TAX = 'TAX',
  GOVERNMENT_SERVICE = 'GOVERNMENT_SERVICE',
  PRESIDENT = 'PRESIDENT',
  GOVERNMENT = 'GOVERNMENT',
  JUSTICE = 'JUSTICE',
  CENTRAL_BANK = 'CENTRAL_BANK',
  CADASTRE = 'CADASTRE',
  CUSTOMS = 'CUSTOMS',
  COURT = 'COURT',
  MINISTRY = 'MINISTRY',
  OTHER_OFFICIAL = 'OTHER_OFFICIAL',
}

export enum LegalSourceStatus {
  ACTIVE = 'ACTIVE',
  DISABLED = 'DISABLED',
  FAILED = 'FAILED',
}

export enum SyncJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum SupportTicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum SupportPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum NotificationType {
  SYSTEM = 'SYSTEM',
  PAYMENT = 'PAYMENT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  SUPPORT = 'SUPPORT',
  SECURITY = 'SECURITY',
  PROMO = 'PROMO',
}
