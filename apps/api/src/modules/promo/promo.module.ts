import { Module } from '@nestjs/common';

import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { PromoController } from './promo.controller';
import { PromoService } from './promo.service';

@Module({
  imports: [SubscriptionsModule],
  controllers: [PromoController],
  providers: [PromoService],
  exports: [PromoService],
})
export class PromoModule {}
