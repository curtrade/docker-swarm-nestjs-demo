import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppConfiguration } from './config/app.config';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  // Глобальная валидация DTO: лишние поля отсекаются, типы приводятся.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Конфиг уже провалидирован configify на этапе NestFactory.create():
  // если бы PORT/APP_VERSION были невалидны, мы бы сюда не дошли.
  const config = app.get(AppConfiguration);
  await app.listen(config.port);
}

void bootstrap();
