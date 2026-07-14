import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

type EmbeddingsProvider = 'gemini' | 'openai';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Matnlarni embedding vektorlariga aylantiradi.
 *
 * Standart provayder — **Gemini** (`text-embedding-004`, 768 o'lchov), shunda
 * RAG semantik qidiruvi faqat Gemini API kaliti bilan ishlaydi. `openai` ham
 * qo'llab-quvvatlanadi (`EMBEDDINGS_PROVIDER=openai`).
 *
 * DIQQAT: pgvector ustuni o'lchovi (`vector(768)`) tanlangan modelga mos
 * bo'lishi shart. Modelni o'zgartirsangiz, DB ustunini migratsiya bilan yangilang.
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly provider: EmbeddingsProvider;
  private readonly model: string;

  // Provayderga xos
  private readonly openai: OpenAI | null = null;
  private readonly geminiApiKey: string;

  constructor(private readonly config: ConfigService) {
    this.provider =
      (this.config.get<string>('EMBEDDINGS_PROVIDER') as EmbeddingsProvider) ?? 'gemini';
    this.model =
      this.config.get<string>('EMBEDDINGS_MODEL') ??
      (this.provider === 'openai' ? 'text-embedding-3-small' : 'text-embedding-004');

    this.geminiApiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';

    if (this.provider === 'openai') {
      const apiKey = this.config.get<string>('OPENAI_API_KEY');
      if (apiKey) {
        this.openai = new OpenAI({ apiKey });
      } else {
        this.logger.warn("OPENAI_API_KEY sozlanmagan — embeddings bo'sh massiv qaytaradi.");
      }
    } else if (!this.geminiApiKey) {
      this.logger.warn("GEMINI_API_KEY sozlanmagan — embeddings bo'sh massiv qaytaradi.");
    }
  }

  private get isConfigured(): boolean {
    return this.provider === 'openai' ? this.openai !== null : Boolean(this.geminiApiKey);
  }

  /** Bitta matnni embed qiladi. Sozlanmagan bo'lsa bo'sh massiv qaytaradi. */
  async embed(text: string): Promise<number[]> {
    if (!this.isConfigured) return [];
    try {
      const [vector] =
        this.provider === 'openai'
          ? await this.embedOpenAi([text])
          : await this.embedGemini([text]);
      return vector ?? [];
    } catch (err) {
      this.logger.error(`embed() xato: ${String(err)}`);
      return [];
    }
  }

  /** Bir nechta matnni bitta so'rovda embed qiladi. */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.isConfigured || texts.length === 0) return [];
    try {
      return this.provider === 'openai'
        ? await this.embedOpenAi(texts)
        : await this.embedGemini(texts);
    } catch (err) {
      this.logger.error(`embedBatch() xato: ${String(err)}`);
      return [];
    }
  }

  // ─── OpenAI ──────────────────────────────────────────────────────────────
  private async embedOpenAi(texts: string[]): Promise<number[][]> {
    if (!this.openai) return [];
    const response = await this.openai.embeddings.create({ model: this.model, input: texts });
    return response.data.sort((a, b) => a.index - b.index).map((item) => item.embedding);
  }

  // ─── Gemini ──────────────────────────────────────────────────────────────
  private async embedGemini(texts: string[]): Promise<number[][]> {
    const url = `${GEMINI_BASE}/models/${this.model}:batchEmbedContents?key=${this.geminiApiKey}`;
    const body = {
      requests: texts.map((text) => ({
        model: `models/${this.model}`,
        content: { parts: [{ text }] },
      })),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Gemini embeddings HTTP ${response.status}: ${await response.text()}`);
    }

    const json = (await response.json()) as { embeddings?: { values?: number[] }[] };
    return (json.embeddings ?? []).map((e) => e.values ?? []);
  }

  /** Ikki vektor orasidagi cosine o'xshashlik. Bo'sh bo'lsa 0. */
  cosineSimilarity(a: number[], b: number[]): number {
    if (a.length === 0 || b.length === 0 || a.length !== b.length) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}
