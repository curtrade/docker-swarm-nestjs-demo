import { Controller, Get } from '@nestjs/common';

/**
 * Liveness-проба для Swarm healthcheck.
 *
 * Намеренно лёгкая и без внешних зависимостей: отвечает «жив ли процесс»,
 * а не «здоровы ли БД/Redis». Это важно для healthcheck в Swarm —
 * проба не должна каскадно валить реплики из-за временной недоступности
 * зависимости.
 */
@Controller('health')
export class HealthController {
  @Get()
  health(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
