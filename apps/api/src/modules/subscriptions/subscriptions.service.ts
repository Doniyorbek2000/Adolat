import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  Invoice,
  InvoiceStatus,
  PlanCode,
  Subscription,
  SubscriptionPlan,
  SubscriptionStatus,
  UsageCounter,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';

// Limits applied when no active subscription is found (FREE tier fallback)
const FREE_LIMITS = {
  questionsUsed: 2,
  analysesUsed: 1,
  documentsUsed: 1,
  voiceSecondsUsed: 2 * 60, // 2 minutes in seconds
} as const;

type UsageField = 'questionsUsed' | 'analysesUsed' | 'documentsUsed' | 'voiceSecondsUsed';

const LIMIT_FIELD_MAP: Record<UsageField, keyof SubscriptionPlan> = {
  questionsUsed: 'questionLimit',
  analysesUsed: 'documentAnalysisLimit',
  documentsUsed: 'generatedDocumentLimit',
  voiceSecondsUsed: 'voiceMinutesLimit',
};

const LIMIT_EXCEEDED_MESSAGES: Record<UsageField, string> = {
  questionsUsed: "Savollar limitingiz tugadi. Obuna yangilang.",
  analysesUsed: "Hujjat tahlili limitingiz tugadi. Obuna yangilang.",
  documentsUsed: "Hujjat yaratish limitingiz tugadi. Obuna yangilang.",
  voiceSecondsUsed: "Ovozli so'rovlar limitingiz tugadi. Obuna yangilang.",
};

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ----------------------------------------------------------------
  // Plans
  // ----------------------------------------------------------------

  async getPublicPlans(): Promise<SubscriptionPlan[]> {
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { priceUzs: 'asc' },
    });
  }

  async getPlan(planId: string): Promise<SubscriptionPlan> {
    const plan = await this.prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });
    if (!plan) {
      throw new NotFoundException(`Plan ${planId} topilmadi`);
    }
    return plan;
  }

  // ----------------------------------------------------------------
  // Current subscription
  // ----------------------------------------------------------------

  async getCurrentSubscription(
    userId: string,
  ): Promise<(Subscription & { plan: SubscriptionPlan }) | null> {
    return this.prisma.subscription.findFirst({
      where: {
        userId,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: { gte: new Date() },
      },
      include: { plan: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ----------------------------------------------------------------
  // Usage
  // ----------------------------------------------------------------

  async getCurrentUsage(userId: string): Promise<UsageCounter | null> {
    const now = new Date();
    return this.prisma.usageCounter.findFirst({
      where: {
        userId,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      orderBy: { periodStart: 'desc' },
    });
  }

  async getOrCreateCurrentUsage(userId: string): Promise<UsageCounter> {
    const now = new Date();
    const existing = await this.prisma.usageCounter.findFirst({
      where: {
        userId,
        periodStart: { lte: now },
        periodEnd: { gte: now },
      },
      orderBy: { periodStart: 'desc' },
    });

    if (existing) return existing;

    // Determine period boundaries from active subscription
    const subscription = await this.getCurrentSubscription(userId);

    let periodStart: Date;
    let periodEnd: Date;
    let subscriptionId: string | null = null;

    if (subscription) {
      periodStart = subscription.currentPeriodStart;
      periodEnd = subscription.currentPeriodEnd;
      subscriptionId = subscription.id;
    } else {
      // FREE tier: rolling 30-day period
      periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodStart.getDate() + 1);
      periodStart.setHours(0, 0, 0, 0);
      periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + 30);
    }

    return this.prisma.usageCounter.create({
      data: {
        userId,
        subscriptionId,
        periodStart,
        periodEnd,
        questionsUsed: 0,
        analysesUsed: 0,
        documentsUsed: 0,
        voiceSecondsUsed: 0,
      },
    });
  }

  async incrementUsage(
    userId: string,
    field: UsageField,
    amount = 1,
  ): Promise<void> {
    const counter = await this.getOrCreateCurrentUsage(userId);
    await this.prisma.usageCounter.update({
      where: { id: counter.id },
      data: { [field]: { increment: amount } },
    });
  }

  async checkAndIncrementUsage(userId: string, field: UsageField): Promise<void> {
    // 1. Get current subscription & plan
    const subscription = await this.getCurrentSubscription(userId);

    // 2. Get or create usage counter
    const counter = await this.getOrCreateCurrentUsage(userId);

    // 3. Determine limit
    let limit: number;
    if (subscription) {
      const plan = subscription.plan;
      const planLimitField = LIMIT_FIELD_MAP[field];
      const rawLimit = plan[planLimitField] as number;
      // voiceMinutesLimit is stored in minutes; convert to seconds for voiceSecondsUsed
      limit = field === 'voiceSecondsUsed' ? rawLimit * 60 : rawLimit;
    } else {
      limit = FREE_LIMITS[field];
    }

    // 4. Check limit
    const currentValue = counter[field] as number;
    if (currentValue >= limit) {
      throw new ForbiddenException(LIMIT_EXCEEDED_MESSAGES[field]);
    }

    // 5. Increment
    await this.prisma.usageCounter.update({
      where: { id: counter.id },
      data: { [field]: { increment: 1 } },
    });
  }

  // ----------------------------------------------------------------
  // Subscription activation
  // ----------------------------------------------------------------

  async activateSubscription(
    userId: string,
    planId: string,
    months = 1,
  ): Promise<Subscription> {
    const plan = await this.getPlan(planId);

    // Cancel any existing active subscriptions
    await this.prisma.subscription.updateMany({
      where: {
        userId,
        status: { in: [SubscriptionStatus.ACTIVE, SubscriptionStatus.PENDING] },
      },
      data: { status: SubscriptionStatus.CANCELLED },
    });

    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setDate(periodEnd.getDate() + plan.billingPeriodDays * months);

    return this.prisma.subscription.create({
      data: {
        userId,
        planId,
        status: SubscriptionStatus.ACTIVE,
        startedAt: now,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        autoRenew: true,
      },
    });
  }

  // ----------------------------------------------------------------
  // Invoice creation
  // ----------------------------------------------------------------

  async createInvoiceForPlan(userId: string, planId: string): Promise<Invoice> {
    const plan = await this.getPlan(planId);

    return this.prisma.invoice.create({
      data: {
        userId,
        planId,
        amountUzs: plan.priceUzs,
        status: InvoiceStatus.PENDING,
        dueAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      },
    });
  }
}
