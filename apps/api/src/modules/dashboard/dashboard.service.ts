import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import type {
  DashboardAlert,
  DashboardData,
  DashboardRecentDocument,
  DashboardSubscription,
  DashboardUsage,
} from './dto/dashboard-response.dto';

const FREE_PLAN_FALLBACK = {
  code: 'FREE',
  name: 'Bepul',
  questionLimit: 2,
  documentAnalysisLimit: 1,
  generatedDocumentLimit: 1,
  voiceMinutesLimit: 2,
};

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyDashboard(userId: string): Promise<DashboardData> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }

    const subscription = await this.prisma.subscription.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });

    const plan = subscription?.plan ?? FREE_PLAN_FALLBACK;
    const now = new Date();

    const usage = await this.prisma.usageCounter.findFirst({
      where: { userId, periodStart: { lte: now }, periodEnd: { gte: now } },
      orderBy: { createdAt: 'desc' },
    });

    const voiceLimitSeconds = plan.voiceMinutesLimit * 60;
    const voiceUsedSeconds = usage?.voiceSecondsUsed ?? 0;

    const dashboardUsage: DashboardUsage = {
      questions: {
        used: usage?.questionsUsed ?? 0,
        limit: plan.questionLimit,
        remaining: Math.max(plan.questionLimit - (usage?.questionsUsed ?? 0), 0),
      },
      documentAnalyses: {
        used: usage?.analysesUsed ?? 0,
        limit: plan.documentAnalysisLimit,
        remaining: Math.max(plan.documentAnalysisLimit - (usage?.analysesUsed ?? 0), 0),
      },
      generatedDocuments: {
        used: usage?.documentsUsed ?? 0,
        limit: plan.generatedDocumentLimit,
        remaining: Math.max(plan.generatedDocumentLimit - (usage?.documentsUsed ?? 0), 0),
      },
      voice: {
        usedSeconds: voiceUsedSeconds,
        limitSeconds: voiceLimitSeconds,
        remainingSeconds: Math.max(voiceLimitSeconds - voiceUsedSeconds, 0),
        remainingMinutes: Math.max(Math.floor((voiceLimitSeconds - voiceUsedSeconds) / 60), 0),
      },
    };

    const daysLeft = subscription?.currentPeriodEnd
      ? Math.max(Math.ceil((subscription.currentPeriodEnd.getTime() - now.getTime()) / 86_400_000), 0)
      : 0;

    const subscriptionSummary: DashboardSubscription = {
      planCode: plan.code,
      planName: plan.name,
      status: subscription?.status ?? 'NONE',
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      daysLeft,
    };

    const recentChats = await this.prisma.chatThread.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      select: { id: true, title: true, updatedAt: true },
    });

    const recentAnalyses = await this.prisma.documentAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        status: true,
        createdAt: true,
        file: { select: { originalName: true } },
      },
    });

    const recentGenerated = await this.prisma.generatedDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, documentType: true, status: true, createdAt: true },
    });

    const recentDocuments: DashboardRecentDocument[] = [
      ...recentAnalyses.map((d) => ({ id: d.id, title: d.file.originalName, type: 'analysis' as const, status: d.status, createdAt: d.createdAt })),
      ...recentGenerated.map((d) => ({ id: d.id, title: d.documentType, type: 'generated' as const, status: d.status, createdAt: d.createdAt })),
    ]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 5);

    const alerts: DashboardAlert[] = [];

    if (plan.code === 'FREE') {
      alerts.push({ type: 'SUBSCRIPTION', title: 'Bepul tarif', message: "Siz bepul tarifdan foydalanmoqdasiz. Cheksiz imkoniyatlar uchun obuna oling" });
    } else if (daysLeft <= 3 && daysLeft > 0) {
      alerts.push({ type: 'SUBSCRIPTION', title: 'Obuna tugayapti', message: `Obunangiz ${daysLeft} kun ichida tugaydi` });
    }

    if (dashboardUsage.questions.remaining === 0) {
      alerts.push({ type: 'LIMIT', title: 'Savollar limiti tugadi', message: 'Bu oy uchun savollar limitingiz tugadi' });
    }

    return {
      user: {
        id: user.id,
        firstName: user.profile?.firstName ?? '',
        lastName: user.profile?.lastName ?? '',
        language: user.language,
      },
      subscription: subscriptionSummary,
      usage: dashboardUsage,
      recentChats: recentChats.map((c) => ({ id: c.id, title: c.title, lastMessage: null, updatedAt: c.updatedAt })),
      recentDocuments,
      alerts,
    };
  }
}
