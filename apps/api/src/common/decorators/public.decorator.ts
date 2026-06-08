import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Global JwtAuthGuard'ni chetlab o'tib, endpointni autentifikatsiyasiz ochiq qiladi
 * (masalan /auth/login, /auth/register, /health).
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
