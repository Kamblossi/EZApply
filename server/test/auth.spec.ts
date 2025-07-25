import request from 'supertest';
import dotenv from 'dotenv';
import { app } from '../src/index';
dotenv.config({ path: './.env' }); // load test env

describe('Auth flow (register → login → me)', () => {
  const api = request(app);
  const email = `user${Date.now()}@example.com`;
  const password = 'S3curePass!';

  it('registers a new user', async () => {
    const res = await api
      .post('/api/auth/register')
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it('logs the user in', async () => {
    const res = await api
      .post('/api/auth/login')
      .send({ email, password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });
});
