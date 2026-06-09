import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  DefaultValuePipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { AuditAction, NotificationType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';
import { LegalDocumentService } from './legal-document.service';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';

// ─── DTOs ───────────────────────────────────────────────────────────────────

class UpdateSettingDto {
  @ApiProperty({ description: 'New value for the setting (any JSON-compatible value)' })
  value!: unknown;
}

class BulkNotificationDto {
  @ApiProperty({ type: [String], description: 'List of user UUIDs to notify' })
  @IsArray()
  @IsUUID('4', { each: true })
  userIds!: string[];

  @ApiProperty({ enum: NotificationType })
  @IsEnum(NotificationType)
  type!: NotificationType;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  title!: string;

  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  body!: string;
}

// ─── Controller ──────────────────────────────────────────────────────────────

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminAnalyticsController {
  constructor(
    private readonly adminService: AdminAnalyticsService,
    private readonly legalDocumentService: LegalDocumentService,
  ) {}

  // ── Analytics ──────────────────────────────────────────────────

  @Get('analytics/overview')
  @ApiOkResponse({ description: 'Platform overview analytics' })
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('analytics/ai')
  @ApiOkResponse({ description: 'AI usage analytics' })
  getAiAnalytics() {
    return this.adminService.getAiAnalytics();
  }

  // ── Users ──────────────────────────────────────────────────────

  @Get('users')
  @ApiOkResponse({ description: 'Paginated user list' })
  getUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.getUsers(page, limit, search);
  }

  @Patch('users/:id/block')
  @ApiOkResponse({ description: 'User blocked' })
  blockUser(
    @CurrentUser() admin: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.blockUser(admin.id, id);
  }

  @Patch('users/:id/unblock')
  @ApiOkResponse({ description: 'User unblocked' })
  unblockUser(
    @CurrentUser() admin: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminService.unblockUser(admin.id, id);
  }

  // ── Audit Logs ─────────────────────────────────────────────────

  @Get('audit-logs')
  @ApiOkResponse({ description: 'Paginated audit logs' })
  getAuditLogs(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
    @Query('userId') userId?: string,
    @Query('adminId') adminId?: string,
    @Query('action') action?: AuditAction,
    @Query('entityType') entityType?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.adminService.getAuditLogs(
      {
        userId,
        adminId,
        action,
        entityType,
        from: from ? new Date(from) : undefined,
        to: to ? new Date(to) : undefined,
      },
      page,
      limit,
    );
  }

  // ── Settings ───────────────────────────────────────────────────

  @Get('settings')
  @ApiOkResponse({ description: 'All system settings' })
  getSettings() {
    return this.adminService.getSettings();
  }

  @Patch('settings/:key')
  @ApiOkResponse({ description: 'Setting updated' })
  updateSetting(
    @CurrentUser() admin: RequestUser,
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
  ) {
    return this.adminService.updateSetting(key, dto.value, admin.id);
  }

  // ── Bulk Notifications ─────────────────────────────────────────

  @Post('notifications/send')
  @ApiCreatedResponse({ description: 'Bulk notification sent' })
  sendBulkNotification(
    @CurrentUser() admin: RequestUser,
    @Body() dto: BulkNotificationDto,
  ) {
    return this.adminService.sendBulkNotification(
      admin.id,
      dto.userIds,
      dto.type,
      dto.title,
      dto.body,
    );
  }

  // ── Legal Documents ────────────────────────────────────────────

  @Post('legal-documents')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Qonun hujjatini qo'lda kiritish va indekslashni boshlash" })
  @ApiCreatedResponse({ description: 'Hujjat saqlandi, indekslash jarayoni boshlandi (PENDING)' })
  createLegalDocument(
    @CurrentUser() admin: RequestUser,
    @Body() dto: CreateLegalDocumentDto,
  ) {
    return this.legalDocumentService.create(dto, admin.id);
  }

  @Get('legal-documents')
  @ApiOperation({ summary: "Barcha qo'lda kiritilgan hujjatlar ro'yxati (status bilan)" })
  @ApiOkResponse({ description: "Hujjatlar ro'yxati" })
  getLegalDocuments() {
    return this.legalDocumentService.findAll();
  }

  @Post('legal-documents/:id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Muvaffaqiyatsiz indekslashni qayta urinish' })
  @ApiParam({ name: 'id', description: 'LegalSourceVersion UUID' })
  @ApiOkResponse({ description: 'Qayta indekslash boshlandi' })
  retryIndexing(@Param('id', ParseUUIDPipe) id: string) {
    return this.legalDocumentService.retryIndexing(id);
  }

  @Delete('legal-documents/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Hujjatni va uning chunklarini o'chirish" })
  @ApiParam({ name: 'id', description: 'LegalSourceVersion UUID' })
  @ApiNoContentResponse({ description: "Hujjat o'chirildi" })
  async deleteLegalDocument(@Param('id', ParseUUIDPipe) id: string) {
    await this.legalDocumentService.deleteDocument(id);
  }
}
