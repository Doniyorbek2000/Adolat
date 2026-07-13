import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { MetricsService } from './metrics.service';

/** Har bir HTTP so'rov davomiyligini Prometheus histogrammasiga yozadi. */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') {
      return next.handle();
    }
    const start = process.hrtime.bigint();
    const req = context.switchToHttp().getRequest<Request>();
    // Route path (parametrlashtirilgan) yoki oddiy url — kardinallikni cheklaydi
    const route =
      (req.route as { path?: string } | undefined)?.path ?? req.baseUrl ?? req.path ?? 'unknown';
    const method = req.method;

    const record = () => {
      const res = context.switchToHttp().getResponse<{ statusCode: number }>();
      const seconds = Number(process.hrtime.bigint() - start) / 1e9;
      this.metrics.observe(method, route, res.statusCode, seconds);
    };

    return next.handle().pipe(tap({ next: record, error: record }));
  }
}
