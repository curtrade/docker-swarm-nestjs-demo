import { Controller, Get } from '@nestjs/common';
import { hostname } from 'os';
import { SharedStateService } from './shared-state.service';

/**
 * Демонстрация общего состояния при нескольких репликах.
 *
 * Каждый ответ содержит hostname обслужившей реплики И значение счётчика.
 * Реплики разные (hostname «гуляет»), а счётчик монотонно растёт и одинаков
 * для всех — потому что он в Redis, а не в памяти процесса.
 */
@Controller('counter')
export class SharedStateController {
  constructor(private readonly sharedState: SharedStateService) {}

  @Get()
  async increment(): Promise<{ counter: number; servedBy: string }> {
    return { counter: await this.sharedState.increment(), servedBy: hostname() };
  }

  @Get('value')
  async value(): Promise<{ counter: number; servedBy: string }> {
    return { counter: await this.sharedState.current(), servedBy: hostname() };
  }
}
