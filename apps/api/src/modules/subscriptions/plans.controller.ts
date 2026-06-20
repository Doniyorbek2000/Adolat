import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { SubscriptionsService } from './subscriptions.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UpdatePlanDto } from './dto/update-plan.dto';

@ApiTags('plans')
@ApiBearerAuth()
@Controller('plans')
export class PlansController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get()
  @ApiOkResponse({ description: 'List of all active public subscription plans' })
  getPlans() {
    return this.subscriptionsService.getPublicPlans();
  }

  @Get(':id')
  @ApiOkResponse({ description: 'Subscription plan details' })
  getPlan(@Param('id', ParseUUIDPipe) id: string) {
    return this.subscriptionsService.getPlan(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiOkResponse({ description: 'Plan updated (admin only)' })
  updatePlan(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlanDto,
  ) {
    return this.subscriptionsService.updatePlan(id, dto);
  }
}
