import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

import { AuthService, RequestContext } from './auth.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { EmailService } from '../email/email.service';
import * as passwordUtil from './utils/password.util';
import * as tokenUtil from './utils/token.util';

jest.mock('./utils/password.util');
jest.mock('./utils/token.util');
jest.mock('./utils/otp.util', () => ({
  generateOtpCode: jest.fn().mockReturnValue('123456'),
  hashOtpCode: jest.fn().mockReturnValue('hashed-otp'),
  getOtpExpiry: jest.fn().mockReturnValue(new Date(Date.now() + 600_000)),
  verifyOtpCode: jest.fn().mockReturnValue(true),
}));

const APP_SETTINGS = {
  nodeEnv: 'test',
  argon2: {},
  jwt: {
    accessSecret: 'access-secret',
    accessExpiresIn: '15m',
    refreshSecret: 'refresh-secret',
    refreshExpiresIn: '7d',
  },
  otp: {
    expiresInMinutes: 10,
    maxAttempts: 5,
    resendCooldownSeconds: 60,
  },
};

const CTX: RequestContext = { ipAddress: '127.0.0.1', userAgent: 'jest' };

const mockUser = {
  id: 'user-1',
  phone: '+998901234567',
  email: null,
  passwordHash: 'hashed-password',
  status: 'ACTIVE',
  language: 'UZ',
  profile: { firstName: 'Ali', lastName: 'Valiyev' },
  roles: [{ role: { name: 'USER' } }],
};

describe('AuthService', () => {
  let service: AuthService;
  let prisma: Record<string, any>;
  let jwtService: { signAsync: jest.Mock };
  let auditLogsService: { createLog: jest.Mock };
  let emailService: { sendOtp: jest.Mock };

  beforeEach(async () => {
    prisma = {
      user: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      userProfile: { create: jest.fn() },
      role: { findUnique: jest.fn() },
      userRole: { create: jest.fn() },
      usageCounter: { create: jest.fn() },
      subscriptionPlan: { findUnique: jest.fn() },
      subscription: { create: jest.fn() },
      otpCode: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      session: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      refreshToken: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    jwtService = { signAsync: jest.fn().mockResolvedValue('jwt-token') };
    auditLogsService = { createLog: jest.fn().mockResolvedValue(undefined) };
    emailService = { sendOtp: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: AuditLogsService, useValue: auditLogsService },
        { provide: EmailService, useValue: emailService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(APP_SETTINGS) },
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  // ── register ────────────────────────────────────────────────────────

  it('register — creates user and returns requiresVerification', async () => {
    prisma.user.findFirst.mockResolvedValue(null); // no existing user

    const createdUser = { id: 'new-user', phone: '+998901234567', status: 'PENDING' };
    prisma.$transaction.mockImplementation(async (cb: Function) => {
      const tx = {
        user: { create: jest.fn().mockResolvedValue(createdUser) },
        userProfile: { create: jest.fn() },
        role: { findUnique: jest.fn().mockResolvedValue({ id: 'role-1', name: 'USER' }) },
        userRole: { create: jest.fn() },
        usageCounter: { create: jest.fn() },
        subscriptionPlan: { findUnique: jest.fn().mockResolvedValue({ id: 'plan-free' }) },
        subscription: { create: jest.fn() },
        otpCode: { updateMany: jest.fn(), create: jest.fn() },
      };
      return cb(tx);
    });

    const result = await service.register(
      {
        firstName: 'Ali',
        lastName: 'Valiyev',
        phone: '+998901234567',
        password: 'StrongPass1',
        language: 'UZ' as any,
      },
      CTX,
    );

    expect(result).toEqual({
      userId: 'new-user',
      requiresVerification: true,
      target: '+998901234567',
    });
    expect(auditLogsService.createLog).toHaveBeenCalled();
  });

  it('register — throws ConflictException if user already exists', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);

    await expect(
      service.register(
        {
          firstName: 'Ali',
          lastName: 'Valiyev',
          phone: '+998901234567',
          password: 'StrongPass1',
          language: 'UZ' as any,
        },
        CTX,
      ),
    ).rejects.toThrow(ConflictException);
  });

  // ── login ───────────────────────────────────────────────────────────

  it('login — returns tokens for valid credentials', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    (passwordUtil.verifyPassword as jest.Mock).mockResolvedValue(true);
    (tokenUtil.generateTokenId as jest.Mock).mockReturnValue('token-id-1');
    (tokenUtil.hashToken as jest.Mock).mockReturnValue('hashed-refresh');
    (tokenUtil.calculateExpiry as jest.Mock).mockReturnValue(new Date(Date.now() + 86400000));

    const session = { id: 'session-1' };
    prisma.session.create.mockResolvedValue(session);
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.user.update.mockResolvedValue(mockUser);

    const result = await service.login(
      { identifier: '+998901234567', password: 'StrongPass1' },
      CTX,
    );

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
    expect(result).toHaveProperty('user');
    expect(result.user.id).toBe('user-1');
  });

  it('login — throws UnauthorizedException for wrong password', async () => {
    prisma.user.findFirst.mockResolvedValue(mockUser);
    (passwordUtil.verifyPassword as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ identifier: '+998901234567', password: 'wrong' }, CTX),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('login — throws ForbiddenException for BLOCKED user', async () => {
    prisma.user.findFirst.mockResolvedValue({ ...mockUser, status: 'BLOCKED' });

    await expect(
      service.login({ identifier: '+998901234567', password: 'StrongPass1' }, CTX),
    ).rejects.toThrow(ForbiddenException);
  });

  // ── me ──────────────────────────────────────────────────────────────

  it('me — returns user with subscription and usage', async () => {
    const userWithSubs = {
      ...mockUser,
      subscriptions: [
        {
          id: 'sub-1',
          status: 'ACTIVE',
          plan: {
            code: 'FREE',
            name: 'Free',
            questionLimit: 10,
            documentAnalysisLimit: 5,
            generatedDocumentLimit: 3,
            voiceMinutesLimit: 2,
            maxFileSizeMb: 10,
          },
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(),
        },
      ],
      usageCounters: [
        {
          periodStart: new Date(),
          periodEnd: new Date(),
          questionsUsed: 2,
          analysesUsed: 1,
          documentsUsed: 0,
          voiceSecondsUsed: 0,
        },
      ],
    };
    prisma.user.findUnique.mockResolvedValue(userWithSubs);

    const result = await service.me('user-1') as any;

    expect(result.id).toBe('user-1');
    expect(result.subscription).not.toBeNull();
    expect(result.subscription.plan.code).toBe('FREE');
    expect(result.usage).not.toBeNull();
    expect(result.usage.questionsUsed).toBe(2);
  });

  it('me — throws UnauthorizedException if user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.me('nonexistent')).rejects.toThrow(UnauthorizedException);
  });
});
