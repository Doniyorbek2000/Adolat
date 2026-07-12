import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ClickProvider } from './providers/click.provider';
import { PaymeProvider } from './providers/payme.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PaymeMerchantService } from './payme/payme-merchant.service';
import { ClickMerchantService } from './click/click-merchant.service';

@Module({
  imports: [SubscriptionsModule, AuditLogsModule],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    ClickProvider,
    PaymeProvider,
    PaymeMerchantService,
    ClickMerchantService,
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
