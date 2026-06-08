import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';

import { LogoutAllSessionsDto } from './dto/logout-all-sessions.dto';
import { SessionsService } from './sessions.service';

const buildContext = (req: Request) => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress =
    typeof forwardedFor === 'string' && forwardedFor.length > 0
      ? forwardedFor.split(',')[0].trim()
      : (req.ip ?? null);

  return { ipAddress, userAgent: req.headers['user-agent'] ?? null };
};

@ApiTags('Sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  @ApiOperation({ summary: "Foydalanuvchining barcha faol sessiyalari ro'yxati" })
  @ApiResponse({ status: 200, description: "Faol sessiyalar ro'yxati (joriy sessiya belgilab qaytariladi)" })
  list(@CurrentUser() user: RequestUser) {
    return this.sessionsService.listSessions(user.id, user.sessionId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Bitta sessiyani bekor qilish' })
  @ApiResponse({ status: 200, description: 'Sessiya bekor qilindi' })
  revoke(@Param('id') id: string, @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.sessionsService.revokeSession(user.id, id, buildContext(req));
  }

  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Barcha sessiyalardan chiqish (ixtiyoriy ravishda joriy sessiyani ham qo'shib)" })
  @ApiResponse({ status: 200, description: 'Sessiyalar bekor qilindi' })
  logoutAll(@Body() dto: LogoutAllSessionsDto, @CurrentUser() user: RequestUser, @Req() req: Request) {
    return this.sessionsService.revokeAllSessions(
      user.id,
      user.sessionId,
      dto.includeCurrent ?? false,
      buildContext(req),
    );
  }
}
