import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { CourtPracticeService } from './court-practice.service';
import { OcrService } from '../ocr/ocr.service';

function makeService(apiKey = 'gkey') {
  const config = { get: () => ({ gemini: { apiKey, model: 'gemini-1.5-flash' } }) };
  const ocr = { extractText: jest.fn().mockResolvedValue({ text: 'X'.repeat(200), method: 'pdf-parse', imageBased: false }) };
  const service = new CourtPracticeService(
    config as unknown as ConfigService<{ ai: never }, true>,
    ocr as unknown as OcrService,
  );
  return { service, ocr };
}

function mockGemini(obj: unknown) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify(obj) }] } }] }),
  });
}

const caseText = 'Sud majlisida ish ko\'rib chiqildi. Tomonlar tinglandi. '.repeat(10);

describe('CourtPracticeService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects text that is too short', async () => {
    const { service } = makeService();
    await expect(service.analyzeText('qisqa')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is unavailable without a Gemini key', async () => {
    const { service } = makeService('');
    await expect(service.analyzeText(caseText)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns a normalized structured case analysis', async () => {
    global.fetch = mockGemini({
      caseType: 'Fuqarolik',
      summary: 'Shartnoma nizosi',
      parties: ['Da\'vogar MChJ', 'Javobgar YaTT'],
      claim: 'Qarzni undirish',
      courtPosition: 'Dalillar yetarli',
      outcome: 'Da\'vo qanoatlantirildi',
      appliedNorms: [{ law: 'Fuqarolik kodeksi', article: '234-modda' }],
      precedentValue: 'MEDIUM',
      keyTakeaways: ['Yozma shartnoma muhim'],
    }) as never;

    const { service } = makeService();
    const r = await service.analyzeText(caseText);
    expect(r.caseType).toBe('Fuqarolik');
    expect(r.parties).toHaveLength(2);
    expect(r.appliedNorms[0]).toEqual({ law: 'Fuqarolik kodeksi', article: '234-modda' });
    expect(r.precedentValue).toBe('MEDIUM');
  });

  it('defaults precedentValue to LOW when invalid', async () => {
    global.fetch = mockGemini({ caseType: 'X', precedentValue: 'garbage', appliedNorms: [], parties: [], keyTakeaways: [] }) as never;
    const { service } = makeService();
    const r = await service.analyzeText(caseText);
    expect(r.precedentValue).toBe('LOW');
  });

  it('analyzeFile extracts text via OCR first', async () => {
    global.fetch = mockGemini({ caseType: 'Jinoyat', appliedNorms: [], parties: [], keyTakeaways: [] }) as never;
    const { service, ocr } = makeService();
    const r = await service.analyzeFile(Buffer.from('pdf'), 'application/pdf', 'UZ');
    expect(ocr.extractText).toHaveBeenCalled();
    expect(r.caseType).toBe('Jinoyat');
  });
});
