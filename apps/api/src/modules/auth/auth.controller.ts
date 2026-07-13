import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';

import { CurrentUser, RequestUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

import { AuthService, RequestContext } from './auth.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenGuard } from './guards/refresh-token.guard';
import { RefreshTokenUser } from './types/auth-user.type';

const buildContext = (req: Request): RequestContext => {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ipAddress =
    typeof forwardedFor === 'string' && forwardedFor.length > 0
      ? forwardedFor.split(',')[0].trim()
      : (req.ip ?? null);

  return { ipAddress, userAgent: req.headers['user-agent'] ?? null };
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Yangi foydalanuvchini ro'yxatdan o'tkazish (telefon yoki email orqali)" })
  @ApiResponse({ status: 201, description: 'Tasdiqlash kodi yuborildi, OTP tasdiqlash kutilmoqda' })
  async register(@Body() dto: RegisterDto, @Req() req: Request) {
    const data = await this.authService.register(dto, buildContext(req));
    return { message: 'Tasdiqlash kodi yuborildi', data };
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'OTP kodni tasdiqlash — hisobni faollashtiradi va token beradi' })
  @ApiResponse({ status: 200, description: 'Access va refresh tokenlar qaytariladi' })
  verifyOtp(@Body() dto: VerifyOtpDto, @Req() req: Request) {
    return this.authService.verifyOtp(dto, buildContext(req));
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tasdiqlash kodini qayta yuborish (cooldown bilan)' })
  @ApiResponse({ status: 200, description: 'Tasdiqlash kodi qayta yuborildi (generic javob)' })
  resendOtp(@Body() dto: ResendOtpDto) {
    return this.authService.resendOtp(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telefon/email va parol orqali tizimga kirish' })
  @ApiResponse({ status: 200, description: 'Access va refresh tokenlar qaytariladi' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, buildContext(req));
  }

  @Public()
  @UseGuards(RefreshTokenGuard)
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh token orqali yangi access/refresh juftligini olish (rotation)' })
  @ApiResponse({
    status: 200,
    description: 'Yangi access va refresh tokenlar qaytariladi, eskisi bekor qilinadi',
  })
  refresh(@Body() dto: RefreshTokenDto, @CurrentUser() user: RefreshTokenUser, @Req() req: Request) {
    return this.authService.refresh(
      dto,
      { userId: user.id, sessionId: user.sessionId, tokenId: user.tokenId },
      buildContext(req),
    );
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Joriy sessiyadan chiqish — refresh tokenni va sessiyani bekor qiladi' })
  @ApiResponse({ status: 200, description: 'Tizimdan muvaffaqiyatli chiqildi' })
  logout(@Body() dto: LogoutDto, @Req() req: Request) {
    return this.authService.logout(dto, buildContext(req));
  }

  @Public()
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Parolni tiklash kodini so'rash (generic javob — hisob mavjudligini oshkor qilmaydi)",
  })
  @ApiResponse({ status: 200, description: 'Generic xabar qaytariladi' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Tasdiqlash kodi orqali yangi parol o'rnatish — barcha sessiyalarni tugatadi" })
  @ApiResponse({ status: 200, description: 'Parol muvaffaqiyatli yangilandi' })
  resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
    return this.authService.resetPassword(dto, buildContext(req));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Joriy autentifikatsiyalangan foydalanuvchi profili, obunasi va limitlari' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchi profili' })
  me(@CurrentUser() user: RequestUser) {
    return this.authService.me(user.id);
  }
}
