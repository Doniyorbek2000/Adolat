import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Har bir HTTP so'rovni metod, yo'l, status kod va davomiylik bilan log qiladi.
 * Maxfiy maydonlar (parol, token va h.k.) hech qachon log qilinmaydi —
 * faqat metadata (method/url/status/duration) yoziladi.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const startedAt = Date.now();

    return next.handle().pipe(
      tap({
        next: () => this.log(request, response.statusCode, startedAt),
        error: (error: unknown) => {
          const statusCode = this.resolveErrorStatusCode(error);
          this.log(request, statusCode, startedAt);
        },
      }),
    );
  }

  private log(request: Request, statusCode: number, startedAt: number): void {
    const durationMs = Date.now() - startedAt;
    this.logger.log(`${request.method} ${request.originalUrl} ${statusCode} — ${durationMs}ms`);
  }

  private resolveErrorStatusCode(error: unknown): number {
    if (error && typeof error === 'object' && 'status' in error) {
      const status = (error as { status?: unknown }).status;
      if (typeof status === 'number') {
        return status;
      }
    }
    return 500;
  }
}
