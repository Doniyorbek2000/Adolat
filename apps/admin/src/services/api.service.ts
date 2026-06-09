import api from '../lib/api';
import {
  DashboardStats,
  AiStats,
  UserRecord,
  SubscriptionPlan,
  Invoice,
  LegalSource,
  SupportTicket,
  AuditLog,
  PromoCode,
  SystemSetting,
  AiConfig,
  PaginatedResponse,
  AiRequestDataPoint,
} from '../types';

// ─── Dashboard / Analytics ────────────────────────────────────────────────────

export async function fetchDashboardOverview(): Promise<{
  stats: DashboardStats;
  requestsOverTime: AiRequestDataPoint[];
}> {
  const res = await api.get('/admin/analytics/overview');
  return res.data;
}

export async function fetchAiAnalytics(): Promise<AiStats> {
  const res = await api.get('/admin/analytics/ai');
  return res.data;
}

export async function fetchAnalytics(period: string): Promise<{
  usersGrowth: { date: string; count: number }[];
  revenueTrend: { date: string; amount: number }[];
  aiUsage: { date: string; requests: number }[];
  stats: DashboardStats;
}> {
  const res = await api.get('/admin/analytics/overview', {
    params: { period },
  });
  return res.data;
}

// ─── Users ────────────────────────────────────────────────────────────────────

export async function fetchUsers(params: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<PaginatedResponse<UserRecord>> {
  const res = await api.get('/admin/users', { params });
  return res.data;
}

export async function blockUser(id: string): Promise<void> {
  await api.patch(`/admin/users/${id}/block`);
}

export async function unblockUser(id: string): Promise<void> {
  await api.patch(`/admin/users/${id}/unblock`);
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function fetchPlans(): Promise<SubscriptionPlan[]> {
  const res = await api.get('/plans');
  return res.data;
}

export async function updatePlan(
  id: string,
  data: Partial<SubscriptionPlan>
): Promise<SubscriptionPlan> {
  const res = await api.patch(`/plans/${id}`, data);
  return res.data;
}

// ─── Promo Codes ──────────────────────────────────────────────────────────────

export async function fetchPromoCodes(): Promise<PromoCode[]> {
  const res = await api.get('/admin/promo-codes');
  return res.data;
}

export async function createPromoCode(
  data: Omit<PromoCode, 'id' | 'redemptionsCount'>
): Promise<PromoCode> {
  const res = await api.post('/admin/promo-codes', data);
  return res.data;
}

export async function togglePromoCode(
  id: string,
  isActive: boolean
): Promise<PromoCode> {
  const res = await api.patch(`/admin/promo-codes/${id}`, { isActive });
  return res.data;
}

// ─── Payments ─────────────────────────────────────────────────────────────────

export async function fetchPayments(params?: {
  page?: number;
  limit?: number;
}): Promise<PaginatedResponse<Invoice>> {
  const res = await api.get('/payments/history', { params });
  return res.data;
}

// ─── AI Settings ──────────────────────────────────────────────────────────────

export async function fetchAdminSettings(): Promise<{
  aiConfig: AiConfig;
  settings: SystemSetting[];
}> {
  const res = await api.get('/admin/settings');
  return res.data;
}

export async function updateAdminSettings(data: {
  aiConfig?: Partial<AiConfig>;
  settings?: { key: string; value: string }[];
}): Promise<void> {
  await api.patch('/admin/settings', data);
}

// ─── Legal Sources ────────────────────────────────────────────────────────────

export async function fetchLegalSources(): Promise<LegalSource[]> {
  const res = await api.get('/legal-sources');
  return res.data;
}

export async function syncLegalSource(id: string): Promise<void> {
  await api.post(`/legal-sources/${id}/sync`);
}

export async function toggleLegalSource(
  id: string,
  status: 'active' | 'inactive'
): Promise<LegalSource> {
  const res = await api.patch(`/legal-sources/${id}`, { status });
  return res.data;
}

export async function createLegalSource(
  data: Omit<LegalSource, 'id' | 'lastSyncedAt' | 'chunkCount'>
): Promise<LegalSource> {
  const res = await api.post('/legal-sources', data);
  return res.data;
}

// ─── Support ──────────────────────────────────────────────────────────────────

export async function fetchSupportTickets(params?: {
  page?: number;
  limit?: number;
  status?: string;
}): Promise<PaginatedResponse<SupportTicket>> {
  const res = await api.get('/admin/support/tickets', { params });
  return res.data;
}

export async function fetchTicketDetail(id: string): Promise<SupportTicket> {
  const res = await api.get(`/admin/support/tickets/${id}`);
  return res.data;
}

export async function updateTicketStatus(
  id: string,
  status: string
): Promise<SupportTicket> {
  const res = await api.patch(`/admin/support/tickets/${id}`, { status });
  return res.data;
}

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export async function fetchAuditLogs(params?: {
  page?: number;
  limit?: number;
  action?: string;
  from?: string;
  to?: string;
}): Promise<PaginatedResponse<AuditLog>> {
  const res = await api.get('/admin/audit-logs', { params });
  return res.data;
}

// ─── System Settings ──────────────────────────────────────────────────────────

export async function fetchSystemSettings(): Promise<SystemSetting[]> {
  const res = await api.get('/admin/system-settings');
  return res.data;
}

export async function updateSystemSetting(
  key: string,
  value: string
): Promise<SystemSetting> {
  const res = await api.patch(`/admin/system-settings/${key}`, { value });
  return res.data;
}
