import { Injectable } from '@nestjs/common';
import { RedisClient } from './redis.client';

const COUNTER_KEY = 'counter';

/**
 * Общий счётчик, хранящийся в Redis.
 *
 * Состояние вынесено из памяти процесса в Redis, поэтому оно одинаково для всех
 * реплик сервиса. Это «правильный» способ держать общее состояние при
 * горизонтальном масштабировании.
 */
@Injectable()
export class SharedStateService {
  constructor(private readonly redis: RedisClient) {}

  async increment(): Promise<number> {
    return this.redis.incr(COUNTER_KEY);
  }

  async current(): Promise<number> {
    const value = await this.redis.get(COUNTER_KEY);
    return value ? parseInt(value, 10) : 0;
  }
}
