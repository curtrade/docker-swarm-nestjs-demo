import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('возвращает статус ok', () => {
    const controller = new HealthController();
    expect(controller.health()).toEqual({ status: 'ok' });
  });
});
