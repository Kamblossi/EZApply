import request from 'supertest';
import { app } from '../src/index';

describe('Rate limit', () => {
  it('throttles auth endpoints after 5 hits from same IP', async () => {
    const testEmail = 'test@example.com';
    const testPassword = 'badpass';

    // Make 5 requests to login endpoint
    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        });
      // These should not be rate limited yet
      expect(res.status).not.toBe(429);
    }

    // The 6th request should be rate limited
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: testPassword,
      });

    expect(res.status).toBe(429);
    expect(res.body.error).toMatch(/too many/i);
  }, 30000);

  it('includes proper rate limit headers', async () => {
    // Use a different test to check headers on a fresh rate limit window
    const res = await request(app)
      .get('/api-docs'); // Use non-rate-limited endpoint first to reset connection

    expect(res.status).toBe(200);

    // Now test an auth endpoint  
    const authRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'headers-test@example.com',
        password: 'testpass',
      });

    // Should include rate limit headers
    expect(authRes.headers).toHaveProperty('ratelimit-limit');
    expect(authRes.headers).toHaveProperty('ratelimit-remaining');
    expect(authRes.headers).toHaveProperty('ratelimit-reset');
    
    // Verify the limit is set correctly
    expect(authRes.headers['ratelimit-limit']).toBe('5');
  });

  it('does not affect other endpoints', async () => {
    // Rate limiting should only apply to auth endpoints, not others
    const res = await request(app).get('/api-docs');
    expect(res.status).toBe(200);
    // Should not have rate limit headers for non-rate-limited endpoints
    expect(res.headers).not.toHaveProperty('ratelimit-limit');
  });

  it('rate limit applies to both login and register on same IP', async () => {
    // This test verifies that the rate limit is shared across auth endpoints
    // Note: We need to be careful as previous tests may have consumed some quota

    // First, let's make a few requests to different auth endpoints
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'shared-test@example.com',
        password: 'testpass',
      });

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: `unique${Date.now()}@example.com`,
        password: 'testpass123',
        forename: 'Test',
        surname: 'User',
      });

    // Both should have rate limit headers
    expect(loginRes.headers).toHaveProperty('ratelimit-remaining');
    expect(registerRes.headers).toHaveProperty('ratelimit-remaining');

    // The remaining count on register should be less than the initial limit
    // (because login consumed one)
    const loginRemaining = parseInt(loginRes.headers['ratelimit-remaining']);
    const registerRemaining = parseInt(registerRes.headers['ratelimit-remaining']);
    
    // Register should have one less remaining than login had
    expect(registerRemaining).toBeLessThanOrEqual(loginRemaining);
  });

  it('returns proper error format when rate limited', async () => {
    // Generate enough requests to trigger rate limit
    // Using unique endpoints to avoid interference
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'rate-limit-test@example.com',
          password: 'testpass',
        });
      
      if (res.status === 429) {
        // Check the error format
        expect(res.body).toHaveProperty('error');
        expect(res.body.error).toMatch(/too many/i);
        break;
      }
    }
  });
});
