import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './setup-app';

describe('Health & metrics (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /api/v1/health returns ok', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    // Javob ResponseInterceptor bilan o'raladi: { success, data, ... }
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.service).toBe('adolat-ai-api');
  });

  it('GET /api/v1/health/db reports database readiness', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/health/db');
    expect([200, 503]).toContain(res.status);
    expect(res.body.data.database).toBeDefined();
  });

  it('GET /api/v1/metrics exposes Prometheus text', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/metrics').expect(200);
    expect(res.text).toContain('http_request_duration_seconds');
  });
});
