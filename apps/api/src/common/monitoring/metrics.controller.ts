import { Controller, Get, Header } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';

import { Public } from '../decorators/public.decorator';
import { RawResponse } from '../decorators/raw-response.decorator';
import { MetricsService } from './metrics.service';

/**
 * Prometheus scrape endpointi. Standart konvertga o'ralmaydi va autentifikatsiya
 * talab qilmaydi (odatda ichki tarmoq/nginx orqali cheklanadi).
 */
@ApiExcludeController()
@Controller('metrics')
export class MetricsController {
  constructor(private readonly metrics: MetricsService) {}

  @Get()
  @Public()
  @RawResponse()
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  getMetrics(): Promise<string> {
    return this.metrics.metrics();
  }
}
