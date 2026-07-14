import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { EmailModule } from '../email/email.module';

import { AuthController } from './auth.controller';
import { SocialAuthController } from './social/social-auth.controller';
import { SocialAuthService } from './social/social-auth.service';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';

@Module({
  imports: [
    PassportModule,
    // Aniq secret/expiresIn AuthService'da har bir signAsync chaqiruvida
    // (access va refresh uchun alohida) ko'rsatiladi — shu sababli bu yerda bo'sh ro'yxatdan o'tkaziladi.
    JwtModule.register({}),
    EmailModule,
  ],
  controllers: [AuthController, SocialAuthController],
  providers: [AuthService, TwoFactorService, SocialAuthService, JwtAccessStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
