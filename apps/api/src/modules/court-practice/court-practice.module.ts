import { Module } from '@nestjs/common';

import { OcrModule } from '../ocr/ocr.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { CourtPracticeService } from './court-practice.service';
import { CourtPracticeController } from './court-practice.controller';

@Module({
  imports: [OcrModule, SubscriptionsModule],
  controllers: [CourtPracticeController],
  providers: [CourtPracticeService],
  exports: [CourtPracticeService],
})
export class CourtPracticeModule {}
