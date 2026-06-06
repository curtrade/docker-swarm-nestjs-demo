import { Global, Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { PrismaService } from './prisma.service';

/**
 * Глобальный модуль БД: делает PrismaService доступным везде без повторных
 * импортов и регистрирует глобальный фильтр ошибок Prisma. Без forRoot() —
 * настройки подключения приходят из DATABASE_URL в schema.prisma.
 */
@Global()
@Module({
  providers: [
    PrismaService,
    {
      provide: APP_FILTER,
      useClass: PrismaExceptionFilter,
    },
  ],
  exports: [PrismaService],
})
export class PrismaModule {}
