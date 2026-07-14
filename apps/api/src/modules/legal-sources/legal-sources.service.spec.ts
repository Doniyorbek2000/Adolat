import { NotFoundException } from '@nestjs/common';
import { LegalSourceStatus, LegalSourceType } from '@prisma/client';

import { LegalSourcesService } from './legal-sources.service';
import { PrismaService } from '../../database/prisma/prisma.service';

describe('LegalSourcesService', () => {
  function make() {
    const prisma = {
      legalSource: {
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 's1', ...data })),
      },
    };
    const ingestion = { syncSource: jest.fn().mockResolvedValue(undefined) };
    return {
      service: new LegalSourcesService(
        prisma as unknown as PrismaService,
        ingestion as unknown as import('../ingestion/ingestion.service').IngestionService,
      ),
      prisma,
    };
  }

  describe('findOne', () => {
    it('returns the source when found', async () => {
      const { service, prisma } = make();
      prisma.legalSource.findUnique.mockResolvedValue({ id: 's1', name: 'lex.uz' });
      await expect(service.findOne('s1')).resolves.toMatchObject({ id: 's1' });
    });

    it('throws NotFound when the source does not exist', async () => {
      const { service, prisma } = make();
      prisma.legalSource.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates a source with ACTIVE status and default sync interval', async () => {
      const { service, prisma } = make();
      await service.create({
        name: 'lex.uz',
        type: LegalSourceType.LEGAL,
        baseUrl: 'https://lex.uz',
      } as never);

      const data = prisma.legalSource.create.mock.calls[0][0].data;
      expect(data.status).toBe(LegalSourceStatus.ACTIVE);
      expect(data.syncIntervalHours).toBe(24);
      expect(data.name).toBe('lex.uz');
    });
  });
});
