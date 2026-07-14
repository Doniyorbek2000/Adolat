import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AiSettings } from '../../config/ai.config';
import { OcrService } from '../ocr/ocr.service';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ClauseRisk {
  title: string; // band nomi yoki modda havolasi
  riskLevel: RiskLevel;
  issue: string; // aniqlangan xavf/muammo
  recommendation: string; // tavsiya
}

export interface ContractRiskResult {
  overallRiskScore: number; // 0..100
  riskLevel: RiskLevel;
  summary: string;
  clauses: ClauseRisk[];
  missingClauses: string[]; // yetishmayotgan muhim bandlar
}

/**
 * Shartnoma risk-skoring: shartnomani modda-bandlar kesimida tahlil qilib,
 * xavf darajasi (0..100), bandlar bo'yicha muammolar/tavsiyalar va yetishmayotgan
 * muhim bandlarni qaytaradi. Gemini structured output (JSON schema) ishlatiladi.
 */
@Injectable()
export class ContractRiskService {
  private readonly logger = new Logger(ContractRiskService.name);
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

  /** Fayldan (PDF/DOCX/rasm) matnni ajratib, risk tahlilini qaytaradi. */
  async assessFile(buffer: Buffer, mimeType: string, language: 'UZ' | 'RU' = 'UZ'): Promise<ContractRiskResult> {
    const { text } = await this.ocr.extractText(buffer, mimeType, language);
    return this.assessText(text, language);
  }

  /** Shartnoma matnini tahlil qiladi. */
  async assessText(text: string, language: 'UZ' | 'RU' = 'UZ'): Promise<ContractRiskResult> {
    const clean = (text ?? '').trim();
    if (clean.length < 40) {
      throw new BadRequestException('Shartnoma matni juda qisqa yoki bo\'sh');
    }
    if (!this.apiKey) {
      throw new ServiceUnavailableException('GEMINI_API_KEY sozlanmagan — risk tahlili ishlamaydi');
    }

    const langName = language === 'RU' ? 'rus' : 'o\'zbek';
    const prompt =
      `Sen O'zbekiston huquqi bo'yicha shartnoma ekspertisan. Quyidagi shartnomani ` +
      `modda-bandlar kesimida tahlil qil. Har bir muhim band uchun xavf darajasini ` +
      `(LOW/MEDIUM/HIGH), muammoni va tavsiyani ko'rsat. Umumiy risk ballini 0-100 ` +
      `oralig'ida ber (100 = eng xavfli). Yetishmayotgan muhim bandlarni sanab o't. ` +
      `Javob ${langName} tilida bo'lsin.\n\n=== SHARTNOMA ===\n${clean.slice(0, 30000)}`;

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
          responseSchema: RISK_SCHEMA,
        },
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      this.logger.error(`Gemini risk HTTP ${response.status}: ${await response.text()}`);
      throw new ServiceUnavailableException('Risk tahlili xizmati vaqtincha ishlamayapti');
    }

    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const raw = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      throw new ServiceUnavailableException('Risk tahlilini o\'qib bo\'lmadi');
    }
  }

  /** AI javobini xavfsiz normalizatsiya qiladi (chegaralar, default qiymatlar). */
  private normalize(json: Record<string, unknown>): ContractRiskResult {
    const clampScore = Math.max(0, Math.min(100, Math.round(Number(json.overallRiskScore) || 0)));
    const clauses = Array.isArray(json.clauses) ? (json.clauses as ClauseRisk[]) : [];
    const missing = Array.isArray(json.missingClauses) ? (json.missingClauses as string[]) : [];

    return {
      overallRiskScore: clampScore,
      riskLevel: this.levelFromScore(clampScore, json.riskLevel),
      summary: typeof json.summary === 'string' ? json.summary : '',
      clauses: clauses.map((c) => ({
        title: String(c?.title ?? ''),
        riskLevel: this.parseLevel(c?.riskLevel) ?? 'LOW',
        issue: String(c?.issue ?? ''),
        recommendation: String(c?.recommendation ?? ''),
      })),
      missingClauses: missing.map((m) => String(m)),
    };
  }

  private levelFromScore(score: number, provided: unknown): RiskLevel {
    const parsed = this.parseLevel(provided);
    if (parsed) return parsed;
    if (score >= 67) return 'HIGH';
    if (score >= 34) return 'MEDIUM';
    return 'LOW';
  }

  /** Yaroqli daraja bo'lsa qaytaradi, aks holda null (score'dan aniqlash uchun). */
  private parseLevel(v: unknown): RiskLevel | null {
    const s = String(v).toUpperCase();
    return s === 'HIGH' || s === 'MEDIUM' || s === 'LOW' ? (s as RiskLevel) : null;
  }
}

const RISK_SCHEMA = {
  type: 'object',
  properties: {
    overallRiskScore: { type: 'integer' },
    riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
    summary: { type: 'string' },
    clauses: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          riskLevel: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH'] },
          issue: { type: 'string' },
          recommendation: { type: 'string' },
        },
      },
    },
    missingClauses: { type: 'array', items: { type: 'string' } },
  },
} as const;
