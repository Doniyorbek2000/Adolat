import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { ChangePlanDto } from './dto/change-plan.dto';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('current')
  @ApiOkResponse({ description: "User's current active subscription with plan details" })
  getCurrentSubscription(@CurrentUser() user: RequestUser) {
    return this.subscriptionsService.getCurrentSubscription(user.id);
  }

  @Post('change-plan')
  @ApiOkResponse({ description: 'Invoice created for plan change' })
  changePlan(
    @CurrentUser() user: RequestUser,
    @Body() dto: ChangePlanDto,
  ) {
    return this.subscriptionsService.createInvoiceForPlan(user.id, dto.planId);
  }
}
