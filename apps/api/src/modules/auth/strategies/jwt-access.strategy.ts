import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AppSettings } from '../../../config/app.config';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuthUser } from '../types/auth-user.type';
import { AccessTokenPayload } from '../types/token-payload.type';

@Injectable()
export class JwtAccessStrategy extends PassportStrategy(Strategy, 'jwt-access') {
  constructor(
    configService: ConfigService<{ app: AppSettings }, true>,
    private readonly prisma: PrismaService,
  ) {
    const { jwt } = configService.get('app', { infer: true });
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.accessSecret,
    });
  }

  /**
   * Token imzosi va muddati passport-jwt tomonidan tekshirilgandan so'ng chaqiriladi.
   * Bu yerda qo'shimcha ravishda foydalanuvchi va sessiyaning hali ham faol
   * ekanligi tekshiriladi — bloklangan/o'chirilgan foydalanuvchi yoki revoke
   * qilingan sessiya bilan eski access tokenlardan foydalanib bo'lmaydi.
   */
  async validate(payload: AccessTokenPayload): Promise<AuthUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Yaroqsiz token turi');
    }

    const [user, session] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: payload.sub } }),
      this.prisma.session.findUnique({ where: { id: payload.sessionId } }),
    ]);

    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki faol emas');
    }

    if (!session || session.status !== 'ACTIVE') {
      throw new UnauthorizedException('Sessiya yaroqsiz yoki tugatilgan');
    }

    return {
      id: user.id,
      sessionId: session.id,
      roles: payload.roles,
    };
  }
}
