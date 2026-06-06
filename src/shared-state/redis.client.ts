import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { RedisConfiguration } from '../config/redis.config';

/**
 * Тонкая обёртка над ioredis как Nest-провайдер.
 *
 * - `lazyConnect: true` — соединение не открывается при создании клиента,
 *   только при первой команде. Это важно: иначе загрузка модуля (в т.ч. в e2e
 *   без поднятого Redis) висела бы на попытке подключения.
 * - `onModuleDestroy` закрывает соединение, чтобы процесс/тесты не зависали на
 *   открытом хендле.
 */
@Injectable()
export class RedisClient extends Redis implements OnModuleDestroy {
  constructor(config: RedisConfiguration) {
    super(config.url, {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
    });
  }

  onModuleDestroy(): void {
    // disconnect() — немедленное закрытие без ожидания pending-команд.
    this.disconnect();
  }
}
