import { Controller, Get } from '@nestjs/common';
import { hostname } from 'os';
import { AppConfiguration } from '../config/app.config';

/**
 * Корневой endpoint, делающий поведение Swarm наблюдаемым.
 *
 * Возвращает hostname контейнера (в Swarm это id задачи/контейнера) и версию.
 * Когда сервис масштабируется до нескольких реплик, серия запросов на `/`
 * возвращает разные hostname — так читатель «видит» балансировку.
 */
@Controller()
export class ObservabilityController {
  constructor(private readonly config: AppConfiguration) {}

  @Get()
  root(): { hostname: string; version: string } {
    return {
      hostname: hostname(),
      version: this.config.version,
    };
  }
}
