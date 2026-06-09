import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';

import { ThrottlerBehindProxyGuard } from './common/guards/throttler-behind-proxy.guard';

import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import aiConfig from './config/ai.config';
import storageConfig from './config/storage.config';
import paymentConfig from './config/payment.config';
import { envValidationSchema } from './config/env.validation';

import { PrismaModule } from './database/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AiRouterModule } from './ai-router/ai-router.module';
import { AuditLogsModule } from './modules/audit-logs/audit-logs.module';
import { AuthModule } from './modules/auth/auth.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
      load: [appConfig, databaseConfig, redisConfig, aiConfig, storageConfig, paymentConfig],
    }),

    // Rate limiting tayyorgarligi — har bir IP uchun 60 soniyada 120 ta so'rov.
    // Auth bosqichida login/OTP endpointlari uchun qattiqroq @Throttle limitlari qo'shiladi.
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),

    // Database — Prisma + PostgreSQL (schema, migratsiyalar va seed shu bosqichda tayyorlandi).
    PrismaModule,

    HealthModule,
    AiRouterModule,
    AuditLogsModule,
    AuthModule,
    SessionsModule,
    DashboardModule,

    // Keyingi bosqichlarda shu yerga qo'shiladi:
    // UsersModule, SubscriptionsModule, PaymentsModule, ChatModule,
    // VoiceModule, FilesModule, DocumentAnalysisModule, DocumentGeneratorModule,
    // LegalSourcesModule, RagModule, NotificationsModule, SupportModule,
    // AnalyticsModule, AdminModule, SettingsModule, WebhooksModule
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerBehindProxyGuard,
    },
    // Global autentifikatsiya guard — standart holatda har bir endpoint Bearer
    // access token talab qiladi; @Public() bilan belgilanganlar chetlab o'tiladi.
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
