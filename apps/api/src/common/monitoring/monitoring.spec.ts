import { MetricsService } from './metrics.service';
import { initSentry, isSentryEnabled } from './sentry.util';

describe('MetricsService', () => {
  it('exposes Prometheus metrics including the HTTP histogram', async () => {
    const service = new MetricsService();
    service.observe('GET', '/chat', 200, 0.12);

    const text = await service.metrics();
    expect(text).toContain('http_request_duration_seconds');
    // Standart Node metrikalari ham bo'lishi kerak
    expect(text).toContain('process_cpu_user_seconds_total');
    expect(service.contentType).toContain('text/plain');
  });

  it('records observations under the right labels', async () => {
    const service = new MetricsService();
    service.observe('POST', '/ocr', 201, 0.5);
    const text = await service.metrics();
    expect(text).toMatch(/http_request_duration_seconds_count\{[^}]*route="\/ocr"[^}]*\}\s+1/);
  });
});

describe('sentry.util', () => {
  it('stays disabled when no DSN is provided', () => {
    expect(initSentry('', 'test')).toBe(false);
    expect(initSentry(undefined, 'test')).toBe(false);
    expect(isSentryEnabled()).toBe(false);
  });
});
