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

  it('has all main endpoints documented', async () => {
    const res = await request(app).get('/api-docs');
    const paths = res.body.paths;
    
    // Auth endpoints
    expect(paths).toHaveProperty('/api/auth/register');
    expect(paths).toHaveProperty('/api/auth/login');
    
    // User endpoint
    expect(paths).toHaveProperty('/api/me');
    
    // Profile endpoints
    expect(paths).toHaveProperty('/api/profile');
    
    // Jobs endpoints
    expect(paths).toHaveProperty('/api/jobs');
    expect(paths).toHaveProperty('/api/jobs/{id}');
    
    // Applications endpoints
    expect(paths).toHaveProperty('/api/applications');
  });

  it('has proper security schemes defined', async () => {
    const res = await request(app).get('/api-docs');
    expect(res.body.components?.securitySchemes?.bearerAuth).toBeDefined();
    expect(res.body.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
  });

  it('has proper tags for organization', async () => {
    const res = await request(app).get('/api-docs');
    const paths = res.body.paths;
    
    // Check that endpoints have appropriate tags
    expect(paths['/api/auth/register']?.post?.tags).toContain('Authentication');
    expect(paths['/api/me']?.get?.tags).toContain('User');
    expect(paths['/api/profile']?.get?.tags).toContain('Profile');
    expect(paths['/api/jobs']?.get?.tags).toContain('Jobs');
    expect(paths['/api/applications']?.get?.tags).toContain('Applications');
  });
});
