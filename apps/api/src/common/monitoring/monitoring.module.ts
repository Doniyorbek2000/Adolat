import { Global, Module } from '@nestjs/common';

import { MetricsService } from './metrics.service';
import { MetricsController } from './metrics.controller';

/**
 * Monitoring: Prometheus metrikalari (`/metrics`). Sentry main.ts'da ishga
 * tushiriladi (SENTRY_DSN berilganda).
 */
@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService],
  exports: [MetricsService],
})
export class MonitoringModule {}
