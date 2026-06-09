import { Module } from '@nestjs/common';

import { PlansController } from './plans.controller';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { UsageController } from './usage.controller';

@Module({
  controllers: [PlansController, SubscriptionsController, UsageController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
