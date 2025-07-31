import { app } from '../src/index';
import request from 'supertest';

describe('OpenAPI docs', () => {
  it('exposes JSON at /api-docs', async () => {
    const res = await request(app).get('/api-docs');
    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.info).toBeDefined();
    expect(res.body.info.title).toBe('EZApply API');
    expect(res.body.paths).toBeDefined();
  });

  it('exposes /swagger UI (allows redirects)', async () => {
    const res = await request(app).get('/swagger');
    // Swagger UI might redirect to /swagger/ so we accept both 200 and 301
    expect([200, 301]).toContain(res.status);
  });

  it('has auth endpoints documented', async () => {
    const res = await request(app).get('/api-docs');
    expect(res.body.paths).toHaveProperty('/api/auth/register');
    expect(res.body.paths).toHaveProperty('/api/auth/login');
  });
});
