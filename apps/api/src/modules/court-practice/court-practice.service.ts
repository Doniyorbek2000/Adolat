import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiSettings } from '../../config/ai.config';
import { OcrService } from '../ocr/ocr.service';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export interface AppliedNorm {
  law: string; // qonun/kodeks nomi
  article: string; // modda/band
}

export interface CourtCaseAnalysis {
  caseType: string; // fuqarolik / jinoyat / iqtisodiy / ma'muriy ...
  summary: string; // ish mohiyati
  parties: string[]; // tomonlar
  claim: string; // da'vo/ayblov mohiyati
  courtPosition: string; // sud pozitsiyasi/asoslari
  outcome: string; // qaror natijasi
  appliedNorms: AppliedNorm[]; // qo'llanilgan normalar
  precedentValue: 'LOW' | 'MEDIUM' | 'HIGH'; // amaliy ahamiyati
  keyTakeaways: string[]; // asosiy xulosalar
}

/**
 * Sud amaliyoti analizatori: sud qarori/hujjatini tahlil qilib, ish turi,
 * mohiyati, sud pozitsiyasi, natija, qo'llanilgan normalar va amaliy xulosalarni
 * tuzilgan (structured) ko'rinishda qaytaradi. Gemini JSON-schema ishlatiladi.
 */
@Injectable()
export class CourtPracticeService {
  private readonly logger = new Logger(CourtPracticeService.name);
  private readonly apiKey: string;
  private readonly model: string;

  constructor(
    private readonly config: ConfigService<{ ai: AiSettings }, true>,
    private readonly ocr: OcrService,
  ) {
    const ai = this.config.get('ai', { infer: true });
    this.apiKey = ai.gemini.apiKey;
    this.model = ai.gemini.model;
  }

  async analyzeFile(buffer: Buffer, mimeType: string, language: 'UZ' | 'RU' = 'UZ'): Promise<CourtCaseAnalysis> {
    const { text } = await this.ocr.extractText(buffer, mimeType, language);
    return this.analyzeText(text, language);
  }

  async analyzeText(text: string, language: 'UZ' | 'RU' = 'UZ'): Promise<CourtCaseAnalysis> {
    const clean = (text ?? '').trim();
    if (clean.length < 60) {
      throw new BadRequestException('Sud qarori matni juda qisqa yoki bo\'sh');
    }
    if (!this.apiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY sozlanmagan — sud amaliyoti tahlili ishlamaydi');
    }

    const langName = language === 'RU' ? 'rus' : 'o\'zbek';
    const prompt =
      `Sen O'zbekiston sud amaliyoti bo'yicha ekspertsan. Quyidagi sud qarorini ` +
      `tahlil qil: ish turi, mohiyati, tomonlar, da'vo/ayblov, sud pozitsiyasi va ` +
      `asoslari, qaror natijasi, qo'llanilgan qonun normalari (kodeks va modda), ` +
      `amaliy ahamiyati (precedent) va asosiy xulosalar. Faqat matndagi ma'lumotga ` +
      `tayan, o'ylab topma. Javob ${langName} tilida.\n\n=== SUD QARORI ===\n${clean.slice(0, 30000)}`;

    const json = await this.geminiStructured(prompt);
    return this.normalize(json);
  }

  private async geminiStructured(prompt: string): Promise<Record<string, unknown>> {
    const url = `${GEMINI_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
          responseSchema: CASE_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      this.logger.error(`Gemini court HTTP ${response.status}: ${await response.text()}`);
      throw new ServiceUnavailableException('Sud amaliyoti tahlili vaqtincha ishlamayapti');
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException('Sud tahlilini o\'qib bo\'lmadi');
    }
  }

  private normalize(json: Record<string, unknown>): CourtCaseAnalysis {
    const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
    const norms = Array.isArray(json.appliedNorms) ? (json.appliedNorms as AppliedNorm[]) : [];
    const pv = String(json.precedentValue).toUpperCase();

    return {
      caseType: String(json.caseType ?? ''),
      summary: String(json.summary ?? ''),
      parties: strArr(json.parties),
      claim: String(json.claim ?? ''),
      courtPosition: String(json.courtPosition ?? ''),
      outcome: String(json.outcome ?? ''),
      appliedNorms: norms.map((n) => ({ law: String(n?.law ?? ''), article: String(n?.article ?? '') })),
      precedentValue: pv === 'HIGH' || pv === 'MEDIUM' || pv === 'LOW' ? (pv as CourtCaseAnalysis['precedentValue']) : 'LOW',
      keyTakeaways: strArr(json.keyTakeaways),
    };
  }
}

const CASE_SCHEMA = {
  type: 'object',
  properties: {
    caseType: { type: 'string' },
    summary: { type: 'string' },
    parties: { type: 'array', items: { type: 'string' } },
    claim: { type: 'string' },
    courtPosition: { type: 'string' },
    outcome: { type: 'string' },
    appliedNorms: {
      type: 'array',
      items: {
        type: 'object',
        properties: { law: { type: 'string' }, article: { type: 'string' } },
      },
    },
    precedentValue: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    keyTakeaways: { type: 'array', items: { type: 'string' } },
  },
} as const;
