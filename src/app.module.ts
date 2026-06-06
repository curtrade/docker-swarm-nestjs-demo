import { ConfigifyModule } from '@itgorillaz/configify';
import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ObservabilityController } from './observability/observability.controller';
import { SharedStateModule } from './shared-state/shared-state.module';

/**
 * Корневой модуль.
 *
 * ConfigifyModule.forRootAsync() подключает типизированный конфиг и
 * авто-обнаруживает все @Configuration()-классы (AppConfiguration и др.).
 * По мере курса сюда добавятся модули общего состояния, notes, метрик и т.д.
 */
@Module({
  imports: [ConfigifyModule.forRootAsync(), SharedStateModule],
  controllers: [ObservabilityController, HealthController],
  providers: [],
})
export class AppModule {}
