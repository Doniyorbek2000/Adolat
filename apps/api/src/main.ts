import 'reflect-metadata';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded } from 'express';
import { AppModule } from './app.module';
import { AppSettings } from './config/app.config';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { initSentry } from './common/monitoring/sentry.util';
import { MetricsService } from './common/monitoring/metrics.service';
import { MetricsInterceptor } from './common/monitoring/metrics.interceptor';

const REQUEST_BODY_SIZE_LIMIT = '10mb';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService<{ app: AppSettings }, true>);
  const appSettings = configService.get('app', { infer: true });

  // --- Sentry (SENTRY_DSN berilgan bo'lsa) ---
  if (initSentry(process.env.SENTRY_DSN, process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? 'production')) {
    Logger.log('Sentry yoqildi', 'Bootstrap');
  }

  // --- Security headers & request hardening ---
  app.use(helmet());
  app.use(compression());
  app.use(json({ limit: REQUEST_BODY_SIZE_LIMIT }));
  app.use(urlencoded({ extended: true, limit: REQUEST_BODY_SIZE_LIMIT }));

  // --- CORS: faqat .env orqali ruxsat etilgan originlar (mobil/admin/frontend) ---
  app.enableCors({
    origin: appSettings.corsOrigins.length > 0 ? appSettings.corsOrigins : false,
    credentials: true,
  });

  app.setGlobalPrefix(appSettings.apiPrefix);

  // --- Global validation: noma'lum maydonlarni rad etadi, DTO'larga moslab transform qiladi ---
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // --- Yagona javob va xato formatlari ---
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new MetricsInterceptor(app.get(MetricsService)),
    new LoggingInterceptor(),
    new ResponseInterceptor(app.get(Reflector)),
  );

  // --- Swagger / OpenAPI ---
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Adolat AI API')
    .setDescription('Professional legal-tech SaaS API for Uzbekistan legal AI platform.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(appSettings.port);

  const logger = new Logger('Bootstrap');
  logger.log(`Adolat AI API ${appSettings.port}-portda ishga tushdi (prefix: /${appSettings.apiPrefix})`);
  logger.log(`Swagger docs: http://localhost:${appSettings.port}/api/docs`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Backend ishga tushmadi:', error);
  process.exit(1);
});
