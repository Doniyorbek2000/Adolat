import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('me')
  @ApiOperation({ summary: 'Joriy foydalanuvchining dashboard ma\'lumotlari' })
  @ApiResponse({ status: 200, description: 'Dashboard data: user, subscription, usage, recent chats/documents, alerts' })
  getMyDashboard(@CurrentUser() user: RequestUser) {
    return this.dashboardService.getMyDashboard(user.id);
  }
}
