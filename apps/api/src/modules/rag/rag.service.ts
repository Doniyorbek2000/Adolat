import { Injectable, Logger } from '@nestjs/common';
import { LegalSourceType } from '@prisma/client';

import { RetrievalService } from './services/retrieval.service';
import { SourceRouterService } from './services/source-router.service';
import { ContextBuilderService } from './services/context-builder.service';

export interface RagChunk {
  content: string;
  sourceName: string;
  documentTitle: string;
  documentUrl: string;
  articleRef?: string;
  publishedAt?: Date;
  similarity: number;
}

export interface RagContextResult {
  chunks: RagChunk[];
  contextString: string;
  hasSufficientContext: boolean;
}

const SUFFICIENT_CONTEXT_MIN_CHUNKS = 2;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);

  constructor(
    private readonly retrieval: RetrievalService,
    private readonly sourceRouter: SourceRouterService,
    private readonly contextBuilder: ContextBuilderService,
  ) {}

  /**
   * Given a question and language, find relevant legal context.
   *
   * 1. Determine relevant source types from the query (or use caller-supplied override).
   * 2. Retrieve top-K relevant chunks via embedding similarity (or full-text fallback).
   * 3. Build a formatted context string for use in an AI system prompt.
   */
  async findContext(
    query: string,
    language: 'UZ' | 'RU',
    sourceTypes?: LegalSourceType[],
  ): Promise<RagContextResult> {
    this.logger.debug(`findContext: query="${query.slice(0, 80)}…", lang=${language}`);

    // Route to relevant source types if caller didn't specify
    const resolvedTypes =
      sourceTypes && sourceTypes.length > 0
        ? sourceTypes
        : this.sourceRouter.route(query);

    this.logger.debug(`Routing to source types: ${resolvedTypes.join(', ')}`);

    const chunks = await this.retrieval.retrieve(query, resolvedTypes);

    const contextString = this.contextBuilder.build(chunks, language);

    return {
      chunks,
      contextString,
      hasSufficientContext: chunks.length >= SUFFICIENT_CONTEXT_MIN_CHUNKS,
    };
  }
}
