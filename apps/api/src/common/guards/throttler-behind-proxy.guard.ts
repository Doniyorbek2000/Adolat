import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Standart ThrottlerGuard `req.ip`ni ishlatadi, lekin productionda backend
 * odatda reverse proxy (nginx/load balancer) ortida turadi — bu holda haqiqiy
 * mijoz IP manzili `X-Forwarded-For` headerida keladi. Shu guard shu holatni
 * to'g'ri hisobga oladi, aks holda barcha so'rovlar bitta IP sifatida ko'rinib,
 * rate-limit noto'g'ri ishlaydi.
 */
@Injectable()
export class ThrottlerBehindProxyGuard extends ThrottlerGuard {
  protected async getTracker(req: Request): Promise<string> {
    const forwardedFor = req.headers['x-forwarded-for'];
    if (typeof forwardedFor === 'string' && forwardedFor.length > 0) {
      return forwardedFor.split(',')[0].trim();
    }
    return req.ip ?? 'unknown';
  }
}
