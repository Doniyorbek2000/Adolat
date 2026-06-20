import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AuditAction,
  AuditLog,
  NotificationType,
  Prisma,
  SystemSetting,
  User,
  UserStatus,
} from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

export interface AnalyticsOverview {
  totalUsers: number;
  activeSubscriptions: number;
  todayRequests: number;
  totalRevenue: string;
  recentErrors: number;
}

export interface AiAnalytics {
  requestsByProvider: Record<string, number>;
  avgLatencyMs: number;
  totalTokensUsed: number;
  failureRate: number;
}

export interface AuditLogFilter {
  userId?: string;
  adminId?: string;
  action?: AuditAction;
  entityType?: string;
  from?: Date;
  to?: Date;
}

@Injectable()
export class AdminAnalyticsService {
  private readonly logger = new Logger(AdminAnalyticsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async getOverview(): Promise<AnalyticsOverview> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [totalUsers, activeSubscriptions, todayRequests, revenueAgg, recentErrors] =
      await Promise.all([
        this.prisma.user.count({
          where: { status: { not: UserStatus.DELETED } },
        }),
        this.prisma.subscription.count({
          where: {
            status: 'ACTIVE',
            currentPeriodEnd: { gte: new Date() },
          },
        }),
        this.prisma.aiRequest.count({
          where: { createdAt: { gte: todayStart } },
        }),
        this.prisma.payment.aggregate({
          where: { status: 'PAID' },
          _sum: { amountUzs: true },
        }),
        this.prisma.aiRequest.count({
          where: {
            status: { in: ['FAILED', 'TIMEOUT'] },
            createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
          },
        }),
      ]);

    return {
      totalUsers,
      activeSubscriptions,
      todayRequests,
      totalRevenue: (revenueAgg._sum.amountUzs ?? 0).toString(),
      recentErrors,
    };
  }

  async getAiAnalytics(): Promise<AiAnalytics> {
    const [requests, latencyAgg, tokenAgg, totalRequests, failedRequests] = await Promise.all([
      this.prisma.aiRequest.groupBy({
        by: ['finalProvider'],
        _count: { id: true },
      }),
      this.prisma.aiRequest.aggregate({
        where: { status: 'SUCCESS' },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiRequest.aggregate({
        _sum: { promptTokens: true, completionTokens: true },
      }),
      this.prisma.aiRequest.count(),
      this.prisma.aiRequest.count({
        where: { status: { in: ['FAILED', 'TIMEOUT'] } },
      }),
    ]);

    const requestsByProvider: Record<string, number> = {};
    for (const row of requests) {
      const key = row.finalProvider ?? 'UNKNOWN';
      requestsByProvider[key] = row._count.id;
    }

    const totalTokensUsed =
      (tokenAgg._sum.promptTokens ?? 0) + (tokenAgg._sum.completionTokens ?? 0);

    return {
      requestsByProvider,
      avgLatencyMs: Math.round(latencyAgg._avg.latencyMs ?? 0),
      totalTokensUsed,
      failureRate: totalRequests > 0 ? failedRequests / totalRequests : 0,
    };
  }

  async getUsers(
    page: number,
    limit: number,
    search?: string,
  ): Promise<{ users: User[]; total: number }> {
    const where = search
      ? {
          OR: [
            { email: { contains: search, mode: 'insensitive' as const } },
            { phone: { contains: search } },
            {
              profile: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' as const } },
                  { lastName: { contains: search, mode: 'insensitive' as const } },
                ],
              },
            },
          ],
          status: { not: UserStatus.DELETED },
        }
      : { status: { not: UserStatus.DELETED } };

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          profile: true,
          roles: { include: { role: true } },
          subscriptions: {
            where: { status: 'ACTIVE' },
            include: { plan: true },
            take: 1,
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total };
  }

  async blockUser(adminId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} topilmadi`);

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.BLOCKED },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        userId,
        action: AuditAction.BLOCK,
        entityType: 'User',
        entityId: userId,
        metadata: { reason: 'Admin blocked' },
      },
    });

    await this.notificationsService.create(
      userId,
      NotificationType.SECURITY,
      'Hisobingiz bloklandi',
      "Sizning hisobingiz administrator tomonidan bloklandi. Murojaat uchun qo'llab-quvvatlash xizmatiga yozing.",
    );

    this.logger.log(`Admin ${adminId} blocked user ${userId}`);
  }

  async unblockUser(adminId: string, userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException(`User ${userId} topilmadi`);

    await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.ACTIVE },
    });

    await this.prisma.auditLog.create({
      data: {
        adminId,
        userId,
        action: AuditAction.UNBLOCK,
        entityType: 'User',
        entityId: userId,
        metadata: { reason: 'Admin unblocked' },
      },
    });

    await this.notificationsService.create(
      userId,
      NotificationType.SECURITY,
      'Hisobingiz aktivlashtirildi',
      'Sizning hisobingiz administrator tomonidan aktivlashtirildi.',
    );

    this.logger.log(`Admin ${adminId} unblocked user ${userId}`);
  }

  async getAuditLogs(
    filters: AuditLogFilter,
    page: number,
    limit: number,
  ): Promise<{ logs: AuditLog[]; total: number }> {
    const where = {
      ...(filters.userId ? { userId: filters.userId } : {}),
      ...(filters.adminId ? { adminId: filters.adminId } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.from || filters.to
        ? {
            createdAt: {
              ...(filters.from ? { gte: filters.from } : {}),
              ...(filters.to ? { lte: filters.to } : {}),
            },
          }
        : {}),
    };

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { logs, total };
  }

  async getSettings(): Promise<SystemSetting[]> {
    return this.prisma.systemSetting.findMany({
      orderBy: { key: 'asc' },
    });
  }

  async updateSetting(
    key: string,
    value: unknown,
    adminId: string,
  ): Promise<SystemSetting> {
    const setting = await this.prisma.systemSetting.upsert({
      where: { key },
      create: { key, value: value as never, updatedById: adminId },
      update: { value: value as never, updatedById: adminId },
    });

    await this.prisma.adminAction.create({
      data: {
        adminId,
        action: 'UPDATE_SETTING',
        entityType: 'SystemSetting',
        metadata: { key, value } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Admin ${adminId} updated setting "${key}"`);
    return setting;
  }

  async getAdminNotifications(page: number, limit: number) {
    const where = {
      action: 'SEND_BULK_NOTIFICATION',
    };

    const [actions, total] = await Promise.all([
      this.prisma.adminAction.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.adminAction.count({ where }),
    ]);

    const notifications = actions.map((a) => {
      const meta = (a.metadata ?? {}) as Record<string, unknown>;
      return {
        id: a.id,
        type: meta.type ?? 'SYSTEM',
        title: meta.title ?? '',
        body: meta.body ?? '',
        userCount: meta.userCount ?? 0,
        createdAt: a.createdAt,
      };
    });

    return { notifications, total, page, limit };
  }

  async sendBulkNotification(
    adminId: string,
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
  ): Promise<{ sentCount: number }> {
    let targetUserIds = userIds;

    if (targetUserIds.length === 0) {
      const allUsers = await this.prisma.user.findMany({
        where: { status: { not: UserStatus.DELETED } },
        select: { id: true },
      });
      targetUserIds = allUsers.map((u) => u.id);
    }

    await this.notificationsService.sendBulk(targetUserIds, type, title, body);

    await this.prisma.adminAction.create({
      data: {
        adminId,
        action: 'SEND_BULK_NOTIFICATION',
        metadata: { userCount: targetUserIds.length, type, title, body } as Prisma.InputJsonValue,
      },
    });

    this.logger.log(`Admin ${adminId} sent bulk notification to ${targetUserIds.length} users`);
    return { sentCount: targetUserIds.length };
  }
}
