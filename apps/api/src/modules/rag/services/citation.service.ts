import { Injectable } from '@nestjs/common';

import { RagChunk } from '../rag.service';

export interface Citation {
  index: number;
  law: string; // qonun/hujjat nomi
  article: string | null; // modda/band
  date: string | null; // hujjat sanasi (YYYY-MM-DD)
  source: string; // manba (lex.uz, soliq.uz...)
  link: string | null;
  similarity: number; // 0..1
}

export interface CitationResult {
  hasSources: boolean;
  /** 0..100 — javobning manbalar bilan qo'llab-quvvatlanish darajasi. */
  confidence: number;
  lastUpdated: string | null;
  citations: Citation[];
  /** Javob matniga qo'shiladigan tayyor "Manbalar" bloki. */
  footer: string;
}

const DISCLAIMER_UZ =
  "⚠️ Ushbu javob axborot xarakteriga ega va rasmiy yuridik xulosa emas. Aniq huquqiy baho uchun malakali yuristga murojaat qiling.";
const DISCLAIMER_RU =
  "⚠️ Данный ответ носит информационный характер и не является официальным юридическим заключением. За точной оценкой обратитесь к квалифицированному юристу.";

const NOT_FOUND_UZ =
  "❕ Bu bo'yicha rasmiy ma'lumot topilmadi. Aniq huquqiy baho uchun malakali yuristga yoki tegishli davlat organiga murojaat qiling.";
const NOT_FOUND_RU =
  "❕ Официальная информация по этому вопросу не найдена. За точной оценкой обратитесь к юристу или в соответствующий государственный орган.";

/**
 * Citation Engine (master-spec 4-bo'lim).
 *
 * RAG bo'laklaridan har bir javob uchun MAJBURIY manba blokini quradi:
 * qonun · modda/band · sana · manba · havola · ishonch %. Manba bo'lmasa —
 * "rasmiy ma'lumot topilmadi" xabarini qat'iy qaytaradi (AI taxminidan qat'i nazar).
 */
@Injectable()
export class CitationService {
  build(chunks: RagChunk[], language: 'UZ' | 'RU'): CitationResult {
    const uz = language !== 'RU';

    if (!chunks || chunks.length === 0) {
      return {
        hasSources: false,
        confidence: 0,
        lastUpdated: null,
        citations: [],
        footer: `──────────\n${uz ? NOT_FOUND_UZ : NOT_FOUND_RU}\n\n${uz ? DISCLAIMER_UZ : DISCLAIMER_RU}`,
      };
    }

    // Eng relevant top-5 bo'lak (o'xshashlik bo'yicha kamayuvchi)
    const top = [...chunks].sort((a, b) => b.similarity - a.similarity).slice(0, 5);

    const citations: Citation[] = top.map((c, i) => ({
      index: i + 1,
      law: c.documentTitle,
      article: c.articleRef ?? null,
      date: c.publishedAt ? this.fmtDate(c.publishedAt) : null,
      source: c.sourceName,
      link: c.documentUrl && !c.documentUrl.startsWith('manual://') ? c.documentUrl : null,
      similarity: Math.round(c.similarity * 100) / 100,
    }));

    const confidence = this.computeConfidence(top.map((c) => c.similarity));
    const lastUpdated = this.latestDate(top);

    return {
      hasSources: true,
      confidence,
      lastUpdated,
      citations,
      footer: this.renderFooter(citations, confidence, lastUpdated, uz),
    };
  }

  /** Ishonch % — eng yuqori o'xshashlik ustuvor, top-3 o'rtachasi bilan tekislanadi. */
  private computeConfidence(similarities: number[]): number {
    if (similarities.length === 0) return 0;
    const max = Math.max(...similarities);
    const top3 = similarities.slice(0, 3);
    const avg = top3.reduce((s, v) => s + v, 0) / top3.length;
    const score = 0.6 * max + 0.4 * avg;
    // Hech qachon 100% da'vo qilmaymiz
    return Math.min(99, Math.max(0, Math.round(score * 100)));
  }

  private latestDate(chunks: RagChunk[]): string | null {
    const dates = chunks
      .map((c) => c.publishedAt)
      .filter((d): d is Date => d instanceof Date);
    if (dates.length === 0) return null;
    const max = new Date(Math.max(...dates.map((d) => d.getTime())));
    return this.fmtDate(max);
  }

  private fmtDate(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private renderFooter(
    citations: Citation[],
    confidence: number,
    lastUpdated: string | null,
    uz: boolean,
  ): string {
    const head = uz
      ? `📚 Manbalar (ishonchlilik: ${confidence}%)`
      : `📚 Источники (достоверность: ${confidence}%)`;

    const lines = citations.map((c) => {
      const bits = [c.law];
      if (c.article) bits.push(c.article);
      if (c.date) bits.push(c.date);
      const meta = [c.source, c.link].filter(Boolean).join(' · ');
      return `${c.index}. ${bits.join(' — ')}\n   ${meta}`;
    });

    const updated = lastUpdated
      ? uz
        ? `\n⏱ Oxirgi yangilangan: ${lastUpdated}`
        : `\n⏱ Последнее обновление: ${lastUpdated}`
      : '';

    const disclaimer = uz ? DISCLAIMER_UZ : DISCLAIMER_RU;

    return `──────────\n${head}\n${lines.join('\n')}${updated}\n\n${disclaimer}`;
  }
}
