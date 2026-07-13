import { ConfigService } from '@nestjs/config';

import { SourceSyncSchedulerService } from './source-sync-scheduler.service';
import { PrismaService } from '../../database/prisma/prisma.service';
import { IngestionService } from './ingestion.service';

function setup(autoSync: boolean) {
  const prisma = {
    legalSource: { findMany: jest.fn().mockResolvedValue([]) },
    sourceSyncJob: { create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'job-1', ...data })) },
  };
  const ingestion = { syncSource: jest.fn().mockResolvedValue(undefined) };
  const config = { get: jest.fn().mockReturnValue(autoSync) };
  const service = new SourceSyncSchedulerService(
    prisma as unknown as PrismaService,
    ingestion as unknown as IngestionService,
    config as unknown as ConfigService,
  );
  return { service, prisma, ingestion };
}

const HOUR = 3_600_000;
function source(id: string, lastSyncedAt: Date | null, intervalHours = 24) {
  return { id, status: 'ACTIVE', lastSyncedAt, syncIntervalHours: intervalHours };
}

describe('SourceSyncSchedulerService', () => {
  it('does nothing when auto-sync is disabled', async () => {
    const { service, prisma } = setup(false);
    const n = await service.syncDueSources();
    expect(n).toBe(0);
    expect(prisma.legalSource.findMany).not.toHaveBeenCalled();
  });

  it('syncs sources that are due (never synced or past their interval)', async () => {
    const { service, prisma, ingestion } = setup(true);
    prisma.legalSource.findMany.mockResolvedValue([
      source('a', null), // hech qachon — due
      source('b', new Date(Date.now() - 25 * HOUR)), // 25h oldin, interval 24h — due
      source('c', new Date(Date.now() - 1 * HOUR)), // 1h oldin — due emas
    ]);

    const n = await service.syncDueSources();
    expect(n).toBe(2);
    expect(ingestion.syncSource).toHaveBeenCalledTimes(2);
    expect(prisma.sourceSyncJob.create).toHaveBeenCalledTimes(2);
  });

  it('returns 0 when nothing is due', async () => {
    const { service, prisma, ingestion } = setup(true);
    prisma.legalSource.findMany.mockResolvedValue([source('c', new Date(Date.now() - 1 * HOUR))]);
    const n = await service.syncDueSources();
    expect(n).toBe(0);
    expect(ingestion.syncSource).not.toHaveBeenCalled();
  });

  it('continues after a failing source and counts only successes', async () => {
    const { service, prisma, ingestion } = setup(true);
    prisma.legalSource.findMany.mockResolvedValue([source('a', null), source('b', null)]);
    ingestion.syncSource
      .mockRejectedValueOnce(new Error('scrape failed'))
      .mockResolvedValueOnce(undefined);

    const n = await service.syncDueSources();
    expect(n).toBe(1);
    expect(ingestion.syncSource).toHaveBeenCalledTimes(2);
  });

  it('skips overlapping runs', async () => {
    const { service, prisma } = setup(true);
    (service as unknown as { running: boolean }).running = true;
    const n = await service.syncDueSources();
    expect(n).toBe(0);
    expect(prisma.legalSource.findMany).not.toHaveBeenCalled();
  });
});
