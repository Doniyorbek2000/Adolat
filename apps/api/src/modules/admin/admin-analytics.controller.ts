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
import { SupportService } from '../support/support.service';
import { PromoService } from '../promo/promo.service';
import { CreateLegalDocumentDto } from './dto/create-legal-document.dto';
import { CreatePromoCodeDto, UpdatePromoCodeDto } from '../promo/dto/create-promo-code.dto';

// ─── DTOs ───────────────────────────────────────────────────────────────────

class UpdateSettingDto {
  @ApiProperty({ description: 'New value for the setting (any JSON-compatible value)' })
  value!: unknown;
}

class BulkNotificationDto {
  @ApiPropertyOptional({ type: [String], description: 'User UUIDs to notify (empty = broadcast to all)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  userIds?: string[];

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

class AdminReplyDto {
  @ApiProperty({ minLength: 1 })
  @IsString()
  @MinLength(1)
  body!: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminAnalyticsController {
  constructor(
    private readonly adminService: AdminAnalyticsService,
    private readonly legalDocumentService: LegalDocumentService,
    private readonly supportService: SupportService,
    private readonly promoService: PromoService,
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

  // ── Notifications ───────────────────────────────────────────────

  @Get('notifications')
  @ApiOkResponse({ description: 'Recent admin-sent notifications' })
  getAdminNotifications(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getAdminNotifications(page, limit);
  }

  @Post('notifications/bulk')
  @ApiCreatedResponse({ description: 'Bulk notification sent' })
  sendBulkNotification(
    @CurrentUser() admin: RequestUser,
    @Body() dto: BulkNotificationDto,
  ) {
    return this.adminService.sendBulkNotification(
      admin.id,
      dto.userIds ?? [],
      dto.type,
      dto.title,
      dto.body,
    );
  }

  // ── Support Tickets (Admin) ─────────────────────────────────────

  @Get('support/tickets')
  @ApiOkResponse({ description: 'All support tickets' })
  getSupportTickets(
    @Query('status') status?: string,
    @Query('priority') priority?: string,
  ) {
    return this.supportService.getAllTickets({
      status: status as never,
      priority: priority as never,
    });
  }

  @Get('support/tickets/:id')
  @ApiOkResponse({ description: 'Support ticket detail with messages' })
  getSupportTicketDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.supportService.getTicketAsAdmin(id);
  }

  @Patch('support/tickets/:id')
  @ApiOkResponse({ description: 'Support ticket updated' })
  updateSupportTicket(
    @CurrentUser() admin: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: { status?: string; priority?: string },
  ) {
    return this.supportService.updateTicket(admin.id, id, dto as never);
  }

  @Post('support/tickets/:id/reply')
  @ApiCreatedResponse({ description: 'Admin reply sent' })
  adminReplyToTicket(
    @CurrentUser() admin: RequestUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminReplyDto,
  ) {
    return this.supportService.adminReply(admin.id, id, dto.body);
  }

  // ── Promo Codes ────────────────────────────────────────────────

  @Get('promo-codes')
  @ApiOkResponse({ description: 'All promo codes' })
  getPromoCodes(@CurrentUser() admin: RequestUser) {
    return this.promoService.findAll(admin.id);
  }

  @Post('promo-codes')
  @ApiCreatedResponse({ description: 'Promo code created' })
  createPromoCode(
    @CurrentUser() admin: RequestUser,
    @Body() dto: CreatePromoCodeDto,
  ) {
    return this.promoService.create(dto, admin.id);
  }

  @Patch('promo-codes/:id')
  @ApiOkResponse({ description: 'Promo code updated' })
  updatePromoCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromoCodeDto,
  ) {
    return this.promoService.update(id, dto);
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
