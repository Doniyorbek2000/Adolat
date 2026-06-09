import { Module } from '@nestjs/common';

import { AuditLogsModule } from '../audit-logs/audit-logs.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ClickProvider } from './providers/click.provider';
import { PaymeProvider } from './providers/payme.provider';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

@Module({
  imports: [SubscriptionsModule, AuditLogsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ClickProvider, PaymeProvider],
  exports: [PaymentsService],
})
export class PaymentsModule {}
