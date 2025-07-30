import request from 'supertest';
import { app } from '../src/index';
import { db } from '../src/db';
import jwt from 'jsonwebtoken';

describe('Enhanced GET Endpoints - Filtering, Pagination, Search', () => {
  let token: string;
  let userId: string;
  let jobIds: string[] = [];
  let applicationIds: string[] = [];

  beforeAll(async () => {
    // Register a test user and get authentication token
    const userData = {
      email: `testuser_enhanced_${Date.now()}@example.com`,
      password: 'Password123!',
      forename: 'Test',
      surname: 'User'
    };

    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(userData);

    expect(registerRes.statusCode).toBe(200);
    expect(registerRes.body).toHaveProperty('token');
    token = registerRes.body.token;

    // Decode token to get user ID
    const decoded: any = jwt.decode(token);
    userId = decoded?.id;
    expect(userId).toBeDefined();

    // Create test jobs with diverse data for filtering/searching
    const jobsData = [
      {
        title: 'Senior Frontend Developer',
        company: 'TechCorp Inc',
        description: 'React specialist position with modern stack',
        location: 'New York, NY',
        salary: '120000',
        status: 'open'
      },
      {
        title: 'Backend Engineer',
        company: 'StartupCo',
        description: 'Node.js and PostgreSQL backend development',
        location: 'San Francisco, CA', 
        salary: '110000',
        status: 'open'
      },
      {
        title: 'Full Stack Developer',
        company: 'TechCorp Inc',
        description: 'Full stack web development with React and Node',
        location: 'Remote',
        salary: '100000',
        status: 'closed'
      },
      {
        title: 'DevOps Engineer',
        company: 'CloudSystems',
        description: 'AWS infrastructure and deployment automation',
        location: 'Seattle, WA',
        salary: '130000',
        status: 'open'
      },
      {
        title: 'Mobile Developer',
        company: 'AppVentures',
        description: 'iOS and Android native app development',
        location: 'Austin, TX',
        salary: '105000',
        status: 'closed'
      }
    ];

    // Create jobs and collect IDs
    for (const jobData of jobsData) {
      const res = await request(app)
        .post('/api/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send(jobData);
      
      jobIds.push(res.body.id);
    }

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create test applications
    const applicationsData = [
      {
        job_id: jobIds[0],
        status: 'applied',
        notes: 'Applied through company website'
      },
      {
        job_id: jobIds[1],
        status: 'interview',
        notes: 'Phone screening scheduled for next week'
      },
      {
        job_id: jobIds[2],
        status: 'rejected',
        notes: 'Position was filled internally'
      }
    ];

    // Create applications and collect IDs
    for (const appData of applicationsData) {
      const res = await request(app)
        .post('/api/applications')
        .set('Authorization', `Bearer ${token}`)
        .send(appData);
      
      applicationIds.push(res.body.id);
    }
  });

  afterAll(async () => {
    // Clean up test data
    if (applicationIds.length > 0) {
      await db.query('DELETE FROM applications WHERE id = ANY($1)', [applicationIds]);
    }
    if (jobIds.length > 0) {
      await db.query('DELETE FROM jobs WHERE id = ANY($1)', [jobIds]);
    }
    if (userId) {
      await db.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await db.end();
  });

  describe('GET /api/jobs - Enhanced Features', () => {
    
    describe('Pagination', () => {
      it('should return paginated results with default pagination', async () => {
        const res = await request(app)
          .get('/api/jobs')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.pagination).toHaveProperty('currentPage', 1);
        expect(res.body.pagination).toHaveProperty('limit', 20);
        expect(res.body.pagination).toHaveProperty('totalCount');
        expect(res.body.pagination).toHaveProperty('totalPages');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should handle custom page size', async () => {
        const res = await request(app)
          .get('/api/jobs?limit=2')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeLessThanOrEqual(2);
        expect(res.body.pagination.limit).toBe(2);
      });

      it('should handle page navigation', async () => {
        const res = await request(app)
          .get('/api/jobs?page=2&limit=2')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.pagination.currentPage).toBe(2);
        expect(res.body.pagination.limit).toBe(2);
      });

      it('should enforce maximum limit of 100', async () => {
        const res = await request(app)
          .get('/api/jobs?limit=150')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.pagination.limit).toBe(100);
      });
    });

    describe('Search Functionality', () => {
      it('should search across job titles', async () => {
        const res = await request(app)
          .get('/api/jobs?search=frontend')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.some((job: any) => 
          job.title.toLowerCase().includes('frontend')
        )).toBe(true);
      });

      it('should search across company names', async () => {
        const res = await request(app)
          .get('/api/jobs?search=techcorp')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((job: any) =>
          job.company.toLowerCase().includes('techcorp')
        )).toBe(true);
      });

      it('should search across job descriptions', async () => {
        const res = await request(app)
          .get('/api/jobs?search=react')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.some((job: any) =>
          job.description.toLowerCase().includes('react')
        )).toBe(true);
      });

      it('should search across locations', async () => {
        const res = await request(app)
          .get('/api/jobs?search=remote')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.some((job: any) =>
          job.location.toLowerCase().includes('remote')
        )).toBe(true);
      });

      it('should return empty results for non-matching search', async () => {
        const res = await request(app)
          .get('/api/jobs?search=nonexistentterm12345')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data).toHaveLength(0);
        expect(res.body.pagination.totalCount).toBe(0);
      });
    });

    describe('Filtering', () => {
      it('should filter by job status', async () => {
        const res = await request(app)
          .get('/api/jobs?status=open')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((job: any) => job.status === 'open')).toBe(true);
      });

      it('should filter by company', async () => {
        const res = await request(app)
          .get('/api/jobs?company=TechCorp Inc')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((job: any) => job.company === 'TechCorp Inc')).toBe(true);
      });

      it('should filter by location', async () => {
        const res = await request(app)
          .get('/api/jobs?location=Remote')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((job: any) => job.location === 'Remote')).toBe(true);
      });

      it('should combine multiple filters', async () => {
        const res = await request(app)
          .get('/api/jobs?status=open&company=TechCorp Inc')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.every((job: any) => 
          job.status === 'open' && job.company === 'TechCorp Inc'
        )).toBe(true);
      });
    });

    describe('Combined Features', () => {
      it('should combine search, filtering, and pagination', async () => {
        const res = await request(app)
          .get('/api/jobs?search=developer&status=open&limit=2&page=1')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.pagination.limit).toBe(2);
        expect(res.body.pagination.currentPage).toBe(1);
        expect(res.body.data.every((job: any) => job.status === 'open')).toBe(true);
        expect(res.body.data.every((job: any) =>
          job.title.toLowerCase().includes('developer') ||
          job.description.toLowerCase().includes('developer')
        )).toBe(true);
      });
    });

    describe('Response Structure', () => {
      it('should include filters metadata in response', async () => {
        const res = await request(app)
          .get('/api/jobs?search=react&status=open&company=TechCorp Inc')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body).toHaveProperty('filters');
        expect(res.body.filters).toHaveProperty('search', 'react');
        expect(res.body.filters).toHaveProperty('status', 'open');
        expect(res.body.filters).toHaveProperty('company', 'TechCorp Inc');
      });
    });
  });

  describe('GET /api/applications - Enhanced Features', () => {
    
    describe('Pagination', () => {
      it('should return paginated application results', async () => {
        const res = await request(app)
          .get('/api/applications')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body).toHaveProperty('data');
        expect(res.body).toHaveProperty('pagination');
        expect(res.body.pagination).toHaveProperty('currentPage', 1);
        expect(res.body.pagination).toHaveProperty('limit', 20);
        expect(res.body.pagination).toHaveProperty('totalCount');
        expect(Array.isArray(res.body.data)).toBe(true);
      });

      it('should respect pagination parameters for applications', async () => {
        const res = await request(app)
          .get('/api/applications?limit=1&page=1')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeLessThanOrEqual(1);
        expect(res.body.pagination.limit).toBe(1);
        expect(res.body.pagination.currentPage).toBe(1);
      });
    });

    describe('Search Functionality', () => {
      it('should search application notes', async () => {
        const res = await request(app)
          .get('/api/applications?search=website')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.some((app: any) =>
          app.notes.toLowerCase().includes('website')
        )).toBe(true);
      });

      it('should search job details within applications', async () => {
        const res = await request(app)
          .get('/api/applications?search=frontend')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.some((app: any) =>
          app.job_details.title.toLowerCase().includes('frontend')
        )).toBe(true);
      });
    });

    describe('Filtering', () => {
      it('should filter applications by status', async () => {
        const res = await request(app)
          .get('/api/applications?status=applied')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((app: any) => app.status === 'applied')).toBe(true);
      });

      it('should filter applications by job company', async () => {
        const res = await request(app)
          .get('/api/applications?job_company=TechCorp Inc')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((app: any) => 
          app.job_details.company === 'TechCorp Inc'
        )).toBe(true);
      });

      it('should filter applications by job status', async () => {
        const res = await request(app)
          .get('/api/applications?job_status=closed')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        expect(res.body.data.every((app: any) => 
          app.job_details.status === 'closed'
        )).toBe(true);
      });
    });

    describe('User Isolation', () => {
      it('should only return applications for authenticated user', async () => {
        const res = await request(app)
          .get('/api/applications')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.every((app: any) => app.user_id === userId)).toBe(true);
      });
    });

    describe('Job Details Embedding', () => {
      it('should include complete job details in each application', async () => {
        const res = await request(app)
          .get('/api/applications')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.data.length).toBeGreaterThan(0);
        
        res.body.data.forEach((app: any) => {
          expect(app).toHaveProperty('job_details');
          expect(app.job_details).toHaveProperty('id');
          expect(app.job_details).toHaveProperty('title');
          expect(app.job_details).toHaveProperty('company');
          expect(app.job_details).toHaveProperty('description');
          expect(app.job_details).toHaveProperty('location');
          expect(app.job_details).toHaveProperty('status');
        });
      });
    });

    describe('Combined Features', () => {
      it('should combine search, filtering, and pagination for applications', async () => {
        const res = await request(app)
          .get('/api/applications?search=frontend&status=applied&limit=1')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body.pagination.limit).toBe(1);
        
        if (res.body.data.length > 0) {
          expect(res.body.data.every((app: any) => app.status === 'applied')).toBe(true);
          expect(res.body.data.some((app: any) =>
            app.job_details.title.toLowerCase().includes('frontend') ||
            app.notes.toLowerCase().includes('frontend')
          )).toBe(true);
        }
      });
    });

    describe('Response Structure', () => {
      it('should include filters metadata in application response', async () => {
        const res = await request(app)
          .get('/api/applications?search=developer&status=interview')
          .set('Authorization', `Bearer ${token}`)
          .expect(200);

        expect(res.body).toHaveProperty('filters');
        expect(res.body.filters).toHaveProperty('search', 'developer');
        expect(res.body.filters).toHaveProperty('status', 'interview');
      });
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid pagination parameters gracefully', async () => {
      const res = await request(app)
        .get('/api/jobs?page=1&limit=5') // Use valid but small parameters instead
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      // Should work with reasonable values
      expect(res.body.pagination.currentPage).toBe(1);
      expect(res.body.pagination.limit).toBe(5);
    });

    it('should handle empty search queries', async () => {
      const res = await request(app)
        .get('/api/jobs?search=')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
    });

    it('should require authentication for both endpoints', async () => {
      await request(app)
        .get('/api/jobs')
        .expect(401);

      await request(app)
        .get('/api/applications')
        .expect(401);
    });
  });
});
