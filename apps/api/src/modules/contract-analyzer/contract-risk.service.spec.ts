import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { ContractRiskService } from './contract-risk.service';
import { OcrService } from '../ocr/ocr.service';

function makeService(apiKey = 'gkey') {
  const config = { get: () => ({ gemini: { apiKey, model: 'gemini-1.5-flash' } }) };
  const ocr = { extractText: jest.fn().mockResolvedValue({ text: 'X'.repeat(200), method: 'gemini-vision', imageBased: true }) };
  const service = new ContractRiskService(
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

const longContract = 'Ushbu shartnoma tomonlar o\'rtasida tuziladi. '.repeat(20);

describe('ContractRiskService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('rejects text that is too short', async () => {
    const { service } = makeService();
    await expect(service.assessText('qisqa')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('is unavailable without a Gemini key', async () => {
    const { service } = makeService('');
    await expect(service.assessText(longContract)).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('returns a normalized structured risk assessment', async () => {
    global.fetch = mockGemini({
      overallRiskScore: 72,
      riskLevel: 'HIGH',
      summary: 'Bir nechta xavfli band bor',
      clauses: [{ title: 'Javobgarlik', riskLevel: 'HIGH', issue: 'Cheklanmagan', recommendation: 'Chek qo\'ying' }],
      missingClauses: ['Nizolarni hal qilish'],
    }) as never;

    const { service } = makeService();
    const r = await service.assessText(longContract);
    expect(r.overallRiskScore).toBe(72);
    expect(r.riskLevel).toBe('HIGH');
    expect(r.clauses).toHaveLength(1);
    expect(r.missingClauses).toContain('Nizolarni hal qilish');
  });

  it('clamps the score and derives risk level when missing', async () => {
    global.fetch = mockGemini({ overallRiskScore: 250, clauses: [], missingClauses: [] }) as never;
    const { service } = makeService();
    const r = await service.assessText(longContract);
    expect(r.overallRiskScore).toBe(100);
    expect(r.riskLevel).toBe('HIGH'); // 100 -> HIGH
  });

  it('requests JSON structured output (responseSchema)', async () => {
    const fetchMock = mockGemini({ overallRiskScore: 10, clauses: [], missingClauses: [] });
    global.fetch = fetchMock as never;
    const { service } = makeService();
    await service.assessText(longContract);
    const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema).toBeDefined();
  });

  it('assessFile extracts text via OCR then assesses', async () => {
    global.fetch = mockGemini({ overallRiskScore: 20, riskLevel: 'LOW', clauses: [], missingClauses: [] }) as never;
    const { service, ocr } = makeService();
    const r = await service.assessFile(Buffer.from('img'), 'image/jpeg', 'UZ');
    expect(ocr.extractText).toHaveBeenCalled();
    expect(r.riskLevel).toBe('LOW');
  });
});
