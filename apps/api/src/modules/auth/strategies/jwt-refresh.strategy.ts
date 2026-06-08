import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';

import { AppSettings } from '../../../config/app.config';
import { RefreshTokenUser } from '../types/auth-user.type';
import { RefreshTokenPayload } from '../types/token-payload.type';

const extractRefreshTokenFromBody = (req: Request): string | null => {
  const body = req.body as { refreshToken?: unknown } | undefined;
  return typeof body?.refreshToken === 'string' ? body.refreshToken : null;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService<{ app: AppSettings }, true>) {
    const { jwt } = configService.get('app', { infer: true });
    super({
      jwtFromRequest: extractRefreshTokenFromBody,
      ignoreExpiration: false,
      secretOrKey: jwt.refreshSecret,
      passReqToCallback: true,
    });
  }

  /**
   * Bu yerda faqat JWT imzosi/muddati va `type: 'refresh'` da'vosi tekshiriladi.
   * Tokenning DB'dagi hash bilan mosligi, revoke holati va sessiyaga tegishliligi
   * AuthService.refresh()da — biznes-mantiq darajasida — qayta tekshiriladi
   * (rotation va token-reuse himoyasi uchun).
   */
  validate(req: Request, payload: RefreshTokenPayload): RefreshTokenUser {
    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Yaroqsiz token turi');
    }

    const refreshToken = extractRefreshTokenFromBody(req);
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token taqdim etilmadi');
    }

    return {
      id: payload.sub,
      sessionId: payload.sessionId,
      tokenId: payload.tokenId,
      refreshToken,
    };
  }
}
