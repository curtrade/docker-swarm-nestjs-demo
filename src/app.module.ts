import { ConfigifyModule } from '@itgorillaz/configify';
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { NotesModule } from './notes/notes.module';
import { ObservabilityModule } from './observability/observability.module';
import { PrismaModule } from './prisma/prisma.module';
import { SharedStateModule } from './shared-state/shared-state.module';

/**
 * Корневой модуль.
 *
 * ConfigifyModule.forRootAsync() подключает типизированный конфиг и
 * авто-обнаруживает все @Configuration()-классы. PrismaModule (@Global) — БД,
 * SharedStateModule — Redis, NotesModule — ресурс notes, ObservabilityModule —
 * корневой endpoint и /metrics.
 */
@Module({
  imports: [
    ConfigifyModule.forRootAsync(),
    PrismaModule,
    SharedStateModule,
    NotesModule,
    ObservabilityModule,
  ],
  controllers: [HealthController],
  providers: [],
})
export class AppModule {}
