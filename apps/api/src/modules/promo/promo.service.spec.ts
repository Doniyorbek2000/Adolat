import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

import { PromoService } from './promo.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

const USER_ID = 'user-1';
const ADMIN_ID = 'admin-1';
const PROMO_ID = 'promo-1';

const mockPromoCode = {
  id: PROMO_ID,
  code: 'SUMMER2024',
  type: 'DISCOUNT',
  discountPercent: 20,
  freePlanCode: null,
  extraUsageAmount: null,
  maxRedemptions: 100,
  perUserLimit: 1,
  expiresAt: new Date(Date.now() + 86_400_000), // tomorrow
  isActive: true,
  createdById: ADMIN_ID,
  redemptions: [],
  createdAt: new Date(),
};

describe('PromoService', () => {
  let service: PromoService;
  let prisma: Record<string, any>;
  let subscriptionsService: Record<string, jest.Mock>;

  beforeEach(async () => {
    prisma = {
      promoCode: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      promoRedemption: {
        count: jest.fn(),
        create: jest.fn(),
      },
      notification: { create: jest.fn() },
      subscriptionPlan: { findUnique: jest.fn() },
    };

    subscriptionsService = {
      activateSubscription: jest.fn(),
      incrementUsage: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromoService,
        { provide: PrismaService, useValue: prisma },
        { provide: SubscriptionsService, useValue: subscriptionsService },
      ],
    }).compile();

    service = module.get(PromoService);
  });

  // ── apply ───────────────────────────────────────────────────────────

  it('apply — applies DISCOUNT promo and creates redemption', async () => {
    prisma.promoCode.findFirst.mockResolvedValue(mockPromoCode);
    prisma.promoRedemption.count.mockResolvedValue(5);
    prisma.promoRedemption.create.mockResolvedValue({});
    prisma.notification.create.mockResolvedValue({});

    const result = await service.apply(USER_ID, 'SUMMER2024');

    expect(result.success).toBe(true);
    expect(result.effect.type).toBe('DISCOUNT');
    expect(result.effect.discount).toBe(20);
    expect(prisma.promoRedemption.create).toHaveBeenCalledWith({
      data: { promoCodeId: PROMO_ID, userId: USER_ID },
    });
  });

  it('apply — throws NotFoundException for invalid code', async () => {
    prisma.promoCode.findFirst.mockResolvedValue(null);

    await expect(service.apply(USER_ID, 'INVALID')).rejects.toThrow(NotFoundException);
  });

  it('apply — throws ForbiddenException for expired promo', async () => {
    prisma.promoCode.findFirst.mockResolvedValue({
      ...mockPromoCode,
      expiresAt: new Date(Date.now() - 86_400_000), // yesterday
    });

    await expect(service.apply(USER_ID, 'SUMMER2024')).rejects.toThrow(ForbiddenException);
  });

  it('apply — throws ForbiddenException when user already redeemed', async () => {
    prisma.promoCode.findFirst.mockResolvedValue({
      ...mockPromoCode,
      redemptions: [{ userId: USER_ID }], // already redeemed (perUserLimit = 1)
    });
    prisma.promoRedemption.count.mockResolvedValue(5);

    await expect(service.apply(USER_ID, 'SUMMER2024')).rejects.toThrow(ForbiddenException);
  });

  // ── create ──────────────────────────────────────────────────────────

  it('create — creates new promo code', async () => {
    prisma.promoCode.findUnique.mockResolvedValue(null); // no duplicate
    prisma.promoCode.create.mockResolvedValue(mockPromoCode);

    const result = await service.create(
      { code: 'SUMMER2024', type: 'DISCOUNT' as any, discountPercent: 20 },
      ADMIN_ID,
    );

    expect(result).toEqual(mockPromoCode);
    expect(prisma.promoCode.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        code: 'SUMMER2024',
        type: 'DISCOUNT',
        createdById: ADMIN_ID,
      }),
    });
  });

  it('create — throws BadRequestException for duplicate code', async () => {
    prisma.promoCode.findUnique.mockResolvedValue(mockPromoCode);

    await expect(
      service.create({ code: 'SUMMER2024', type: 'DISCOUNT' as any }, ADMIN_ID),
    ).rejects.toThrow(BadRequestException);
  });

  // ── delete ──────────────────────────────────────────────────────────

  it('delete — deletes promo code', async () => {
    prisma.promoCode.findUnique.mockResolvedValue(mockPromoCode);
    prisma.promoCode.delete.mockResolvedValue(mockPromoCode);

    await service.delete(PROMO_ID);

    expect(prisma.promoCode.delete).toHaveBeenCalledWith({ where: { id: PROMO_ID } });
  });

  it('delete — throws NotFoundException if not found', async () => {
    prisma.promoCode.findUnique.mockResolvedValue(null);

    await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundException);
  });
});
