import {
  CanActivate,
  ExecutionContext,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestUser } from '../decorators/current-user.decorator';
import { USAGE_TYPE_KEY, UsageType } from '../decorators/usage-type.decorator';
import { SubscriptionsService } from '../../modules/subscriptions/subscriptions.service';

/**
 * Guard that enforces per-feature usage limits based on the user's active subscription.
 *
 * Usage:
 *   @UseGuards(UsageGuard)
 *   @UsageType('questionsUsed')
 *   async handler(...) {}
 *
 * The guard calls SubscriptionsService.checkAndIncrementUsage which:
 *  - throws ForbiddenException when the limit is reached
 *  - atomically increments the counter on success
 *
 * If no @UsageType decorator is present the guard passes through.
 */
@Injectable()
export class UsageGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const usageType = this.reflector.getAllAndOverride<UsageType | undefined>(USAGE_TYPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!usageType) {
      // No usage type configured — allow the request
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const user = request.user;

    if (!user?.id) {
      throw new InternalServerErrorException(
        'UsageGuard must be applied after JwtAuthGuard',
      );
    }

    // This throws ForbiddenException if the limit is reached, otherwise increments
    await this.subscriptionsService.checkAndIncrementUsage(user.id, usageType);

    return true;
  }
}
