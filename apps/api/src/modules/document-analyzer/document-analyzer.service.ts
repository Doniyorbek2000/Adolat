import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DocumentAnalysis, DocumentAnalysisStatus, Language } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AiRouterService } from '../../ai-router/ai-router.service';
import { AnswerLanguage } from '../../ai-router/dto/generate-answer.dto';
import { FilesService } from '../files/files.service';
import { StorageService } from '../files/storage/storage.service';

// ─── Result shape ────────────────────────────────────────────────────────────

export interface DocumentAnalysisResult {
  documentType: string;
  summary: string;
  keyPoints: string[];
  userRights: string[];
  obligations: string[];
  risks: string[];
  ambiguities: string[];
  recommendations: string[];
  legalReferences: string[];
  disclaimer: string;
}

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class DocumentAnalyzerService {
  private readonly logger = new Logger(DocumentAnalyzerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRouter: AiRouterService,
    private readonly filesService: FilesService,
    private readonly storage: StorageService,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  async startAnalysis(
    userId: string,
    fileId: string,
    language: Language,
  ): Promise<DocumentAnalysis> {
    // 1. Verify file ownership
    const file = await this.filesService.getFile(userId, fileId);

    // 2. Create analysis record with PENDING status
    const analysis = await this.prisma.documentAnalysis.create({
      data: {
        userId,
        fileId: file.id,
        language,
        status: DocumentAnalysisStatus.PENDING,
      },
    });

    // 3. Run extraction + AI analysis asynchronously
    setImmediate(() => {
      this.runAnalysis(analysis.id, file.storageKey, file.mimeType, language).catch((err) =>
        this.logger.error(`Analysis ${analysis.id} failed: ${String(err)}`),
      );
    });

    return analysis;
  }

  async getAnalyses(userId: string): Promise<DocumentAnalysis[]> {
    return this.prisma.documentAnalysis.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAnalysis(userId: string, analysisId: string): Promise<DocumentAnalysis> {
    const analysis = await this.prisma.documentAnalysis.findUnique({
      where: { id: analysisId },
    });

    if (!analysis) {
      throw new NotFoundException('Tahlil topilmadi');
    }

    if (analysis.userId !== userId) {
      throw new ForbiddenException('Bu tahlilga kirish taqiqlangan');
    }

    return analysis;
  }

  async deleteAnalysis(userId: string, analysisId: string): Promise<void> {
    const analysis = await this.getAnalysis(userId, analysisId);

    await this.prisma.documentAnalysis.delete({
      where: { id: analysis.id },
    });
  }

  // ─── Private helpers ────────────────────────────────────────────────────────

  private async runAnalysis(
    analysisId: string,
    storageKey: string,
    mimeType: string,
    language: Language,
  ): Promise<void> {
    // Mark as PROCESSING
    await this.prisma.documentAnalysis.update({
      where: { id: analysisId },
      data: { status: DocumentAnalysisStatus.PROCESSING },
    });

    try {
      // Resolve local path (works for local storage; for S3 we try local cache)
      const localPath = this.storage.getLocalPath(storageKey);

      // Extract text
      const text = await this.extractText(localPath, mimeType);

      if (!text.trim()) {
        throw new Error('Fayldan matn ajratib olinmadi');
      }

      // Analyse with AI
      const result = await this.analyzeWithAI(text, language);

      await this.prisma.documentAnalysis.update({
        where: { id: analysisId },
        data: {
          status: DocumentAnalysisStatus.COMPLETED,
          result: result as unknown as import('@prisma/client').Prisma.InputJsonValue,
          summary: result.summary,
        },
      });

      this.logger.log(`Analysis ${analysisId} completed`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Analysis ${analysisId} failed: ${errorMessage}`);

      await this.prisma.documentAnalysis.update({
        where: { id: analysisId },
        data: {
          status: DocumentAnalysisStatus.FAILED,
          errorMessage,
        },
      });
    }
  }

  private async extractText(filePath: string, mimeType: string): Promise<string> {
    const normalized = mimeType.toLowerCase();

    if (normalized === 'application/pdf') {
      return this.extractPdf(filePath);
    }

    if (
      normalized ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      normalized === 'application/msword'
    ) {
      return this.extractDocx(filePath);
    }

    // TXT, RTF, and fallback
    return fs.promises.readFile(filePath, 'utf-8');
  }

  private async extractPdf(filePath: string): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse') as (buf: Buffer) => Promise<{ text: string }>;
    const buffer = await fs.promises.readFile(filePath);
    const data = await pdfParse(buffer);
    return data.text;
  }

  private async extractDocx(filePath: string): Promise<string> {
    const mammoth = await import('mammoth');
    const result = await mammoth.extractRawText({ path: filePath });
    return result.value;
  }

  private async analyzeWithAI(
    text: string,
    language: Language,
  ): Promise<DocumentAnalysisResult> {
    const langLabel = language === Language.UZ ? "o'zbek" : 'rus';
    const truncated = text.slice(0, 12000); // keep within token budget

    const prompt =
      `Quyidagi hujjat matnini tahlil qil va FAQAT JSON formatida javob ber (boshqa hech narsa yozma).\n` +
      `Javob ${langLabel} tilida bo'lsin.\n\n` +
      `JSON struktura:\n` +
      `{\n` +
      `  "documentType": "hujjat turi (shartnoma/ariza/qaror/qonun va h.k.)",\n` +
      `  "summary": "qisqacha mazmun",\n` +
      `  "keyPoints": ["asosiy nuqta 1", "asosiy nuqta 2"],\n` +
      `  "userRights": ["foydalanuvchi huquqi 1"],\n` +
      `  "obligations": ["majburiyat 1"],\n` +
      `  "risks": ["xavf 1"],\n` +
      `  "ambiguities": ["noaniqlik 1"],\n` +
      `  "recommendations": ["tavsiya 1"],\n` +
      `  "legalReferences": ["qonun/modda havolasi 1"],\n` +
      `  "disclaimer": "Eslatma: ushbu tahlil avtomatik tarzda yaratilgan va kasbiy yuridik maslahat emas."\n` +
      `}\n\n` +
      `Hujjat matni:\n${truncated}`;

    const aiResult = await this.aiRouter.generateLegalAnswer({
      question: prompt,
      language: language === Language.UZ ? AnswerLanguage.UZ : AnswerLanguage.RU,
      context: [],
    });

    // Parse JSON from AI response
    try {
      const jsonMatch = aiResult.answer.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON topilmadi');
      return JSON.parse(jsonMatch[0]) as DocumentAnalysisResult;
    } catch {
      // Return a graceful degraded result
      return {
        documentType: 'Aniqlanmadi',
        summary: aiResult.answer,
        keyPoints: [],
        userRights: [],
        obligations: [],
        risks: [],
        ambiguities: [],
        recommendations: [],
        legalReferences: [],
        disclaimer:
          'Eslatma: ushbu tahlil avtomatik tarzda yaratilgan va kasbiy yuridik maslahat emas.',
      };
    }
  }
}
