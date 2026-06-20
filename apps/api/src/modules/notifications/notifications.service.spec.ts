import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';

import { NotificationsService } from './notifications.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { PushService } from '../push/push.service';

const USER_ID = 'user-1';
const NOTIFICATION_ID = 'notif-1';

const mockNotification = {
  id: NOTIFICATION_ID,
  userId: USER_ID,
  type: 'SYSTEM',
  title: 'Test',
  body: 'Body text',
  isRead: false,
  readAt: null,
  createdAt: new Date(),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: Record<string, any>;
  let pushService: { sendToMultipleDevices: jest.Mock };

  beforeEach(async () => {
    prisma = {
      notification: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        createMany: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      deviceFingerprint: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };

    pushService = { sendToMultipleDevices: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: PushService, useValue: pushService },
      ],
    }).compile();

    service = module.get(NotificationsService);
  });

  // ── getUserNotifications ────────────────────────────────────────────

  it('getUserNotifications — returns up to 100 notifications ordered by createdAt desc', async () => {
    prisma.notification.findMany.mockResolvedValue([mockNotification]);

    const result = await service.getUserNotifications(USER_ID);

    expect(result).toEqual([mockNotification]);
    expect(prisma.notification.findMany).toHaveBeenCalledWith({
      where: { userId: USER_ID },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  });

  // ── getUnreadCount ──────────────────────────────────────────────────

  it('getUnreadCount — returns count of unread notifications', async () => {
    prisma.notification.count.mockResolvedValue(5);

    const result = await service.getUnreadCount(USER_ID);

    expect(result).toBe(5);
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: USER_ID, isRead: false },
    });
  });

  // ── markAsRead ──────────────────────────────────────────────────────

  it('markAsRead — marks an unread notification as read', async () => {
    prisma.notification.findFirst.mockResolvedValue(mockNotification);
    prisma.notification.update.mockResolvedValue({});

    await service.markAsRead(USER_ID, NOTIFICATION_ID);

    expect(prisma.notification.update).toHaveBeenCalledWith({
      where: { id: NOTIFICATION_ID },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });

  it('markAsRead — throws NotFoundException when notification does not exist', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);

    await expect(service.markAsRead(USER_ID, 'nonexistent')).rejects.toThrow(NotFoundException);
  });

  // ── markAllAsRead ───────────────────────────────────────────────────

  it('markAllAsRead — updates all unread notifications for user', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });

    await service.markAllAsRead(USER_ID);

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: USER_ID, isRead: false },
      data: { isRead: true, readAt: expect.any(Date) },
    });
  });

  // ── create ──────────────────────────────────────────────────────────

  it('create — creates a notification with metadata', async () => {
    const created = { ...mockNotification, metadata: { key: 'value' } };
    prisma.notification.create.mockResolvedValue(created);

    const result = await service.create(USER_ID, 'SYSTEM' as any, 'Test', 'Body text', { key: 'value' });

    expect(result).toEqual(created);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: USER_ID,
        type: 'SYSTEM',
        title: 'Test',
        body: 'Body text',
      }),
    });
  });

  // ── sendBulk ────────────────────────────────────────────────────────

  it('sendBulk — creates notifications for multiple users', async () => {
    prisma.notification.createMany.mockResolvedValue({ count: 3 });
    const userIds = ['user-1', 'user-2', 'user-3'];

    await service.sendBulk(userIds, 'SYSTEM' as any, 'Announcement', 'Hello all');

    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: userIds.map((userId) => ({
        userId,
        type: 'SYSTEM',
        title: 'Announcement',
        body: 'Hello all',
      })),
    });
  });
});
