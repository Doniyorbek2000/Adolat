import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { FilesService } from './files.service';

@ApiTags('Files')
@ApiBearerAuth()
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 },
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Yuklanadigan fayl (max 50MB)' },
      },
    },
  })
  @ApiOperation({ summary: 'Fayl yuklash (PDF, DOCX, TXT, audio)' })
  @ApiResponse({ status: 201, description: 'Fayl muvaffaqiyatli yuklandi' })
  @ApiResponse({ status: 400, description: "Noto'g'ri fayl turi yoki hajmi" })
  async upload(
    @CurrentUser() user: RequestUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new Error("Fayl yuklanmagan. 'file' maydonini multipart/form-data bilan yuboring.");
    }
    return this.filesService.upload(user.id, file);
  }

  @Get()
  @ApiOperation({ summary: "Foydalanuvchining barcha fayllarini olish" })
  @ApiResponse({ status: 200, description: 'Fayllar ro\'yxati' })
  getFiles(@CurrentUser() user: RequestUser) {
    return this.filesService.getFiles(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fayl metadatasini olish' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'Fayl malumoti' })
  @ApiResponse({ status: 404, description: 'Fayl topilmadi' })
  getFile(@CurrentUser() user: RequestUser, @Param('id') fileId: string) {
    return this.filesService.getFile(user.id, fileId);
  }

  @Get(':id/signed-url')
  @ApiOperation({ summary: 'Faylni yuklab olish uchun imzolangan URL olish (1 soat)' })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({ status: 200, description: 'Imzolangan URL' })
  getSignedUrl(@CurrentUser() user: RequestUser, @Param('id') fileId: string) {
    return this.filesService.getSignedUrl(user.id, fileId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Faylni o'chirish" })
  @ApiParam({ name: 'id', description: 'File UUID' })
  @ApiResponse({ status: 204, description: "Fayl o'chirildi" })
  async deleteFile(@CurrentUser() user: RequestUser, @Param('id') fileId: string) {
    await this.filesService.delete(user.id, fileId);
  }
}
