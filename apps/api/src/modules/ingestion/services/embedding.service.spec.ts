import { ConfigService } from '@nestjs/config';

import { EmbeddingService } from './embedding.service';

/** OPENAI_API_KEY yo'q — client null bo'ladi, sof funksiyalarni sinaymiz. */
function makeService(): EmbeddingService {
  const config = {
    get: jest.fn().mockReturnValue(undefined),
  } as unknown as ConfigService;
  return new EmbeddingService(config);
}

describe('EmbeddingService', () => {
  let service: EmbeddingService;

  beforeEach(() => {
    service = makeService();
  });

  describe('cosineSimilarity', () => {
    it('returns 1 for identical vectors', () => {
      expect(service.cosineSimilarity([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 6);
    });

    it('returns 0 for orthogonal vectors', () => {
      expect(service.cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0, 6);
    });

    it('returns -1 for opposite vectors', () => {
      expect(service.cosineSimilarity([1, 1], [-1, -1])).toBeCloseTo(-1, 6);
    });

    it('returns 0 when a vector is empty', () => {
      expect(service.cosineSimilarity([], [1, 2])).toBe(0);
      expect(service.cosineSimilarity([1, 2], [])).toBe(0);
    });

    it('returns 0 when lengths differ', () => {
      expect(service.cosineSimilarity([1, 2, 3], [1, 2])).toBe(0);
    });
  });

  describe('embed without API key', () => {
    it('embed() returns an empty array', async () => {
      await expect(service.embed('salom')).resolves.toEqual([]);
    });

    it('embedBatch() returns an empty array', async () => {
      await expect(service.embedBatch(['a', 'b'])).resolves.toEqual([]);
    });

    it('embedBatch() returns an empty array for empty input', async () => {
      await expect(service.embedBatch([])).resolves.toEqual([]);
    });
  });
});
