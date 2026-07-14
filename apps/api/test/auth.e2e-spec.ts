import { INestApplication } from '@nestjs/common';
import request from 'supertest';

import { createTestApp } from './setup-app';
import { PrismaService } from '../src/database/prisma/prisma.service';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken = '';

  const email = `e2e_${Date.now()}@test.uz`;
  const password = 'StrongPass123!';
  const base = '/api/v1/auth';

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
    await app.close();
  });

  it('registers a new user (PENDING, requires verification)', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/register`)
      .send({ firstName: 'E2E', lastName: 'Test', email, password, language: 'UZ' });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.requiresVerification).toBe(true);
  });

  it('rejects duplicate registration', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/register`)
      .send({ firstName: 'E2E', lastName: 'Test', email, password, language: 'UZ' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects login before the account is active', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ identifier: email, password });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('rejects login with a wrong password', async () => {
    await prisma.user.updateMany({ where: { email }, data: { status: 'ACTIVE' } });
    const res = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ identifier: email, password: 'WrongPass123!' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('logs in an active user and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post(`${base}/login`)
      .send({ identifier: email, password });

    expect([200, 201]).toContain(res.status);
    expect(res.body.data.accessToken).toBeDefined();
    expect(res.body.data.refreshToken).toBeDefined();
    accessToken = res.body.data.accessToken as string;
  });

  it('rejects a protected route without a token', async () => {
    const res = await request(app.getHttpServer()).get('/api/v1/chat/threads');
    expect(res.status).toBe(401);
  });

  it('allows a protected route with a valid token', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/chat/threads')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
