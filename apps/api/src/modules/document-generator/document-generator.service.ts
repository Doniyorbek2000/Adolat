import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { GeneratedDocument, GeneratedDocumentStatus, Language } from '@prisma/client';

import { PrismaService } from '../../database/prisma/prisma.service';
import { AiRouterService } from '../../ai-router/ai-router.service';
import { AnswerLanguage } from '../../ai-router/dto/generate-answer.dto';
import { CreateGeneratedDocumentDto } from './dto/create-generated-document.dto';
import { DocumentTypeInfo, DOCUMENT_TYPES, DOCUMENT_TYPE_MAP } from './document-types';
export type { DocumentTypeInfo } from './document-types';


// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class DocumentGeneratorService {
  private readonly logger = new Logger(DocumentGeneratorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiRouter: AiRouterService,
  ) {}

  // ─── Public API ─────────────────────────────────────────────────────────────

  getDocumentTypes(): DocumentTypeInfo[] {
    return DOCUMENT_TYPES;
  }

  async create(
    userId: string,
    dto: CreateGeneratedDocumentDto,
  ): Promise<GeneratedDocument> {
    // 1. Create record in DRAFT
    const doc = await this.prisma.generatedDocument.create({
      data: {
        userId,
        documentType: dto.documentType,
        formAnswers: dto.formAnswers as unknown as import('@prisma/client').Prisma.InputJsonValue,
        language: dto.language,
        status: GeneratedDocumentStatus.DRAFT,
      },
    });

    // 2. Build AI prompt
    const answersText = Object.entries(dto.formAnswers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const langLabel = dto.language === Language.UZ ? "o'zbek" : 'rus';
    const typeInfo = DOCUMENT_TYPE_MAP.get(dto.documentType);
    const typeName =
      dto.language === Language.UZ
        ? (typeInfo?.nameUz ?? dto.documentType)
        : (typeInfo?.nameRu ?? dto.documentType);
    const structureHint = typeInfo?.promptHint ? `\nTuzilma bo'yicha yo'riqnoma: ${typeInfo.promptHint}` : '';

    const prompt =
      `Siz O'zbekiston qonunchiligiga muvofiq rasmiy hujjatlar tuzuvchi yuridik mutaxassissiz. ` +
      `Quyidagi ma'lumotlar asosida "${typeName}" hujjatini ${langLabel} tilida professional, ` +
      `rasmiy ish uslubida, to'liq va huquqiy jihatdan to'g'ri tuzing.${structureHint}\n\n` +
      `Ma'lumotlar:\n${answersText}\n\n` +
      `Faqat hujjatning to'liq matnini qaytaring, hech qanday izoh yoki tushuntirish qo'shmang.`;

    // 3. Call AI
    let content: string;
    try {
      const result = await this.aiRouter.generateLegalAnswer({
        userId,
        question: prompt,
        language: dto.language === Language.UZ ? AnswerLanguage.UZ : AnswerLanguage.RU,
        context: [],
      });
      content = result.answer;
    } catch (err) {
      this.logger.error(`AI generation failed for doc ${doc.id}: ${String(err)}`);
      // Update to DRAFT with error note
      return this.prisma.generatedDocument.update({
        where: { id: doc.id },
        data: { content: `[Xatolik: ${String(err)}]` },
      });
    }

    // 4. Save content and mark GENERATED
    return this.prisma.generatedDocument.update({
      where: { id: doc.id },
      data: {
        content,
        status: GeneratedDocumentStatus.GENERATED,
      },
    });
  }

  async getDocuments(userId: string): Promise<GeneratedDocument[]> {
    return this.prisma.generatedDocument.findMany({
      where: { userId, status: { not: GeneratedDocumentStatus.DELETED } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getDocument(userId: string, docId: string): Promise<GeneratedDocument> {
    const doc = await this.prisma.generatedDocument.findUnique({
      where: { id: docId },
    });

    if (!doc || doc.status === GeneratedDocumentStatus.DELETED) {
      throw new NotFoundException('Hujjat topilmadi');
    }

    if (doc.userId !== userId) {
      throw new ForbiddenException('Bu hujjatga kirish taqiqlangan');
    }

    return doc;
  }

  async exportPdf(userId: string, docId: string): Promise<Buffer> {
    const doc = await this.getDocument(userId, docId);
    const content = doc.content ?? '';
    return this.generatePdfBuffer(doc.documentType, content);
  }

  async exportDocx(userId: string, docId: string): Promise<Buffer> {
    const doc = await this.getDocument(userId, docId);
    const content = doc.content ?? '';
    return this.generateDocxBuffer(doc.documentType, content);
  }

  async delete(userId: string, docId: string): Promise<void> {
    await this.getDocument(userId, docId); // ownership check

    await this.prisma.generatedDocument.update({
      where: { id: docId },
      data: { status: GeneratedDocumentStatus.DELETED },
    });
  }

  // ─── Export helpers ──────────────────────────────────────────────────────────

  private async generatePdfBuffer(title: string, content: string): Promise<Buffer> {
    const PDFDocument = (await import('pdfkit')).default;

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Register a font that supports Cyrillic / Latin characters
      doc.font('Helvetica');

      // Title
      doc
        .fontSize(16)
        .font('Helvetica-Bold')
        .text(title.toUpperCase(), { align: 'center' });

      doc.moveDown();
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke();
      doc.moveDown(0.5);

      // Body
      doc.fontSize(12).font('Helvetica').text(content, { lineGap: 4 });

      doc.end();
    });
  }

  private async generateDocxBuffer(title: string, content: string): Promise<Buffer> {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import('docx');

    const contentParagraphs = content
      .split('\n')
      .map(
        (line) =>
          new Paragraph({
            children: [new TextRun({ text: line, size: 24 })],
            spacing: { after: 120 },
          }),
      );

    const docxDoc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              text: title,
              heading: HeadingLevel.HEADING_1,
              spacing: { after: 300 },
            }),
            ...contentParagraphs,
          ],
        },
      ],
    });

    return Packer.toBuffer(docxDoc);
  }
}
