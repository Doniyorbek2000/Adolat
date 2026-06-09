import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import { AuditAction, NotificationType } from '@prisma/client';
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { AdminAnalyticsService } from './admin-analytics.service';

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
@Controller('admin')
export class AdminAnalyticsController {
  constructor(private readonly adminService: AdminAnalyticsService) {}

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
}
