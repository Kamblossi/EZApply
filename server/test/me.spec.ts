import request from 'supertest';
import dotenv from 'dotenv';
import { app } from '../src/index';
dotenv.config({ path: './.env' }); // load test env

describe('Me endpoint', () => {
  const api = request(app);
  let token: string;

  const email = `user${Date.now()}@example.com`;
  const password = 'S3curePass!';
  const forename = 'Test';
  const surname = 'User';

  beforeAll(async () => {
    // Register user
    const registerRes = await api.post('/api/auth/register').send({ 
      email, 
      password, 
      forename, 
      surname 
    });
    token = registerRes.body.token;
  });

  it('returns user info with valid token', async () => {
    const res = await api.get('/api/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id');
    expect(res.body).toHaveProperty('email', email);
    expect(res.body).toHaveProperty('role');
    expect(res.body).toHaveProperty('created_at');
  });

  it('returns 401 without token', async () => {
    const res = await api.get('/api/me');
    expect(res.status).toBe(401);
  });
});
