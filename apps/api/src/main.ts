import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const configService = app.get(ConfigService<AppConfig, true>);

  const port = configService.get('port', { infer: true });
  const globalPrefix = configService.get('globalPrefix', { infer: true });
  const corsOrigins = configService.get('corsOrigins', { infer: true });

  app.use(helmet());
  app.use(compression());
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : false,
    credentials: true,
  });

  app.setGlobalPrefix(globalPrefix);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Adolat AI API')
    .setDescription(
      "O'zbekiston bozori uchun huquqiy AI platformasi — backend REST API. " +
        'Barcha AI/to\'lov kalitlar faqat backendda saqlanadi.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, swaggerDocument);

  await app.listen(port);

  const logger = new Logger('Bootstrap');
  logger.log(`Adolat AI API ${port}-portda ishga tushdi (prefix: /${globalPrefix})`);
  logger.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Backend ishga tushmadi:', error);
  process.exit(1);
});
