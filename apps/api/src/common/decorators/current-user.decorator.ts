import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * JwtAccessStrategy.validate() natijasida `req.user`ga biriktiriladigan shakl.
 * Auth modulidagi `AuthUser` turi ham shu interfeysga mos keladi.
 */
export interface RequestUser {
  id: string;
  sessionId: string;
  roles: string[];
}

/**
 * Joriy autentifikatsiyalangan foydalanuvchini controller handler argumentiga olib beradi.
 * Misol: `me(@CurrentUser() user: RequestUser)`
 */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext): RequestUser => {
  const request = ctx.switchToHttp().getRequest<{ user: RequestUser }>();
  return request.user;
});
