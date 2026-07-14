import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiSettings } from '../../config/ai.config';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type OcrMethod = 'gemini-vision' | 'pdf-parse' | 'mammoth' | 'utf8';

export interface OcrResult {
  text: string;
  method: OcrMethod;
  /** Skaner/rasm bo'lsa true (matn qatlami yo'q). */
  imageBased: boolean;
}

/** Passport/ID hujjatidan ajratiladigan tuzilgan maydonlar. */
export interface IdDocumentFields {
  documentType: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  documentNumber: string | null;
  pinfl: string | null; // JSHSHIR
  nationality: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  issuingAuthority: string | null;
}

/**
 * OCR xizmati. Rasmlar (passport, ID, chek, skaner) uchun **Gemini vision**
 * (multimodal) ishlatiladi — qo'shimcha OCR provayder shart emas, mavjud
 * GEMINI_API_KEY kifoya. PDF/DOCX/TXT uchun matn qatlami o'qiladi.
 */
@Injectable()
export class OcrService {
  private readonly logger = new Logger(OcrService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService<{ ai: AiSettings }, true>) {
    const ai = this.config.get('ai', { infer: true });
    this.apiKey = ai.gemini.apiKey;
    this.model = ai.gemini.model; // gemini-1.5-flash — multimodal
  }

  get isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  /** Har qanday qo'llab-quvvatlanadigan fayldan matn ajratadi. */
  async extractText(buffer: Buffer, mimeType: string, language: 'UZ' | 'RU' = 'UZ'): Promise<OcrResult> {
    const m = mimeType.toLowerCase();

    if (m === 'application/pdf') {
      const text = await this.extractPdf(buffer);
      // Matn qatlami bo'sh — skanerlangan PDF (haqiqiy OCR uchun sahifalarni
      // rasmga aylantirish kerak; hozircha aniq belgi qaytaramiz).
      return { text, method: 'pdf-parse', imageBased: text.trim().length < 20 };
    }

    if (
      m === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      m === 'application/msword'
    ) {
      return { text: await this.extractDocx(buffer), method: 'mammoth', imageBased: false };
    }

    if (m.startsWith('image/')) {
      return { text: await this.visionOcr(buffer, mimeType, language), method: 'gemini-vision', imageBased: true };
    }

    if (m.startsWith('text/')) {
      return { text: buffer.toString('utf-8'), method: 'utf8', imageBased: false };
    }

    throw new BadRequestException(`OCR qo'llab-quvvatlamaydigan fayl turi: ${mimeType}`);
  }

  /** Rasmdan barcha matnni Gemini vision orqali o'qiydi. */
  async visionOcr(buffer: Buffer, mimeType: string, language: 'UZ' | 'RU' = 'UZ'): Promise<string> {
    const prompt =
      language === 'RU'
        ? 'Извлеки ВЕСЬ текст с изображения дословно, сохраняя порядок строк. Не добавляй пояснений — только текст.'
        : "Rasmda ko'ringan BARCHA matnni o'zgartirmasdan, satrlar tartibini saqlab yoz. Hech qanday izoh qo'shma — faqat matn.";

    const json = await this.geminiGenerate({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } },
            { text: prompt },
          ],
        },
      ],
      generationConfig: { temperature: 0 },
    });

    return this.firstText(json).trim();
  }

  /** Passport/ID kartadan tuzilgan maydonlarni ajratadi (Gemini structured output). */
  async extractIdDocument(buffer: Buffer, mimeType: string): Promise<IdDocumentFields> {
    if (!mimeType.toLowerCase().startsWith('image/')) {
      throw new BadRequestException('ID/passport ajratish faqat rasm fayllar uchun');
    }

    const json = await this.geminiGenerate({
      contents: [
        {
          role: 'user',
          parts: [
            { inline_data: { mime_type: mimeType, data: buffer.toString('base64') } },
            {
              text: "Bu hujjat (passport yoki ID karta) rasmidan maydonlarni ajratib ol. Topilmagan maydon uchun null qo'y. Sanalar YYYY-MM-DD formatida.",
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        responseSchema: ID_SCHEMA,
      },
    });

    const raw = this.firstText(json);
    try {
      return JSON.parse(raw) as IdDocumentFields;
    } catch {
      throw new ServiceUnavailableException('ID hujjatini ajratib bo\'lmadi');
    }
  }

  // ─── Ichki yordamchilar ─────────────────────────────────────────────────────

  private async geminiGenerate(body: Record<string, unknown>): Promise<unknown> {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException('GEMINI_API_KEY sozlanmagan — OCR ishlamaydi');
    }
    const url = `${GEMINI_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Gemini OCR HTTP ${response.status}: ${detail}`);
      throw new ServiceUnavailableException('OCR xizmati vaqtincha ishlamayapti');
    }
    return response.json();
  }

  private firstText(json: unknown): string {
    const j = json as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    return (
      j.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
    );
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async extractDocx(buffer: Buffer): Promise<string> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
}

const ID_SCHEMA = {
  type: 'object',
  properties: {
    documentType: { type: 'string', nullable: true },
    fullName: { type: 'string', nullable: true },
    firstName: { type: 'string', nullable: true },
    lastName: { type: 'string', nullable: true },
    birthDate: { type: 'string', nullable: true },
    documentNumber: { type: 'string', nullable: true },
    pinfl: { type: 'string', nullable: true },
    nationality: { type: 'string', nullable: true },
    issueDate: { type: 'string', nullable: true },
    expiryDate: { type: 'string', nullable: true },
    issuingAuthority: { type: 'string', nullable: true },
  },
} as const;
