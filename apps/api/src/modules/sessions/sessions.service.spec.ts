import { NotFoundException } from '@nestjs/common';

import { SessionsService } from './sessions.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

function make() {
  const prisma = {
    session: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    refreshToken: { updateMany: jest.fn() },
    $transaction: jest.fn().mockResolvedValue([]),
  };
  const audit = { createLog: jest.fn().mockResolvedValue(undefined) };
  const service = new SessionsService(
    prisma as unknown as PrismaService,
    audit as unknown as AuditLogsService,
  );
  return { service, prisma, audit };
}

const baseSession = {
  id: 's1',
  userId: 'u1',
  deviceId: 'Pixel 8',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537',
  ipAddress: '1.2.3.4',
  lastSeenAt: new Date('2024-01-02'),
  createdAt: new Date('2024-01-01'),
  status: 'ACTIVE',
};

describe('SessionsService', () => {
  describe('listSessions', () => {
    it('parses the user agent and flags the current session', async () => {
      const { service, prisma } = make();
      prisma.session.findMany.mockResolvedValue([baseSession]);

      const [view] = await service.listSessions('u1', 's1');
      expect(view.os).toBe('Windows');
      expect(view.browser).toBe('Chrome');
      expect(view.deviceType).toBe('desktop');
      expect(view.currentSession).toBe(true);
    });

    it('detects mobile / Android / Firefox', async () => {
      const { service, prisma } = make();
      prisma.session.findMany.mockResolvedValue([
        { ...baseSession, id: 's2', userAgent: 'Mozilla/5.0 (Android 14; Mobile) Firefox/121' },
      ]);
      const [view] = await service.listSessions('u1', 's1');
      expect(view.os).toBe('Android');
      expect(view.browser).toBe('Firefox');
      expect(view.deviceType).toBe('mobile');
      expect(view.currentSession).toBe(false);
    });
  });

  describe('revokeSession', () => {
    it('throws NotFound when the session is missing', async () => {
      const { service, prisma } = make();
      prisma.session.findUnique.mockResolvedValue(null);
      await expect(service.revokeSession('u1', 's1', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFound when the session belongs to another user', async () => {
      const { service, prisma } = make();
      prisma.session.findUnique.mockResolvedValue({ ...baseSession, userId: 'other' });
      await expect(service.revokeSession('u1', 's1', {})).rejects.toBeInstanceOf(NotFoundException);
    });

    it('revokes an owned session and writes an audit log', async () => {
      const { service, prisma, audit } = make();
      prisma.session.findUnique.mockResolvedValue(baseSession);
      const result = await service.revokeSession('u1', 's1', { ipAddress: '1.1.1.1' });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(audit.createLog).toHaveBeenCalledTimes(1);
      expect(result.message).toContain('bekor qilindi');
    });
  });

  describe('revokeAllSessions', () => {
    it('revokes matching sessions and reports the count', async () => {
      const { service, prisma } = make();
      prisma.session.findMany.mockResolvedValue([{ id: 's2' }, { id: 's3' }]);
      const result = await service.revokeAllSessions('u1', 's1', false, {});
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.message).toBe('2 ta sessiya bekor qilindi');
    });

    it('does not open a transaction when there is nothing to revoke', async () => {
      const { service, prisma } = make();
      prisma.session.findMany.mockResolvedValue([]);
      const result = await service.revokeAllSessions('u1', 's1', true, {});
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(result.message).toBe('0 ta sessiya bekor qilindi');
    });
  });
});
