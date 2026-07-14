import { Test } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { TwoFactorService } from './two-factor.service';
import { generateTotp } from './utils/totp.util';
import { hashPassword } from './utils/password.util';

const ARGON = { memoryCost: 19_456, timeCost: 2, parallelism: 1 };

describe('TwoFactorService', () => {
  let service: TwoFactorService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock };
  };
  let audit: { createLog: jest.Mock };

  beforeEach(async () => {
    prisma = { user: { findUnique: jest.fn(), update: jest.fn() } };
    audit = { createLog: jest.fn().mockResolvedValue(undefined) };

    const moduleRef = await Test.createTestingModule({
      providers: [
        TwoFactorService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditLogsService, useValue: audit },
      ],
    }).compile();

    service = moduleRef.get(TwoFactorService);
  });

  describe('setup', () => {
    it('generates and persists a secret, returns otpauth url', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        email: 'a@b.uz',
        phone: null,
        isTwoFaEnabled: false,
      });
      prisma.user.update.mockResolvedValue({});

      const res = await service.setup('u1');

      expect(res.secret).toMatch(/^[A-Z2-7]{32}$/);
      expect(res.otpauthUrl).toContain('otpauth://totp/');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { twoFaSecret: res.secret },
      });
    });

    it('rejects if 2FA already enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', isTwoFaEnabled: true });
      await expect(service.setup('u1')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('enable', () => {
    const secret = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP';

    it('enables when the code is valid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isTwoFaEnabled: false,
        twoFaSecret: secret,
      });
      prisma.user.update.mockResolvedValue({});

      const code = generateTotp(secret);
      await service.enable('u1', code);

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isTwoFaEnabled: true },
      });
      expect(audit.createLog).toHaveBeenCalled();
    });

    it('rejects an invalid code', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isTwoFaEnabled: false,
        twoFaSecret: secret,
      });
      await expect(service.enable('u1', '000000')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects when setup was not run', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isTwoFaEnabled: false,
        twoFaSecret: null,
      });
      await expect(service.enable('u1', '123456')).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('disable', () => {
    it('disables and clears the secret with the correct password', async () => {
      const passwordHash = await hashPassword('MyPass123!', ARGON);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isTwoFaEnabled: true,
        twoFaSecret: 'SECRET',
        passwordHash,
      });
      prisma.user.update.mockResolvedValue({});

      await service.disable('u1', 'MyPass123!');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { isTwoFaEnabled: false, twoFaSecret: null },
      });
    });

    it('rejects a wrong password', async () => {
      const passwordHash = await hashPassword('MyPass123!', ARGON);
      prisma.user.findUnique.mockResolvedValue({
        id: 'u1',
        isTwoFaEnabled: true,
        twoFaSecret: 'SECRET',
        passwordHash,
      });
      await expect(service.disable('u1', 'WrongPass')).rejects.toBeInstanceOf(UnauthorizedException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects if 2FA is not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'u1', isTwoFaEnabled: false });
      await expect(service.disable('u1', 'x')).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
