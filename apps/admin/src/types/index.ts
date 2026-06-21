export interface AdminUser {
  id: string;
  email: string;
  roles: string[];
}

export interface DashboardStats {
  totalUsers: number;
  activeSubscriptions: number;
  todayRequests: number;
  totalRevenue: number;
  recentErrors: number;
  failedJobs?: number;
}

export interface AiRequestDataPoint {
  date: string;
  requests: number;
}

export interface AiStats {
  requestsByProvider: { provider: string; count: number }[];
  avgLatency: number;
  tokenUsage: { date: string; tokens: number }[];
  failureRate: number;
  recentRequests?: AiRequest[];
  latencyHistogram?: { bucket: string; count: number }[];
}

export interface AiRequest {
  id: string;
  provider: string;
  model: string;
  tokens: number;
  latency: number;
  status: string;
  createdAt: string;
}

export interface UserRecord {
  id: string;
  email: string;
  phone?: string;
  status: 'active' | 'blocked' | 'pending';
  createdAt: string;
  subscription?: {
    plan: string;
    status: string;
    expiresAt: string;
  };
}

export interface SubscriptionPlan {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  questionLimit: number;
  documentAnalysisLimit: number;
  generatedDocumentLimit: number;
  voiceMinutesLimit: number;
  isActive: boolean;
}

export interface Invoice {
  id: string;
  userId?: string;
  userEmail?: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  provider: string;
  createdAt: string;
}

export interface LegalSource {
  id: string;
  name: string;
  type: string;
  baseUrl: string;
  status: 'active' | 'inactive' | 'syncing' | 'error';
  lastSyncedAt: string | null;
  chunkCount?: number;
}

export interface SupportTicket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  user: {
    id?: string;
    email: string;
  };
  messages?: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
  author?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  adminId?: string;
  userId?: string;
  createdAt: string;
  ipAddress?: string;
  user: {
    email: string;
  };
}

export interface PromoCode {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  discountPercent: number;
  maxRedemptions: number;
  redemptionsCount: number;
  validUntil: string;
  isActive: boolean;
}

export interface SystemSetting {
  id: string;
  key: string;
  value: string;
  description?: string;
  updatedAt?: string;
}

export interface AiConfig {
  primaryProvider: string;
  fallbackProvider: string;
  primaryModel: string;
  fallbackModel: string;
  timeout: number;
  maxRetries: number;
  temperature?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  body: string;
  createdAt: string;
}

export type LegalDocIndexingStatus = 'PENDING' | 'INDEXING' | 'INDEXED' | 'FAILED';

export interface LegalDocument {
  id: string;
  title: string;
  category: string | null;
  sourceUrl: string | null;
  sourceType: string;
  indexingStatus: LegalDocIndexingStatus;
  chunksCount: number;
  errorMessage: string | null;
  createdBy: string | null;
  indexedAt: string | null;
  createdAt: string;
}

export interface CreateLegalDocumentPayload {
  title: string;
  category?: string;
  sourceUrl?: string;
  content: string;
  sourceType?: string;
}
