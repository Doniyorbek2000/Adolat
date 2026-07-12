import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { OcrService } from './ocr.service';

function makeService(apiKey = 'test-key'): OcrService {
  const config = {
    get: () => ({ gemini: { apiKey, model: 'gemini-1.5-flash' } }),
  } as unknown as ConfigService<{ ai: never }, true>;
  return new OcrService(config);
}

function mockGeminiText(text: string) {
  return jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }),
  });
}

describe('OcrService', () => {
  const originalFetch = global.fetch;
  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  describe('extractText routing', () => {
    it('reads plain text directly (utf8)', async () => {
      const r = await makeService().extractText(Buffer.from('Salom'), 'text/plain');
      expect(r).toEqual({ text: 'Salom', method: 'utf8', imageBased: false });
    });

    it('routes images to Gemini vision OCR', async () => {
      global.fetch = mockGeminiText('Passport matni') as never;
      const r = await makeService().extractText(Buffer.from([1, 2, 3]), 'image/jpeg', 'UZ');
      expect(r.method).toBe('gemini-vision');
      expect(r.imageBased).toBe(true);
      expect(r.text).toBe('Passport matni');
    });

    it('rejects unsupported types', async () => {
      await expect(
        makeService().extractText(Buffer.from('x'), 'application/zip'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('visionOcr', () => {
    it('sends the image as inline_data and returns extracted text', async () => {
      const fetchMock = mockGeminiText('Matn');
      global.fetch = fetchMock as never;

      const text = await makeService().visionOcr(Buffer.from('img'), 'image/png', 'RU');
      expect(text).toBe('Matn');

      const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
      expect(body.contents[0].parts[0].inline_data.mime_type).toBe('image/png');
      expect(body.contents[0].parts[0].inline_data.data).toBe(Buffer.from('img').toString('base64'));
    });

    it('throws ServiceUnavailable when GEMINI_API_KEY is missing', async () => {
      await expect(
        makeService('').visionOcr(Buffer.from('img'), 'image/png'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('throws when the Gemini API returns an error status', async () => {
      global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429, text: async () => 'rate' }) as never;
      await expect(
        makeService().visionOcr(Buffer.from('img'), 'image/png'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('extractIdDocument', () => {
    it('parses structured passport/ID fields', async () => {
      global.fetch = mockGeminiText(
        JSON.stringify({ fullName: 'Ali Valiyev', documentNumber: 'AA1234567', pinfl: '12345678901234' }),
      ) as never;

      const fields = await makeService().extractIdDocument(Buffer.from('img'), 'image/jpeg');
      expect(fields.fullName).toBe('Ali Valiyev');
      expect(fields.documentNumber).toBe('AA1234567');
      expect(fields.pinfl).toBe('12345678901234');
    });

    it('rejects non-image files', async () => {
      await expect(
        makeService().extractIdDocument(Buffer.from('x'), 'application/pdf'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('requests JSON structured output (responseSchema)', async () => {
      const fetchMock = mockGeminiText('{}');
      global.fetch = fetchMock as never;
      await makeService().extractIdDocument(Buffer.from('img'), 'image/jpeg');
      const body = JSON.parse((fetchMock.mock.calls[0][1] as { body: string }).body);
      expect(body.generationConfig.responseMimeType).toBe('application/json');
      expect(body.generationConfig.responseSchema).toBeDefined();
    });
  });
});
