import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Notification, NotificationType, Prisma } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { PushService } from '../push/push.service';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly pushService: PushService,
  ) {}

  async getUserNotifications(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<void> {
    const notification = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!notification) {
      throw new NotFoundException('Bildirishnoma topilmadi');
    }
    if (!notification.isRead) {
      await this.prisma.notification.update({
        where: { id: notificationId },
        data: { isRead: true, readAt: new Date() },
      });
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { userId, isRead: false },
    });
  }

  async create(
    userId: string,
    type: NotificationType,
    title: string,
    body: string,
    metadata?: Record<string, unknown>,
  ): Promise<Notification> {
    const notification = await this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        body,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    this.sendPushToUser(userId, title, body).catch((err) => {
      this.logger.error(`Push bildirishnoma yuborishda xatolik: ${err.message}`);
    });

    return notification;
  }

  private async sendPushToUser(userId: string, title: string, body: string): Promise<void> {
    const devices = await this.prisma.deviceFingerprint.findMany({
      where: { userId, pushToken: { not: null } },
      select: { pushToken: true },
    });

    const tokens = devices
      .map((d) => d.pushToken)
      .filter((t): t is string => !!t);

    if (tokens.length === 0) {
      return;
    }

    await this.pushService.sendToMultipleDevices(tokens, title, body);
  }

  async sendBulk(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
  ): Promise<void> {
    if (userIds.length === 0) return;

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        type,
        title,
        body,
      })),
    });

    this.logger.log(`Bulk notification sent to ${userIds.length} users: "${title}"`);
  }
}
