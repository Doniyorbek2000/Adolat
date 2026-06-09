import { Module } from '@nestjs/common';

import { NotificationsModule } from '../notifications/notifications.module';
import { AdminAnalyticsController } from './admin-analytics.controller';
import { AdminAnalyticsService } from './admin-analytics.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
  exports: [AdminAnalyticsService],
})
export class AdminModule {}
