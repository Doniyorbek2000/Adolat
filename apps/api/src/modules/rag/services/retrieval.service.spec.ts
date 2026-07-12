import { ConfigService } from '@nestjs/config';

import { RetrievalService } from './retrieval.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmbeddingService } from '../../ingestion/services/embedding.service';

function setup(embedResult: number[]) {
  const prisma = {
    $queryRaw: jest.fn(),
    legalSourceChunk: { findMany: jest.fn() },
  };
  const embedding = { embed: jest.fn().mockResolvedValue(embedResult) };
  const config = {
    get: jest.fn((key: string, def?: unknown) =>
      key === 'RAG_MIN_SIMILARITY' ? 0.7 : def,
    ),
  };
  const service = new RetrievalService(
    prisma as unknown as PrismaService,
    embedding as unknown as EmbeddingService,
    config as unknown as ConfigService,
  );
  return { service, prisma, embedding };
}

describe('RetrievalService', () => {
  describe('pgvector path', () => {
    it('runs a raw vector query and maps rows above the threshold', async () => {
      const { service, prisma } = setup([0.1, 0.2, 0.3]);
      prisma.$queryRaw.mockResolvedValue([
        {
          content: 'Relevant',
          articleRef: 'Modda 1',
          documentTitle: 'Kodeks',
          documentUrl: 'https://lex.uz/1',
          publishedAt: new Date('2023-01-01'),
          sourceName: 'lex.uz',
          similarity: 0.92,
        },
        {
          content: 'Weakly relevant',
          articleRef: null,
          documentTitle: 'Kodeks',
          documentUrl: 'https://lex.uz/2',
          publishedAt: null,
          sourceName: 'lex.uz',
          similarity: 0.4, // threshold ostida — chiqarib tashlanadi
        },
      ]);

      const result = await service.retrieve('savol');

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.legalSourceChunk.findMany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        content: 'Relevant',
        sourceName: 'lex.uz',
        documentTitle: 'Kodeks',
        articleRef: 'Modda 1',
        similarity: 0.92,
      });
    });

    it('coerces string similarity values to numbers', async () => {
      const { service, prisma } = setup([0.1]);
      prisma.$queryRaw.mockResolvedValue([
        {
          content: 'X',
          articleRef: null,
          documentTitle: 'D',
          documentUrl: 'u',
          publishedAt: null,
          sourceName: 's',
          similarity: '0.85' as unknown as number,
        },
      ]);
      const result = await service.retrieve('savol');
      expect(result[0].similarity).toBe(0.85);
    });
  });

  describe('full-text fallback (no embedding)', () => {
    it('falls back to ILIKE search when embedding is empty', async () => {
      const { service, prisma } = setup([]);
      prisma.legalSourceChunk.findMany.mockResolvedValue([
        {
          content: 'Mehnat shartnomasi bekor qilinishi mumkin',
          articleRef: 'Modda 100',
          version: {
            documentTitle: 'Mehnat kodeksi',
            documentUrl: 'https://lex.uz/mk',
            publishedAt: null,
            source: { name: 'lex.uz' },
          },
        },
      ]);

      const result = await service.retrieve('mehnat shartnomasi bekor');

      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(prisma.legalSourceChunk.findMany).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(1);
      expect(result[0].sourceName).toBe('lex.uz');
      // fallback similarity 0.65 bilan cheklangan
      expect(result[0].similarity).toBeLessThanOrEqual(0.65);
    });

    it('returns an empty array when the query has no usable terms', async () => {
      const { service, prisma } = setup([]);
      const result = await service.retrieve('a b c');
      expect(result).toEqual([]);
      expect(prisma.legalSourceChunk.findMany).not.toHaveBeenCalled();
    });
  });
});
