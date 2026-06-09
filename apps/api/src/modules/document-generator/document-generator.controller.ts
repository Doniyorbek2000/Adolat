import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { DocumentGeneratorService } from './document-generator.service';
import { CreateGeneratedDocumentDto } from './dto/create-generated-document.dto';

@ApiTags('Documents — Generator')
@ApiBearerAuth()
@Controller('generated-documents')
export class DocumentGeneratorController {
  constructor(private readonly generatorService: DocumentGeneratorService) {}

  @Get('types')
  @ApiOperation({ summary: "Mavjud hujjat turlari va ularning forma maydonlarini olish" })
  @ApiResponse({ status: 200, description: 'Hujjat turlari ro\'yxati' })
  getDocumentTypes() {
    return this.generatorService.getDocumentTypes();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Yangi hujjat generatsiya qilish (AI orqali)" })
  @ApiResponse({ status: 201, description: 'Hujjat yaratildi' })
  create(@CurrentUser() user: RequestUser, @Body() dto: CreateGeneratedDocumentDto) {
    return this.generatorService.create(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "Foydalanuvchining barcha generatsiya qilingan hujjatlarini olish" })
  @ApiResponse({ status: 200, description: "Hujjatlar ro'yxati" })
  getDocuments(@CurrentUser() user: RequestUser) {
    return this.generatorService.getDocuments(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Generatsiya qilingan hujjatni olish' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 200, description: 'Hujjat' })
  @ApiResponse({ status: 404, description: 'Hujjat topilmadi' })
  getDocument(@CurrentUser() user: RequestUser, @Param('id') docId: string) {
    return this.generatorService.getDocument(user.id, docId);
  }

  @Get(':id/export-pdf')
  @ApiOperation({ summary: 'Hujjatni PDF formatida yuklab olish' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiProduces('application/pdf')
  @ApiResponse({ status: 200, description: 'PDF fayl' })
  async exportPdf(
    @CurrentUser() user: RequestUser,
    @Param('id') docId: string,
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.generatorService.exportPdf(user.id, docId);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="document-${docId}.pdf"`,
      'Content-Length': pdfBuffer.length.toString(),
    });

    res.end(pdfBuffer);
  }

  @Get(':id/export-docx')
  @ApiOperation({ summary: 'Hujjatni DOCX formatida yuklab olish' })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiProduces('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
  @ApiResponse({ status: 200, description: 'DOCX fayl' })
  async exportDocx(
    @CurrentUser() user: RequestUser,
    @Param('id') docId: string,
    @Res() res: Response,
  ) {
    const docxBuffer = await this.generatorService.exportDocx(user.id, docId);

    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="document-${docId}.docx"`,
      'Content-Length': docxBuffer.length.toString(),
    });

    res.end(docxBuffer);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Hujjatni o'chirish (soft delete)" })
  @ApiParam({ name: 'id', description: 'Document UUID' })
  @ApiResponse({ status: 204, description: "Hujjat o'chirildi" })
  async deleteDocument(@CurrentUser() user: RequestUser, @Param('id') docId: string) {
    await this.generatorService.delete(user.id, docId);
  }
}
