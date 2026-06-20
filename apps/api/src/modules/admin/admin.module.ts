import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { IngestionModule } from '../ingestion/ingestion.module';
import { SupportModule } from '../support/support.module';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';
import { LegalDocumentService } from './legal-document.service';

@Module({
  imports: [NotificationsModule, IngestionModule, SupportModule],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService, LegalDocumentService],
  exports: [AdminAnalyticsService, LegalDocumentService],
})
export class AdminModule {}
