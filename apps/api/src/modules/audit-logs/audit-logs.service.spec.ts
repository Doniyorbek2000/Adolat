import { Prisma } from '@prisma/client';

import { AuditLogsService } from './audit-logs.service';
import { PrismaService } from '../../database/prisma/prisma.service';

describe('AuditLogsService', () => {
  function make() {
    const prisma = { auditLog: { create: jest.fn().mockResolvedValue({}) } };
    return { service: new AuditLogsService(prisma as unknown as PrismaService), prisma };
  }

  it('creates an audit log with the provided fields', async () => {
    const { service, prisma } = make();
    await service.createLog({ userId: 'u1', action: 'LOGIN', entityType: 'User', entityId: 'u1' });

    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data).toMatchObject({ userId: 'u1', action: 'LOGIN', entityType: 'User', entityId: 'u1' });
  });

  it('defaults optional fields to null / JsonNull', async () => {
    const { service, prisma } = make();
    await service.createLog({ action: 'CREATE' });
    const data = prisma.auditLog.create.mock.calls[0][0].data;
    expect(data.userId).toBeNull();
    expect(data.adminId).toBeNull();
    expect(data.metadata).toBe(Prisma.JsonNull);
  });

  it('never throws when the DB write fails (audit must not break the main flow)', async () => {
    const { service, prisma } = make();
    prisma.auditLog.create.mockRejectedValueOnce(new Error('db down'));
    await expect(service.createLog({ action: 'DELETE' })).resolves.toBeUndefined();
  });
});
