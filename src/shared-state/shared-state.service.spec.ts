import { SharedStateService } from './shared-state.service';
import type { RedisClient } from './redis.client';

describe('SharedStateService', () => {
  const makeRedis = (over: Partial<Record<'incr' | 'get', jest.Mock>> = {}) =>
    ({
      incr: over.incr ?? jest.fn(),
      get: over.get ?? jest.fn(),
    }) as unknown as RedisClient;

  it('increment: возвращает новое значение счётчика из Redis', async () => {
    const redis = makeRedis({ incr: jest.fn().mockResolvedValue(1) });
    const service = new SharedStateService(redis);

    await expect(service.increment()).resolves.toBe(1);
    expect(redis.incr as jest.Mock).toHaveBeenCalledWith('counter');
  });

  it('current: парсит строковое значение из Redis в число', async () => {
    const redis = makeRedis({ get: jest.fn().mockResolvedValue('5') });
    const service = new SharedStateService(redis);

    await expect(service.current()).resolves.toBe(5);
  });

  it('current: возвращает 0, когда ключа ещё нет (null)', async () => {
    const redis = makeRedis({ get: jest.fn().mockResolvedValue(null) });
    const service = new SharedStateService(redis);

    await expect(service.current()).resolves.toBe(0);
  });

  it('increment: пробрасывает ошибку при недоступном Redis', async () => {
    const redis = makeRedis({
      incr: jest.fn().mockRejectedValue(new Error('Redis unavailable')),
    });
    const service = new SharedStateService(redis);

    await expect(service.increment()).rejects.toThrow('Redis unavailable');
  });
});
