import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { RequestUser } from '../decorators/current-user.decorator';

export const ROLES_KEY = 'roles';

/**
 * Joriy bosqichda ishlatilmaydi — admin/RBAC bosqichida `@Roles('ADMIN', ...)`
 * dekoratori bilan birga ulanadi. Hozircha har doim ruxsat beradi (placeholder),
 * `JwtAuthGuard`dan keyin global yoki route darajasida ulash uchun tayyor turibdi.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{ user?: RequestUser }>();
    const userRoles = request.user?.roles ?? [];

    return requiredRoles.some((role) => userRoles.includes(role));
  }
}
