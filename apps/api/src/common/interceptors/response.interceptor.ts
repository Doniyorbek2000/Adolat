import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { RAW_RESPONSE_KEY } from '../decorators/raw-response.decorator';

export interface SuccessResponseBody<T> {
  success: true;
  data: T;
  message: string;
  timestamp: string;
}

const DEFAULT_MESSAGE = 'Muvaffaqiyatli';

/**
 * Barcha muvaffaqiyatli javoblarni yagona formatga keltiradi:
 * { success: true, data, message, timestamp }
 *
 * Controller handler `{ message, data }` shaklida obyekt qaytarsa, shu `message`
 * ishlatiladi (masalan "Ro'yxatdan o'tish muvaffaqiyatli"); aks holda standart
 * "Muvaffaqiyatli" xabari qo'llanadi va butun qaytarilgan qiymat `data` bo'ladi.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, SuccessResponseBody<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<SuccessResponseBody<T> | T> {
    // Xom javob kutgan endpointlar (masalan Payme JSON-RPC) — o'ramaymiz.
    const isRaw = this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isRaw) {
      return next.handle();
    }

    return next.handle().pipe(
      map((payload) => {
        const { message, data } = this.unwrap(payload);
        return {
          success: true as const,
          data,
          message,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private unwrap(payload: T): { message: string; data: T } {
    if (
      payload !== null &&
      typeof payload === 'object' &&
      'message' in (payload as Record<string, unknown>) &&
      'data' in (payload as Record<string, unknown>)
    ) {
      const candidate = payload as unknown as { message: unknown; data: T };
      if (typeof candidate.message === 'string') {
        return { message: candidate.message, data: candidate.data };
      }
    }

    return { message: DEFAULT_MESSAGE, data: payload };
  }
}
