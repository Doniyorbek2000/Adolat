import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { UsageGuard } from '../../common/guards/usage.guard';
import { UsageType } from '../../common/decorators/usage-type.decorator';
import { DocumentAnalyzerService } from './document-analyzer.service';
import { StartAnalysisDto } from './dto/start-analysis.dto';

@ApiTags('Documents — Analysis')
@ApiBearerAuth()
@Controller('documents')
export class DocumentAnalyzerController {
  constructor(private readonly analyzerService: DocumentAnalyzerService) {}

  @Post('analyze')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(UsageGuard)
  @UsageType('analysesUsed')
  @ApiOperation({
    summary: 'Hujjat tahlilini boshlash (asinxron). Status PENDING holida qaytariladi.',
  })
  @ApiResponse({ status: 201, description: 'Tahlil yaratildi (PENDING)' })
  @ApiResponse({ status: 402, description: 'Obuna limiti tugagan' })
  @ApiResponse({ status: 404, description: 'Fayl topilmadi' })
  startAnalysis(@CurrentUser() user: RequestUser, @Body() dto: StartAnalysisDto) {
    return this.analyzerService.startAnalysis(user.id, dto.fileId, dto.language);
  }

  @Get('analyses')
  @ApiOperation({ summary: "Foydalanuvchining barcha tahlillarini olish" })
  @ApiResponse({ status: 200, description: 'Tahlillar ro\'yxati' })
  getAnalyses(@CurrentUser() user: RequestUser) {
    return this.analyzerService.getAnalyses(user.id);
  }

  @Get('analyses/:id')
  @ApiOperation({ summary: 'Tahlil natijasini olish' })
  @ApiParam({ name: 'id', description: 'Analysis UUID' })
  @ApiResponse({ status: 200, description: 'Tahlil natijasi' })
  @ApiResponse({ status: 404, description: 'Tahlil topilmadi' })
  getAnalysis(@CurrentUser() user: RequestUser, @Param('id') analysisId: string) {
    return this.analyzerService.getAnalysis(user.id, analysisId);
  }

  @Delete('analyses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Tahlilni o'chirish" })
  @ApiParam({ name: 'id', description: 'Analysis UUID' })
  @ApiResponse({ status: 204, description: "Tahlil o'chirildi" })
  async deleteAnalysis(
    @CurrentUser() user: RequestUser,
    @Param('id') analysisId: string,
  ) {
    await this.analyzerService.deleteAnalysis(user.id, analysisId);
  }
}
