import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags } from '@nestjs/swagger';

import { SubscriptionsService } from './subscriptions.service';

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
}
