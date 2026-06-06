import { Configuration, Value } from '@itgorillaz/configify';
import { IsNotEmpty } from 'class-validator';

/**
 * Конфигурация подключения к Redis.
 *
 * В Swarm адрес — это имя сервиса в overlay-сети (redis://redis:6379),
 * локально — redis://localhost:6379. Авто-обнаруживается configify.
 */
@Configuration()
export class RedisConfiguration {
  @Value('REDIS_URL', { default: 'redis://localhost:6379' })
  @IsNotEmpty()
  url: string;
}
