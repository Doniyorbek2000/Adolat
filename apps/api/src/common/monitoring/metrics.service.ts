import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Histogram, Registry } from 'prom-client';

/**
 * Prometheus metrikalari. Standart process/Node metrikalari + HTTP so'rov
 * davomiyligi histogrammasi. `/metrics` endpointi orqali ochiladi.
 */
@Injectable()
export class MetricsService {
  readonly registry = new Registry();
  readonly httpDuration: Histogram<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpDuration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP so\'rov davomiyligi (soniya)',
      labelNames: ['method', 'route', 'status'],
      buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
      registers: [this.registry],
    });
  }

  observe(method: string, route: string, status: number, seconds: number): void {
    this.httpDuration.observe({ method, route, status: String(status) }, seconds);
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  get contentType(): string {
    return this.registry.contentType;
  }
}
