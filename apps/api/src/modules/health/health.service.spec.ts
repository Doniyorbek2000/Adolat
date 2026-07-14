import { HealthService } from './health.service';
import { PrismaService } from '../../database/prisma/prisma.service';

describe('HealthService', () => {
  function make(isHealthy: boolean) {
    const prisma = { isHealthy: jest.fn().mockResolvedValue(isHealthy) };
    return { service: new HealthService(prisma as unknown as PrismaService), prisma };
  }

  it('check() reports the service as ok with an uptime', () => {
    const { service } = make(true);
    const result = service.check();
    expect(result.status).toBe('ok');
    expect(result.service).toBe('adolat-ai-api');
    expect(typeof result.uptime).toBe('number');
    expect(result.timestamp).toBeDefined();
  });

  it('checkDatabase() reports up when the DB is healthy', async () => {
    const { service } = make(true);
    await expect(service.checkDatabase()).resolves.toMatchObject({ status: 'ok', database: 'up' });
  });

  it('checkDatabase() reports down when the DB is unhealthy', async () => {
    const { service } = make(false);
    await expect(service.checkDatabase()).resolves.toMatchObject({ status: 'error', database: 'down' });
  });
});
