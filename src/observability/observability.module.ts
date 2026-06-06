import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { MetricsService } from './metrics.service';
import { ObservabilityController } from './observability.controller';

/**
 * Наблюдаемость: корневой endpoint, /metrics для Prometheus и глобальный
 * интерсептор, считающий HTTP-запросы.
 */
@Module({
  controllers: [ObservabilityController, MetricsController],
  providers: [
    MetricsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: MetricsInterceptor,
    },
  ],
})
export class ObservabilityModule {}
