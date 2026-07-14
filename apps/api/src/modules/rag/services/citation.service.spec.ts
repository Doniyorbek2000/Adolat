import { CitationService } from './citation.service';
import { RagChunk } from '../rag.service';

function chunk(overrides: Partial<RagChunk> = {}): RagChunk {
  return {
    content: 'Ta’til huquqi kafolatlanadi.',
    sourceName: 'lex.uz',
    documentTitle: 'Mehnat kodeksi',
    documentUrl: 'https://lex.uz/docs/1',
    articleRef: 'Modda 220',
    publishedAt: new Date('2023-05-01T00:00:00.000Z'),
    similarity: 0.9,
    ...overrides,
  };
}

describe('CitationService', () => {
  let service: CitationService;
  beforeEach(() => (service = new CitationService()));

  describe('no sources', () => {
    it('returns the mandatory "not found" footer (UZ)', () => {
      const r = service.build([], 'UZ');
      expect(r.hasSources).toBe(false);
      expect(r.confidence).toBe(0);
      expect(r.citations).toEqual([]);
      expect(r.footer).toContain("rasmiy ma'lumot topilmadi");
    });

    it('returns the Russian not-found footer', () => {
      const r = service.build([], 'RU');
      expect(r.footer).toContain('не найдена');
    });
  });

  describe('with sources', () => {
    it('builds structured citations with law / article / date / source / link', () => {
      const r = service.build([chunk()], 'UZ');
      expect(r.hasSources).toBe(true);
      expect(r.citations[0]).toEqual({
        index: 1,
        law: 'Mehnat kodeksi',
        article: 'Modda 220',
        date: '2023-05-01',
        source: 'lex.uz',
        link: 'https://lex.uz/docs/1',
        similarity: 0.9,
      });
    });

    it('renders a footer with confidence %, numbering and last-updated', () => {
      const r = service.build([chunk(), chunk({ documentTitle: 'Soliq kodeksi', similarity: 0.8 })], 'UZ');
      expect(r.footer).toContain('Manbalar');
      expect(r.footer).toContain(`${r.confidence}%`);
      expect(r.footer).toContain('1.');
      expect(r.footer).toContain('2.');
      expect(r.footer).toContain('Oxirgi yangilangan: 2023-05-01');
    });

    it('orders citations by similarity (highest first)', () => {
      const r = service.build(
        [chunk({ documentTitle: 'Low', similarity: 0.5 }), chunk({ documentTitle: 'High', similarity: 0.95 })],
        'UZ',
      );
      expect(r.citations[0].law).toBe('High');
    });

    it('nullifies manual:// links', () => {
      const r = service.build([chunk({ documentUrl: 'manual://x' })], 'UZ');
      expect(r.citations[0].link).toBeNull();
    });

    it('never claims 100% confidence even at similarity 1.0', () => {
      const r = service.build([chunk({ similarity: 1 })], 'UZ');
      expect(r.confidence).toBeLessThanOrEqual(99);
      expect(r.confidence).toBeGreaterThan(0);
    });

    it('handles missing article/date gracefully', () => {
      const r = service.build([chunk({ articleRef: undefined, publishedAt: undefined })], 'UZ');
      expect(r.citations[0].article).toBeNull();
      expect(r.citations[0].date).toBeNull();
      expect(r.lastUpdated).toBeNull();
    });
  });
});
