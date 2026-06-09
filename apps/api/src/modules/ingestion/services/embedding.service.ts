import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);
  private readonly client: OpenAI | null;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    this.model = this.config.get<string>('EMBEDDINGS_MODEL') ?? 'text-embedding-3-small';

    if (apiKey) {
      this.client = new OpenAI({ apiKey });
    } else {
      this.client = null;
      this.logger.warn(
        'OPENAI_API_KEY is not set — EmbeddingService will return empty arrays.',
      );
    }
  }

  /**
   * Embed a single text string.
   * Returns an empty array if the OpenAI key is missing.
   */
  async embed(text: string): Promise<number[]> {
    if (!this.client) return [];
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: text,
      });
      return response.data[0].embedding;
    } catch (err) {
      this.logger.error(`embed() failed: ${String(err)}`);
      return [];
    }
  }

  /**
   * Embed multiple texts in a single API call.
   * Returns an empty array-of-arrays if the OpenAI key is missing.
   */
  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.client || texts.length === 0) return [];
    try {
      const response = await this.client.embeddings.create({
        model: this.model,
        input: texts,
      });
      // Preserve order (API guarantees index field)
      return response.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    } catch (err) {
      this.logger.error(`embedBatch() failed: ${String(err)}`);
      return [];
    }
  }

  /**
   * Cosine similarity between two vectors.
   * Returns 0 if either vector is empty.
   */
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
