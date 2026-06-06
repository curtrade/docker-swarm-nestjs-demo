import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Глобальная валидация DTO: лишние поля отсекаются, типы приводятся.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // На step-00 порт берётся напрямую из окружения с дефолтом.
  // В главе 01 (step-01) это заменяется типизированным конфигом через Configify.
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

void bootstrap();
