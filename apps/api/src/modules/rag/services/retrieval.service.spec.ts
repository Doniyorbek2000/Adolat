import { ConfigService } from '@nestjs/config';

import { RetrievalService } from './retrieval.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { EmbeddingService } from '../../ingestion/services/embedding.service';

function setup(embedResult: number[]) {
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    legalSourceChunk: { findMany: jest.fn().mockResolvedValue([]) },
  };
  const embedding = { embed: jest.fn().mockResolvedValue(embedResult) };
  const config = {
    get: jest.fn((key: string, def?: unknown) => (key === 'RAG_MIN_SIMILARITY' ? 0.7 : def)),
  };
  const service = new RetrievalService(
    prisma as unknown as PrismaService,
    embedding as unknown as EmbeddingService,
    config as unknown as ConfigService,
  );
  return { service, prisma };
}

function vecRow(id: string, similarity: number, title = 'Kodeks') {
  return {
    id,
    content: `${id}-content`,
    articleRef: 'Modda 1',
    documentTitle: title,
    documentUrl: `https://lex.uz/${id}`,
    publishedAt: null,
    sourceName: 'lex.uz',
    similarity,
  };
}

function kwChunk(id: string, content: string) {
  return {
    id,
    content,
    articleRef: null,
    version: {
      documentTitle: 'Mehnat kodeksi',
      documentUrl: `https://lex.uz/${id}`,
      publishedAt: null,
      source: { name: 'lex.uz' },
    },
  };
}

describe('RetrievalService (hybrid)', () => {
  describe('hybrid vector + keyword (RRF)', () => {
    it('fuses vector and keyword hits and drops low-similarity vector-only chunks', async () => {
      const { service, prisma } = setup([0.1, 0.2, 0.3]);
      // A: strong vector; C: weak vector (below threshold, not keyword)
      prisma.$queryRaw.mockResolvedValue([vecRow('A', 0.92), vecRow('C', 0.4)]);
      // B: keyword-only match
      prisma.legalSourceChunk.findMany.mockResolvedValue([kwChunk('B', 'mehnat shartnomasi bekor')]);

      const result = await service.retrieve('mehnat shartnomasi');
      const urls = result.map((r) => r.documentUrl);

      expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(prisma.legalSourceChunk.findMany).toHaveBeenCalledTimes(1);
      expect(urls).toContain('https://lex.uz/A'); // vector, above threshold
      expect(urls).toContain('https://lex.uz/B'); // keyword match
      expect(urls).not.toContain('https://lex.uz/C'); // weak vector, no keyword → dropped
    });

    it('keeps a strong vector hit even without keyword match', async () => {
      const { service, prisma } = setup([0.1]);
      prisma.$queryRaw.mockResolvedValue([vecRow('A', 0.88)]);
      prisma.legalSourceChunk.findMany.mockResolvedValue([]);

      const result = await service.retrieve('savol berildi');
      expect(result).toHaveLength(1);
      expect(result[0].similarity).toBeCloseTo(0.88, 5);
    });

    it('coerces string similarity values to numbers', async () => {
      const { service, prisma } = setup([0.1]);
      prisma.$queryRaw.mockResolvedValue([{ ...vecRow('A', 0), similarity: '0.9' as unknown as number }]);
      prisma.legalSourceChunk.findMany.mockResolvedValue([]);
      const result = await service.retrieve('savol berildi');
      expect(result[0].similarity).toBe(0.9);
    });
  });

  describe('keyword-only fallback (no embedding)', () => {
    it('uses keyword search when embedding is empty', async () => {
      const { service, prisma } = setup([]);
      prisma.legalSourceChunk.findMany.mockResolvedValue([kwChunk('B', 'mehnat shartnomasi bekor qilinishi')]);

      const result = await service.retrieve('mehnat shartnomasi bekor');
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].sourceName).toBe('lex.uz');
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
