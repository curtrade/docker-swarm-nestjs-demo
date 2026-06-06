import { ConfigifyModule } from '@itgorillaz/configify';
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { NotesModule } from './notes/notes.module';
import { ObservabilityController } from './observability/observability.controller';
import { PrismaModule } from './prisma/prisma.module';
import { SharedStateModule } from './shared-state/shared-state.module';

/**
 * Корневой модуль.
 *
 * ConfigifyModule.forRootAsync() подключает типизированный конфиг и
 * авто-обнаруживает все @Configuration()-классы. PrismaModule (@Global) даёт
 * доступ к БД, SharedStateModule — к Redis, NotesModule — ресурс notes.
 */
@Module({
  imports: [ConfigifyModule.forRootAsync(), PrismaModule, SharedStateModule, NotesModule],
  controllers: [ObservabilityController, HealthController],
  providers: [],
})
export class AppModule {}
