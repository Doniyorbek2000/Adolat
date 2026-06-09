export interface UsageStat {
  used: number;
  limit: number;
  remaining: number;
}

export interface VoiceStat {
  usedSeconds: number;
  limitSeconds: number;
  remainingSeconds: number;
  remainingMinutes: number;
}

export interface DashboardUsage {
  questions: UsageStat;
  documentAnalyses: UsageStat;
  generatedDocuments: UsageStat;
  voice: VoiceStat;
}

export interface DashboardSubscription {
  planCode: string;
  planName: string;
  status: string;
  currentPeriodEnd: Date | null;
  daysLeft: number;
}

export interface DashboardRecentChat {
  id: string;
  title: string | null;
  lastMessage: string | null;
  updatedAt: Date;
}

export interface DashboardRecentDocument {
  id: string;
  title: string;
  type: 'analysis' | 'generated';
  status: string;
  createdAt: Date;
}

export interface DashboardAlert {
  type: 'SUBSCRIPTION' | 'LIMIT' | 'UPGRADE';
  title: string;
  message: string;
}

export interface DashboardData {
  user: { id: string; firstName: string; lastName: string; language: string };
  subscription: DashboardSubscription;
  usage: DashboardUsage;
  recentChats: DashboardRecentChat[];
  recentDocuments: DashboardRecentDocument[];
  alerts: DashboardAlert[];
}
