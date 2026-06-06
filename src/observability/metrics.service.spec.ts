import { MetricsService } from './metrics.service';

describe('MetricsService', () => {
  it('contentType — это prometheus text format', () => {
    const service = new MetricsService();
    expect(service.contentType()).toContain('text/plain');
  });

  it('экспортирует счётчик http_requests_total после инкремента', async () => {
    const service = new MetricsService();
    service.incRequest('GET', '/', 200);

    const out = await service.metrics();
    expect(out).toContain('http_requests_total');
    expect(out).toMatch(/http_requests_total\{[^}]*method="GET"[^}]*\}\s+1/);
  });

  it('включает дефолтные метрики процесса Node', async () => {
    const service = new MetricsService();
    const out = await service.metrics();
    expect(out).toContain('process_cpu_user_seconds_total');
  });
});
