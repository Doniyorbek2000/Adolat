import { ChunkerService } from './chunker.service';

describe('ChunkerService', () => {
  let service: ChunkerService;

  beforeEach(() => {
    service = new ChunkerService();
  });

  it('returns an empty array for empty / whitespace-only text', () => {
    expect(service.chunk('')).toEqual([]);
    expect(service.chunk('   \n\n  ')).toEqual([]);
  });

  it('returns a single trimmed chunk for short text', () => {
    const result = service.chunk('Salom dunyo');
    expect(result).toHaveLength(1);
    expect(result[0].content).toBe('Salom dunyo');
    expect(result[0].chunkIndex).toBe(0);
  });

  it('splits text on article boundaries', () => {
    const text =
      'Modda 1. Birinchi modda matni bu yerda.\n\n' +
      'Modda 2. Ikkinchi modda matni bu yerda.';
    const result = service.chunk(text);
    expect(result.length).toBeGreaterThanOrEqual(2);
    // chunkIndex ketma-ket 0,1,2... bo'lishi kerak
    result.forEach((c, i) => expect(c.chunkIndex).toBe(i));
    expect(result.some((c) => c.content.includes('Ikkinchi modda'))).toBe(true);
  });

  it('splits very long text without boundaries into multiple bounded chunks', () => {
    const long = 'A'.repeat(10_000); // > maxChars (900*4 = 3600)
    const result = service.chunk(long, 900, 100);
    expect(result.length).toBeGreaterThan(1);
    // Har bir chunk maxChars + overlap dan oshmasligi kerak
    result.forEach((c) => expect(c.content.length).toBeLessThanOrEqual(900 * 4 + 100 * 4 + 10));
  });

  it('adds overlap from the previous chunk to subsequent chunks', () => {
    const text =
      'Modda 1. ' + 'X'.repeat(200) + '\n\n' + 'Modda 2. ' + 'Y'.repeat(200);
    const result = service.chunk(text, 900, 50);
    expect(result.length).toBeGreaterThanOrEqual(2);
    // Ikkinchi chunk oldingi chunk oxiridan bir qism ('X') ni o'z ichiga oladi
    expect(result[1].content).toContain('X');
  });
});
