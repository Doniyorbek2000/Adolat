import { Module } from '@nestjs/common';

import { OcrModule } from '../ocr/ocr.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ContractRiskService } from './contract-risk.service';
import { ContractAnalyzerController } from './contract-analyzer.controller';

@Module({
  imports: [OcrModule, SubscriptionsModule],
  controllers: [ContractAnalyzerController],
  providers: [ContractRiskService],
  exports: [ContractRiskService],
})
export class ContractAnalyzerModule {}
