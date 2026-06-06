import { Injectable } from '@nestjs/common';
import { collectDefaultMetrics, Counter, Registry } from 'prom-client';

/**
 * Сбор метрик приложения в формате Prometheus.
 *
 * Держит собственный Registry (не глобальный prom-client default), чтобы
 * несколько инстансов в тестах не конфликтовали. Регистрирует дефолтные метрики
 * процесса Node + счётчик HTTP-запросов.
 */
@Injectable()
export class MetricsService {
  private readonly registry = new Registry();
  private readonly httpRequests: Counter<string>;

  constructor() {
    collectDefaultMetrics({ register: this.registry });
    this.httpRequests = new Counter({
      name: 'http_requests_total',
      help: 'Всего HTTP-запросов',
      labelNames: ['method', 'route', 'status'],
      registers: [this.registry],
    });
  }

  incRequest(method: string, route: string, status: number): void {
    this.httpRequests.inc({ method, route, status: String(status) });
  }

  metrics(): Promise<string> {
    return this.registry.metrics();
  }

  contentType(): string {
    return this.registry.contentType;
  }
}
