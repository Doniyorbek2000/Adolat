import { BadRequestException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

import { AuthService } from '../auth.service';
import { AuthResponse } from '../types/auth-response.type';
import { RequestContext } from '../auth.service';

/**
 * Ijtimoiy autentifikatsiya: Google (ID-token tekshiruvi) va OneID (OAuth2
 * authorization-code). Ikkalasi ham AuthService.socialLogin() ga ulanadi.
 * Kalitlar bo'lmasa tegishli usul o'chirilgan holatda qoladi.
 */
@Injectable()
export class SocialAuthService {
  private readonly logger = new Logger(SocialAuthService.name);
  private readonly googleClientId: string;
  private readonly googleClient: OAuth2Client | null;

  private readonly oneId: {
    clientId: string;
    clientSecret: string;
    authUrl: string;
    tokenUrl: string;
    userinfoUrl: string;
    redirectUri: string;
    scope: string;
  };

  constructor(
    private readonly config: ConfigService,
    private readonly authService: AuthService,
  ) {
    this.googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    this.googleClient = this.googleClientId ? new OAuth2Client(this.googleClientId) : null;

    this.oneId = {
      clientId: this.config.get<string>('ONEID_CLIENT_ID', ''),
      clientSecret: this.config.get<string>('ONEID_CLIENT_SECRET', ''),
      authUrl: this.config.get<string>('ONEID_AUTH_URL', 'https://sso.egov.uz/sso/oauth/Authorization.do'),
      tokenUrl: this.config.get<string>('ONEID_TOKEN_URL', 'https://sso.egov.uz/sso/oauth/Authorization.do'),
      userinfoUrl: this.config.get<string>('ONEID_USERINFO_URL', 'https://sso.egov.uz/sso/oauth/Authorization.do'),
      redirectUri: this.config.get<string>('ONEID_REDIRECT_URI', ''),
      scope: this.config.get<string>('ONEID_SCOPE', 'myportal'),
    };
  }

  // ─── Google ─────────────────────────────────────────────────────────────────

  /** Mobil/web Google Sign-In'dan olingan ID-token'ni tekshiradi va login qiladi. */
  async googleLogin(idToken: string, context: RequestContext): Promise<AuthResponse> {
    if (!this.googleClient) {
      throw new ServiceUnavailableException('Google login sozlanmagan (GOOGLE_CLIENT_ID)');
    }
    if (!idToken) throw new BadRequestException('idToken talab qilinadi');

    let payload;
    try {
      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: this.googleClientId,
      });
      payload = ticket.getPayload();
    } catch (err) {
      this.logger.warn(`Google ID-token tekshiruvi muvaffaqiyatsiz: ${(err as Error).message}`);
      throw new UnauthorizedException('Google token yaroqsiz');
    }

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Google email tasdiqlanmagan');
    }

    return this.authService.socialLogin(
      {
        email: payload.email,
        firstName: payload.given_name ?? null,
        lastName: payload.family_name ?? null,
        provider: 'google',
      },
      context,
    );
  }

  // ─── OneID ──────────────────────────────────────────────────────────────────

  get isOneIdConfigured(): boolean {
    return Boolean(this.oneId.clientId && this.oneId.clientSecret && this.oneId.redirectUri);
  }

  /** OneID authorize sahifasiga yo'naltirish uchun URL. */
  oneIdAuthUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'one_code',
      client_id: this.oneId.clientId,
      redirect_uri: this.oneId.redirectUri,
      scope: this.oneId.scope,
      state,
    });
    return `${this.oneId.authUrl}?${params.toString()}`;
  }

  /** OneID callback: code'ni token'ga almashtirib, foydalanuvchi ma'lumotini oladi. */
  async oneIdLogin(code: string, context: RequestContext): Promise<AuthResponse> {
    if (!this.isOneIdConfigured) {
      throw new ServiceUnavailableException('OneID sozlanmagan');
    }
    if (!code) throw new BadRequestException('code talab qilinadi');

    // 1. Token/foydalanuvchi ma'lumotini olish (OneID access_token bilan userinfo qaytaradi)
    const tokenBody = new URLSearchParams({
      grant_type: 'one_authorization_code',
      client_id: this.oneId.clientId,
      client_secret: this.oneId.clientSecret,
      redirect_uri: this.oneId.redirectUri,
      code,
    });

    const info = await this.oneIdFetch(tokenBody);

    const email = (info.email as string) || (info.user_id ? `${info.user_id}@oneid.uz` : '');
    if (!email) throw new UnauthorizedException("OneID ma'lumotidan email olinmadi");

    return this.authService.socialLogin(
      {
        email,
        firstName: (info.first_name as string) ?? (info.given_name as string) ?? null,
        lastName: (info.sur_name as string) ?? (info.family_name as string) ?? null,
        provider: 'oneid',
      },
      context,
    );
  }

  private async oneIdFetch(body: URLSearchParams): Promise<Record<string, unknown>> {
    const response = await fetch(this.oneId.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      this.logger.error(`OneID HTTP ${response.status}: ${await response.text()}`);
      throw new ServiceUnavailableException('OneID vaqtincha ishlamayapti');
    }
    return (await response.json()) as Record<string, unknown>;
  }
}
