// server/test/get-jobs-applications.spec.ts
import request from 'supertest';
import { app } from '../src/index'; // Your Express app
import { db } from '../src/db';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { JobDTO } from '../src/validators/job';
import { ApplicationDTO } from '../src/validators/application';
import { z } from 'zod'; // Import z for ZodError check

// Mock user for testing authentication
const testUser = {
  email: `testuser_${Date.now()}@example.com`,
  password: 'Password123!',
  forename: 'Test',
  surname: 'User',
};

let testUserId: string;
let authToken: string; // To store the authentication token for testUser

describe('Jobs and Applications Endpoints', () => {
  beforeAll(async () => {
    // Register a test user and get a token
    const registerRes = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(registerRes.statusCode).toBe(200);
    expect(registerRes.body).toHaveProperty('token');
    authToken = registerRes.body.token;

    // Decode token to get user id
    const decoded: any = jwt.decode(authToken);
    testUserId = decoded?.id;
    expect(testUserId).toBeDefined();
  });

  afterAll(async () => {
    // Clean up data created during tests
    await db.query('DELETE FROM applications');
    await db.query('DELETE FROM jobs');
    await db.query('DELETE FROM users WHERE id = $1', [testUserId]);
  });

  beforeEach(async () => {
    // Clear jobs and applications before each test to ensure test isolation
    await db.query('DELETE FROM applications');
    await db.query('DELETE FROM jobs');
  });

  // --- GET /api/jobs tests ---

  it('GET /api/jobs should return 401 if no authentication token is provided', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Unauthorized: No token provided.');
  });

  it('GET /api/jobs should return an empty array if no jobs exist', async () => {
    const res = await request(app).get('/api/jobs').set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /api/jobs should return a list of jobs when they exist', async () => {
    // Insert some dummy jobs
    const job1Id = randomUUID();
    const job2Id = randomUUID();
    
    const job1 = {
      id: job1Id,
      title: 'Software Engineer',
      company: 'Test Company A',
      description: 'Develop awesome software.',
      url: 'http://example.com/job1',
      status: 'open',
      posted_date: new Date('2024-01-15T00:00:00.000Z'),
      deadline_date: new Date('2024-02-15T00:00:00.000Z'),
      location: 'Remote'
    };
    const job2 = {
      id: job2Id,
      title: 'Senior Developer',
      company: 'Test Company B',
      status: 'open',
      posted_date: new Date('2024-01-20T00:00:00.000Z'),
      deadline_date: new Date('2024-02-28T00:00:00.000Z'),
      location: 'New York'
    };

    await db.query(
      `INSERT INTO jobs (id, title, company, description, url, status, posted_date, deadline_date, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`,
      [job1.id, job1.title, job1.company, job1.description, job1.url, job1.status, job1.posted_date.toISOString(), job1.deadline_date.toISOString(), job1.location]
    );
    await db.query(
      `INSERT INTO jobs (id, title, company, status, posted_date, deadline_date, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`,
      [job2.id, job2.title, job2.company, job2.status, job2.posted_date.toISOString(), job2.deadline_date.toISOString(), job2.location]
    );

    const res = await request(app).get('/api/jobs').set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    // Check if the latest posted_date comes first due to ORDER BY
    expect(res.body[0].title).toBe('Senior Developer');
    expect(res.body[1].title).toBe('Software Engineer');

    // Validate structure with DTO
    res.body.forEach((job: any) => {
      const parsedJob = JobDTO.safeParse(job);
      expect(parsedJob.success).toBe(true);
      // Check date types - they should be valid date strings
      if (job.posted_date) expect(new Date(job.posted_date)).toBeInstanceOf(Date);
      if (job.deadline_date) expect(new Date(job.deadline_date)).toBeInstanceOf(Date);
    });
  });

  // --- GET /api/applications tests ---

  it('GET /api/applications should return 401 if no authentication token is provided', async () => {
    const res = await request(app).get('/api/applications');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Unauthorized: No token provided.');
  });

  it('GET /api/applications should return an empty array if no applications exist for the user', async () => {
    const res = await request(app).get('/api/applications').set('Authorization', `Bearer ${authToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('GET /api/applications should return a list of applications for the authenticated user, with job details', async () => {
    // 1. Insert a job
    const jobForAppId = randomUUID();
    const jobForApp = {
      id: jobForAppId,
      title: 'Product Manager',
      company: 'Test Company C',
      status: 'open',
      posted_date: new Date('2024-03-01T00:00:00.000Z'),
      location: 'Remote'
    };
    await db.query(
      `INSERT INTO jobs (id, title, company, status, posted_date, location)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]
    );

    // 2. Insert an application for the test user to that job
    const applicationId = randomUUID();
    const applicationData = {
      id: applicationId,
      user_id: testUserId,
      job_id: jobForApp.id,
      status: 'submitted',
      application_date: new Date('2024-03-05T00:00:00.000Z'),
      notes: 'Cover letter attached.',
    };
    await db.query(
      `INSERT INTO applications (id, user_id, job_id, status, application_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [applicationData.id, applicationData.user_id, applicationData.job_id, applicationData.status, applicationData.application_date.toISOString(), applicationData.notes]
    );

    // 3. Insert another job and application for a DIFFERENT user (should not appear)
    const otherUserId = randomUUID();
    const otherUserEmail = `otheruser_${Date.now()}@example.com`;
    await db.query('INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4);', [otherUserId, otherUserEmail, 'hashedpass', 'user']);

    const jobForOtherAppId = randomUUID();
    const jobForOtherApp = {
      id: jobForOtherAppId,
      title: 'Data Analyst',
      company: 'Another Company',
      status: 'open',
      posted_date: new Date('2024-04-01T00:00:00.000Z'),
      location: 'On-site'
    };
    await db.query(
      `INSERT INTO jobs (id, title, company, status, posted_date, location)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [jobForOtherApp.id, jobForOtherApp.title, jobForOtherApp.company, jobForOtherApp.status, jobForOtherApp.posted_date.toISOString(), jobForOtherApp.location]
    );
    await db.query(
      `INSERT INTO applications (id, user_id, job_id, status, application_date)
       VALUES ($1, $2, $3, $4, $5);`,
      [randomUUID(), otherUserId, jobForOtherApp.id, 'rejected', new Date('2024-04-02T00:00:00.000Z').toISOString()]
    );

    // 4. Perform the GET /api/applications request
    const res = await request(app).get('/api/applications').set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1); // Should only return the testUser's application

    const fetchedApp = res.body[0];
    expect(fetchedApp.id).toBe(applicationData.id);
    expect(fetchedApp.user_id).toBe(testUserId);
    expect(fetchedApp.job_id).toBe(jobForApp.id);
    expect(fetchedApp.status).toBe('submitted');
    expect(fetchedApp.notes).toBe('Cover letter attached.');
    expect(new Date(fetchedApp.application_date)).toEqual(applicationData.application_date);

    // Verify embedded job_details
    expect(fetchedApp.job_details).toBeDefined();
    expect(fetchedApp.job_details.id).toBe(jobForApp.id);
    expect(fetchedApp.job_details.title).toBe('Product Manager');
    expect(fetchedApp.job_details.company).toBe('Test Company C');
    expect(new Date(fetchedApp.job_details.posted_date)).toEqual(jobForApp.posted_date);

    // Validate structure with DTOs
    const parsedApp = ApplicationDTO.safeParse(fetchedApp);
    expect(parsedApp.success).toBe(true);

    const parsedJobDetails = JobDTO.safeParse(fetchedApp.job_details);
    expect(parsedJobDetails.success).toBe(true);

    // Clean up the other user
    await db.query('DELETE FROM users WHERE id = $1', [otherUserId]);
  });

  it('GET /api/applications should handle multiple applications and sort them correctly', async () => {
    // Insert multiple jobs
    const job1Id = randomUUID();
    const job2Id = randomUUID();
    
    await db.query(
      `INSERT INTO jobs (id, title, company, status, posted_date, location)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [job1Id, 'Frontend Developer', 'Test Company A', 'open', new Date('2024-01-01T00:00:00.000Z').toISOString(), 'Remote']
    );
    await db.query(
      `INSERT INTO jobs (id, title, company, status, posted_date, location)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [job2Id, 'Backend Developer', 'Test Company B', 'open', new Date('2024-01-02T00:00:00.000Z').toISOString(), 'Hybrid']
    );

    // Insert multiple applications with different dates
    const app1Id = randomUUID();
    const app2Id = randomUUID();
    
    await db.query(
      `INSERT INTO applications (id, user_id, job_id, status, application_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [app1Id, testUserId, job1Id, 'draft', new Date('2024-01-10T00:00:00.000Z').toISOString(), 'First application']
    );
    await db.query(
      `INSERT INTO applications (id, user_id, job_id, status, application_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6);`,
      [app2Id, testUserId, job2Id, 'submitted', new Date('2024-01-15T00:00:00.000Z').toISOString(), 'Second application']
    );

    const res = await request(app).get('/api/applications').set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(2);
    
    // Should be sorted by application_date DESC, so the latest should come first
    expect(res.body[0].notes).toBe('Second application');
    expect(res.body[1].notes).toBe('First application');
    
    // Verify both have job_details
    expect(res.body[0].job_details.title).toBe('Backend Developer');
    expect(res.body[1].job_details.title).toBe('Frontend Developer');
  });

  // --- POST /api/jobs tests ---

  it('POST /api/jobs should return 401 if no authentication token is provided', async () => {
    const res = await request(app).post('/api/jobs').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Unauthorized: No token provided.');
  });

  it('POST /api/jobs should create a new job listing successfully', async () => {
    const newJob = {
      title: 'Full Stack Developer',
      company: 'New Tech Co',
      location: 'Remote',
      description: 'Exciting opportunity!',
      url: 'http://newtech.com/careers/fsd',
      status: 'open',
      posted_date: new Date('2025-01-01T10:00:00.000Z'),
      deadline_date: new Date('2025-01-31T17:00:00.000Z'),
    };

    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newJob);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(typeof res.body.id).toBe('string');
    expect(res.body.title).toBe(newJob.title);
    expect(res.body.company).toBe(newJob.company);
    expect(res.body.location).toBe(newJob.location);
    expect(res.body.status).toBe(newJob.status);
    expect(new Date(res.body.posted_date)).toEqual(newJob.posted_date);
    expect(new Date(res.body.deadline_date)).toEqual(newJob.deadline_date);

    // Verify it exists in the database
    const dbRes = await db.query('SELECT * FROM jobs WHERE id = $1', [res.body.id]);
    expect(dbRes.rows).toHaveLength(1);
    expect(dbRes.rows[0].title).toBe(newJob.title);

    // Verify it's returned by GET /api/jobs
    const getRes = await request(app).get('/api/jobs').set('Authorization', `Bearer ${authToken}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.some((job: any) => job.id === res.body.id)).toBe(true);
  });

  it('POST /api/jobs should return 400 for invalid job data', async () => {
    const invalidJob = {
      title: '', // Invalid: min length 1
      company: 123, // Invalid: must be string
    };

    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidJob);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Validation error');
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors[0].path).toEqual(['title']);
    expect(res.body.errors[1].path).toEqual(['company']);
  });

  // --- POST /api/applications tests ---

  it('POST /api/applications should return 401 if no authentication token is provided', async () => {
    const res = await request(app).post('/api/applications').send({});
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Unauthorized: No token provided.');
  });

  it('POST /api/applications should return 400 for invalid application data', async () => {
    const invalidApp = {
      job_id: 'not-a-uuid', // Invalid UUID
      status: '', // Invalid: min length 1
    };

    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${authToken}`)
      .send(invalidApp);

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('message', 'Validation error');
    expect(res.body).toHaveProperty('errors');
    expect(Array.isArray(res.body.errors)).toBe(true);
    
    // Check that we have errors for both fields
    const jobIdError = res.body.errors.find((err: any) => err.path && err.path.includes('job_id'));
    const statusError = res.body.errors.find((err: any) => err.path && err.path.includes('status'));
    
    expect(jobIdError).toBeDefined();
    expect(statusError).toBeDefined();
  });

  it('POST /api/applications should return 404 if job_id does not exist', async () => {
    const nonExistentJobId = '11111111-1111-1111-9111-111111111111'; // A valid UUID, but not in DB
    const appData = {
      job_id: nonExistentJobId,
      status: 'draft',
    };

    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${authToken}`)
      .send(appData);

    expect(res.statusCode).toBe(404);
    expect(res.body.message).toBe('Job not found with the provided job_id.');
  });

  it('POST /api/applications should create a new application successfully', async () => {
    // First, create a job to apply to
    const jobForApplication = {
      title: 'UX Designer',
      company: 'Design Studio',
      status: 'open',
      posted_date: new Date('2025-02-01T09:00:00.000Z'),
    };
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${authToken}`)
      .send(jobForApplication);
    expect(jobRes.statusCode).toBe(201);
    const jobId = jobRes.body.id;

    const newApplication = {
      job_id: jobId,
      status: 'submitted',
      application_date: new Date('2025-02-05T14:00:00.000Z'),
      notes: 'Followed up via email.',
    };

    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${authToken}`)
      .send(newApplication);

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(typeof res.body.id).toBe('string');
    expect(res.body.user_id).toBe(testUserId);
    expect(res.body.job_id).toBe(jobId);
    expect(res.body.status).toBe(newApplication.status);
    expect(new Date(res.body.application_date)).toEqual(newApplication.application_date);
    expect(res.body.notes).toBe(newApplication.notes);

    // Verify embedded job_details
    expect(res.body.job_details).toBeDefined();
    expect(res.body.job_details.id).toBe(jobId);
    expect(res.body.job_details.title).toBe(jobForApplication.title);

    // Verify it exists in the database
    const dbRes = await db.query('SELECT * FROM applications WHERE id = $1', [res.body.id]);
    expect(dbRes.rows).toHaveLength(1);
    expect(dbRes.rows[0].job_id).toBe(jobId);
    expect(dbRes.rows[0].user_id).toBe(testUserId);

    // Verify it's returned by GET /api/applications
    const getRes = await request(app).get('/api/applications').set('Authorization', `Bearer ${authToken}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.some((app: any) => app.id === res.body.id)).toBe(true);
  });
});