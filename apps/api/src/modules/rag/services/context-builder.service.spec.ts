import { ContextBuilderService } from './context-builder.service';
import { RagChunk } from '../rag.service';

function makeChunk(overrides: Partial<RagChunk> = {}): RagChunk {
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

describe('ContextBuilderService', () => {
  let service: ContextBuilderService;

  beforeEach(() => {
    service = new ContextBuilderService();
  });

  it('returns an empty string when there are no chunks', () => {
    expect(service.build([], 'UZ')).toBe('');
  });

  it('builds an Uzbek context with header, citation and content', () => {
    const out = service.build([makeChunk()], 'UZ');
    expect(out).toContain('Quyidagi huquqiy manba');
    expect(out).toContain('[1]');
    expect(out).toContain('Manba: lex.uz');
    expect(out).toContain('Hujjat: Mehnat kodeksi');
    expect(out).toContain('Modda: Modda 220');
    expect(out).toContain('Sana: 2023-05-01');
    expect(out).toContain('URL: https://lex.uz/docs/1');
    expect(out).toContain('Ta’til huquqi');
  });

  it('builds a Russian context with translated labels', () => {
    const out = service.build([makeChunk()], 'RU');
    expect(out).toContain('Используйте следующие фрагменты');
    expect(out).toContain('Источник: lex.uz');
    expect(out).toContain('Документ: Mehnat kodeksi');
    expect(out).toContain('Статья: Modda 220');
  });

  it('numbers multiple chunks and separates them', () => {
    const out = service.build([makeChunk(), makeChunk({ sourceName: 'soliq.uz' })], 'UZ');
    expect(out).toContain('[1]');
    expect(out).toContain('[2]');
    expect(out).toContain('---');
    expect(out).toContain('soliq.uz');
  });

  it('omits optional article/date lines when absent', () => {
    const out = service.build(
      [makeChunk({ articleRef: undefined, publishedAt: undefined })],
      'UZ',
    );
    expect(out).not.toContain('Modda:');
    expect(out).not.toContain('Sana:');
  });
});
