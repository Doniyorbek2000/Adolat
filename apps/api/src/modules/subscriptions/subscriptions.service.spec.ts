import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

import { SubscriptionsService } from './subscriptions.service';
import { PrismaService } from '../../database/prisma/prisma.service';

const USER_ID = 'user-1';
const PLAN_ID = 'plan-1';

const mockPlan = {
  id: PLAN_ID,
  code: 'BASIC',
  name: 'Basic',
  priceUzs: 50000,
  billingPeriodDays: 30,
  questionLimit: 100,
  documentAnalysisLimit: 20,
  generatedDocumentLimit: 10,
  voiceMinutesLimit: 30,
  maxFileSizeMb: 50,
  isActive: true,
};

const mockSubscription = {
  id: 'sub-1',
  userId: USER_ID,
  planId: PLAN_ID,
  status: 'ACTIVE',
  currentPeriodStart: new Date(),
  currentPeriodEnd: new Date(Date.now() + 30 * 86_400_000),
  plan: mockPlan,
};

describe('SubscriptionsService', () => {
  let service: SubscriptionsService;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      subscriptionPlan: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      subscription: {
        findFirst: jest.fn(),
        create: jest.fn(),
        updateMany: jest.fn(),
      },
      usageCounter: {
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      invoice: { create: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SubscriptionsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(SubscriptionsService);
  });

  // ── getPublicPlans ──────────────────────────────────────────────────

  it('getPublicPlans — returns active plans ordered by price', async () => {
    prisma.subscriptionPlan.findMany.mockResolvedValue([mockPlan]);

    const result = await service.getPublicPlans();

    expect(result).toEqual([mockPlan]);
    expect(prisma.subscriptionPlan.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { priceUzs: 'asc' },
    });
  });

  // ── getPlan ─────────────────────────────────────────────────────────

  it('getPlan — returns plan by ID', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);

    const result = await service.getPlan(PLAN_ID);
    expect(result).toEqual(mockPlan);
  });

  it('getPlan — throws NotFoundException when plan not found', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(null);

    await expect(service.getPlan('nonexistent')).rejects.toThrow(NotFoundException);
  });

  // ── getCurrentSubscription ──────────────────────────────────────────

  it('getCurrentSubscription — returns active subscription with plan', async () => {
    prisma.subscription.findFirst.mockResolvedValue(mockSubscription);

    const result = await service.getCurrentSubscription(USER_ID);

    expect(result).toEqual(mockSubscription);
    expect(prisma.subscription.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: USER_ID, status: 'ACTIVE' }),
        include: { plan: true },
      }),
    );
  });

  // ── checkAndIncrementUsage ──────────────────────────────────────────

  it('checkAndIncrementUsage — increments usage when under limit', async () => {
    prisma.subscription.findFirst.mockResolvedValue(mockSubscription);
    prisma.usageCounter.findFirst.mockResolvedValue({
      id: 'counter-1',
      questionsUsed: 5,
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 86_400_000),
    });
    prisma.usageCounter.update.mockResolvedValue({});

    await expect(service.checkAndIncrementUsage(USER_ID, 'questionsUsed')).resolves.not.toThrow();

    expect(prisma.usageCounter.update).toHaveBeenCalledWith({
      where: { id: 'counter-1' },
      data: { questionsUsed: { increment: 1 } },
    });
  });

  it('checkAndIncrementUsage — throws ForbiddenException when limit exceeded', async () => {
    prisma.subscription.findFirst.mockResolvedValue(mockSubscription);
    prisma.usageCounter.findFirst.mockResolvedValue({
      id: 'counter-1',
      questionsUsed: 100, // equals the plan limit of 100
      periodStart: new Date(),
      periodEnd: new Date(Date.now() + 86_400_000),
    });

    await expect(service.checkAndIncrementUsage(USER_ID, 'questionsUsed')).rejects.toThrow(
      ForbiddenException,
    );
  });

  // ── activateSubscription ────────────────────────────────────────────

  it('activateSubscription — cancels existing and creates new subscription', async () => {
    prisma.subscriptionPlan.findUnique.mockResolvedValue(mockPlan);
    prisma.subscription.updateMany.mockResolvedValue({ count: 1 });
    const newSub = { ...mockSubscription, id: 'sub-2' };
    prisma.subscription.create.mockResolvedValue(newSub);

    const result = await service.activateSubscription(USER_ID, PLAN_ID, 1);

    expect(result).toEqual(newSub);
    expect(prisma.subscription.updateMany).toHaveBeenCalledWith({
      where: {
        userId: USER_ID,
        status: { in: ['ACTIVE', 'PENDING'] },
      },
      data: { status: 'CANCELLED' },
    });
    expect(prisma.subscription.create).toHaveBeenCalled();
  });
});
