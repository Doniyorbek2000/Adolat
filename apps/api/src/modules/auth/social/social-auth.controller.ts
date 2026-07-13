import { Body, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';

import { Public } from '../../../common/decorators/public.decorator';
import { RequestContext } from '../auth.service';
import { GoogleLoginDto } from './dto/google-login.dto';
import { SocialAuthService } from './social-auth.service';

function buildContext(req: Request): RequestContext {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress =
    typeof forwardedFor === 'string' && forwardedFor.length > 0
      ? forwardedFor.split(',')[0].trim()
      : (req.ip ?? null);
  return { ipAddress, userAgent: req.headers['user-agent'] ?? null };
}

@ApiTags('auth')
@Controller('auth')
export class SocialAuthController {
  constructor(private readonly social: SocialAuthService) {}

  @Public()
  @Post('google')
  @ApiOperation({ summary: 'Google ID-token orqali kirish (mobil/web Google Sign-In)' })
  async google(@Body() dto: GoogleLoginDto, @Req() req: Request) {
    const data = await this.social.googleLogin(dto.idToken, buildContext(req));
    return { message: 'Google orqali kirildi', data };
  }

  @Public()
  @Get('oneid')
  @ApiOperation({ summary: 'OneID authorize sahifasiga yo\'naltirish' })
  oneIdRedirect(@Query('state') state: string | undefined, @Res() res: Response): void {
    const url = this.social.oneIdAuthUrl(state ?? 'adolat');
    res.redirect(url);
  }

  @Public()
  @Get('oneid/callback')
  @ApiOperation({ summary: 'OneID callback — code\'ni tokenlarga almashtiradi' })
  async oneIdCallback(@Query('code') code: string, @Req() req: Request) {
    const data = await this.social.oneIdLogin(code, buildContext(req));
    return { message: 'OneID orqali kirildi', data };
  }
}
