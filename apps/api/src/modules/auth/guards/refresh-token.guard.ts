import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** `/auth/refresh` endpointi uchun: refresh tokenni `jwt-refresh` strategiyasi orqali tekshiradi. */
@Injectable()
export class RefreshTokenGuard extends AuthGuard('jwt-refresh') {}
