"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/test/get-jobs-applications.spec.ts
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index"); // Your Express app
const db_1 = require("../src/db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = require("crypto");
const job_1 = require("../src/validators/job");
const application_1 = require("../src/validators/application");
// Mock user for testing authentication
const testUser = {
    email: `testuser_${Date.now()}@example.com`,
    password: 'Password123!',
    forename: 'Test',
    surname: 'User',
};
let testUserId;
let authToken; // To store the authentication token for testUser
describe('Jobs and Applications Endpoints', () => {
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Register a test user and get a token
        const registerRes = yield (0, supertest_1.default)(index_1.app)
            .post('/api/auth/register')
            .send(testUser);
        expect(registerRes.statusCode).toBe(200);
        expect(registerRes.body).toHaveProperty('token');
        authToken = registerRes.body.token;
        // Decode token to get user id
        const decoded = jsonwebtoken_1.default.decode(authToken);
        testUserId = decoded === null || decoded === void 0 ? void 0 : decoded.id;
        expect(testUserId).toBeDefined();
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clean up data created during tests
        yield db_1.db.query('DELETE FROM applications');
        yield db_1.db.query('DELETE FROM jobs');
        yield db_1.db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }));
    beforeEach(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clear jobs and applications before each test to ensure test isolation
        yield db_1.db.query('DELETE FROM applications');
        yield db_1.db.query('DELETE FROM jobs');
    }));
    // --- GET /api/jobs tests ---
    it('GET /api/jobs should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).get('/api/jobs');
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Unauthorized: No token provided.');
    }));
    it('GET /api/jobs should return an empty result if no jobs exist', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).get('/api/jobs').set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination.totalCount).toBe(0);
        expect(res.body.pagination.currentPage).toBe(1);
        expect(res.body.pagination.totalPages).toBe(0);
    }));
    it('GET /api/jobs should return a list of jobs when they exist', () => __awaiter(void 0, void 0, void 0, function* () {
        // Insert some dummy jobs
        const job1Id = (0, crypto_1.randomUUID)();
        const job2Id = (0, crypto_1.randomUUID)();
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
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, description, url, status, posted_date, deadline_date, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9);`, [job1.id, job1.title, job1.company, job1.description, job1.url, job1.status, job1.posted_date.toISOString(), job1.deadline_date.toISOString(), job1.location]);
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, deadline_date, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7);`, [job2.id, job2.title, job2.company, job2.status, job2.posted_date.toISOString(), job2.deadline_date.toISOString(), job2.location]);
        const res = yield (0, supertest_1.default)(index_1.app).get('/api/jobs').set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.pagination.totalCount).toBe(2);
        expect(res.body.pagination.currentPage).toBe(1);
        // Check if the latest posted_date comes first due to ORDER BY
        expect(res.body.data[0].title).toBe('Senior Developer');
        expect(res.body.data[1].title).toBe('Software Engineer');
        // Validate structure with DTO
        res.body.data.forEach((job) => {
            const parsedJob = job_1.JobDTO.safeParse(job);
            expect(parsedJob.success).toBe(true);
            // Check date types - they should be valid date strings
            if (job.posted_date)
                expect(new Date(job.posted_date)).toBeInstanceOf(Date);
            if (job.deadline_date)
                expect(new Date(job.deadline_date)).toBeInstanceOf(Date);
        });
    }));
    // --- GET /api/applications tests ---
    it('GET /api/applications should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).get('/api/applications');
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Unauthorized: No token provided.');
    }));
    it('GET /api/applications should return an empty result if no applications exist for the user', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).get('/api/applications').set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toEqual([]);
        expect(res.body.pagination.totalCount).toBe(0);
        expect(res.body.pagination.currentPage).toBe(1);
        expect(res.body.pagination.totalPages).toBe(0);
    }));
    it('GET /api/applications should return a list of applications for the authenticated user, with job details', () => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Insert a job
        const jobForAppId = (0, crypto_1.randomUUID)();
        const jobForApp = {
            id: jobForAppId,
            title: 'Product Manager',
            company: 'Test Company C',
            status: 'open',
            posted_date: new Date('2024-03-01T00:00:00.000Z'),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location)
       VALUES ($1, $2, $3, $4, $5, $6);`, [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]);
        // 2. Insert an application for the test user to that job
        const applicationId = (0, crypto_1.randomUUID)();
        const applicationData = {
            id: applicationId,
            user_id: testUserId,
            job_id: jobForApp.id,
            status: 'submitted',
            application_date: new Date('2024-03-05T00:00:00.000Z'),
            notes: 'Cover letter attached.',
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status, application_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6);`, [applicationData.id, applicationData.user_id, applicationData.job_id, applicationData.status, applicationData.application_date.toISOString(), applicationData.notes]);
        // 3. Insert another job and application for a DIFFERENT user (should not appear)
        const otherUserId = (0, crypto_1.randomUUID)();
        const otherUserEmail = `otheruser_${Date.now()}@example.com`;
        yield db_1.db.query('INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4);', [otherUserId, otherUserEmail, 'hashedpass', 'user']);
        const jobForOtherAppId = (0, crypto_1.randomUUID)();
        const jobForOtherApp = {
            id: jobForOtherAppId,
            title: 'Data Analyst',
            company: 'Another Company',
            status: 'open',
            posted_date: new Date('2024-04-01T00:00:00.000Z'),
            location: 'On-site'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location)
       VALUES ($1, $2, $3, $4, $5, $6);`, [jobForOtherApp.id, jobForOtherApp.title, jobForOtherApp.company, jobForOtherApp.status, jobForOtherApp.posted_date.toISOString(), jobForOtherApp.location]);
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status, application_date)
       VALUES ($1, $2, $3, $4, $5);`, [(0, crypto_1.randomUUID)(), otherUserId, jobForOtherApp.id, 'rejected', new Date('2024-04-02T00:00:00.000Z').toISOString()]);
        // 4. Perform the GET /api/applications request
        const res = yield (0, supertest_1.default)(index_1.app).get('/api/applications').set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveLength(1); // Should only return the testUser's application
        expect(res.body.pagination.totalCount).toBe(1);
        const fetchedApp = res.body.data[0];
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
        const parsedApp = application_1.ApplicationDTO.safeParse(fetchedApp);
        expect(parsedApp.success).toBe(true);
        const parsedJobDetails = job_1.JobDTO.safeParse(fetchedApp.job_details);
        expect(parsedJobDetails.success).toBe(true);
        // Clean up the other user
        yield db_1.db.query('DELETE FROM users WHERE id = $1', [otherUserId]);
    }));
    it('GET /api/applications should handle multiple applications and sort them correctly', () => __awaiter(void 0, void 0, void 0, function* () {
        // Insert multiple jobs
        const job1Id = (0, crypto_1.randomUUID)();
        const job2Id = (0, crypto_1.randomUUID)();
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location)
       VALUES ($1, $2, $3, $4, $5, $6);`, [job1Id, 'Frontend Developer', 'Test Company A', 'open', new Date('2024-01-01T00:00:00.000Z').toISOString(), 'Remote']);
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location)
       VALUES ($1, $2, $3, $4, $5, $6);`, [job2Id, 'Backend Developer', 'Test Company B', 'open', new Date('2024-01-02T00:00:00.000Z').toISOString(), 'Hybrid']);
        // Insert multiple applications with different dates
        const app1Id = (0, crypto_1.randomUUID)();
        const app2Id = (0, crypto_1.randomUUID)();
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status, application_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6);`, [app1Id, testUserId, job1Id, 'draft', new Date('2024-01-10T00:00:00.000Z').toISOString(), 'First application']);
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status, application_date, notes)
       VALUES ($1, $2, $3, $4, $5, $6);`, [app2Id, testUserId, job2Id, 'submitted', new Date('2024-01-15T00:00:00.000Z').toISOString(), 'Second application']);
        const res = yield (0, supertest_1.default)(index_1.app).get('/api/applications').set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body.data).toHaveLength(2);
        expect(res.body.pagination.totalCount).toBe(2);
        // Should be sorted by application_date DESC, so the latest should come first
        expect(res.body.data[0].notes).toBe('Second application');
        expect(res.body.data[1].notes).toBe('First application');
        // Verify both have job_details
        expect(res.body.data[0].job_details.title).toBe('Backend Developer');
        expect(res.body.data[1].job_details.title).toBe('Frontend Developer');
    }));
    // --- POST /api/jobs tests ---
    it('POST /api/jobs should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).post('/api/jobs').send({});
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Unauthorized: No token provided.');
    }));
    it('POST /api/jobs should create a new job listing successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        const newJob = {
            title: 'Full Stack Developer',
            company: 'New Tech Co',
            location: 'Remote',
            description: 'Exciting opportunity!',
            url: 'http://newtech.com/careers/fsd',
            status: 'draft'
        };
        const res = yield (0, supertest_1.default)(index_1.app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${authToken}`)
            .send(newJob);
        expect(res.statusCode).toBe(201);
        expect(res.body).toHaveProperty('job');
        expect(res.body).toHaveProperty('application');
        // Verify job data
        expect(res.body.job).toHaveProperty('id');
        expect(typeof res.body.job.id).toBe('string');
        expect(res.body.job.title).toBe(newJob.title);
        expect(res.body.job.company).toBe(newJob.company);
        expect(res.body.job.location).toBe(newJob.location);
        expect(res.body.job.status).toBe('open'); // Job status should be 'open' by default
        // Verify application data
        expect(res.body.application).toHaveProperty('id');
        expect(res.body.application.user_id).toBe(testUserId);
        expect(res.body.application.job_id).toBe(res.body.job.id);
        expect(res.body.application.status).toBe(newJob.status); // Application status
        // Verify it exists in the database
        const dbRes = yield db_1.db.query('SELECT * FROM jobs WHERE id = $1', [res.body.job.id]);
        expect(dbRes.rows).toHaveLength(1);
        expect(dbRes.rows[0].title).toBe(newJob.title);
        // Verify it's returned by GET /api/jobs
        const getRes = yield (0, supertest_1.default)(index_1.app).get('/api/jobs').set('Authorization', `Bearer ${authToken}`);
        expect(getRes.statusCode).toBe(200);
        expect(getRes.body.data.some((job) => job.id === res.body.job.id)).toBe(true);
    }));
    it('POST /api/jobs should return 400 for invalid job data', () => __awaiter(void 0, void 0, void 0, function* () {
        const invalidJob = {
            title: '', // Invalid: min length 1
            company: 123, // Invalid: must be string
        };
        const res = yield (0, supertest_1.default)(index_1.app)
            .post('/api/jobs')
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidJob);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('message', 'Validation error');
        expect(res.body).toHaveProperty('errors');
        expect(Array.isArray(res.body.errors)).toBe(true);
        expect(res.body.errors[0].path).toEqual(['title']);
        expect(res.body.errors[1].path).toEqual(['company']);
    }));
    // --- POST /api/applications tests ---
    it('POST /api/applications should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).post('/api/applications').send({});
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Unauthorized: No token provided.');
    }));
    it('POST /api/applications should return 400 for invalid application data', () => __awaiter(void 0, void 0, void 0, function* () {
        const invalidApp = {
            job_id: 'not-a-uuid', // Invalid UUID
            status: '', // Invalid: min length 1
        };
        const res = yield (0, supertest_1.default)(index_1.app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidApp);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('message', 'Validation error');
        expect(res.body).toHaveProperty('errors');
        expect(Array.isArray(res.body.errors)).toBe(true);
        // Check that we have errors for both fields
        const jobIdError = res.body.errors.find((err) => err.path && err.path.includes('job_id'));
        const statusError = res.body.errors.find((err) => err.path && err.path.includes('status'));
        expect(jobIdError).toBeDefined();
        expect(statusError).toBeDefined();
    }));
    it('POST /api/applications should return 404 if job_id does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
        const nonExistentJobId = '11111111-1111-1111-9111-111111111111'; // A valid UUID, but not in DB
        const appData = {
            job_id: nonExistentJobId,
            status: 'draft',
        };
        const res = yield (0, supertest_1.default)(index_1.app)
            .post('/api/applications')
            .set('Authorization', `Bearer ${authToken}`)
            .send(appData);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Job not found with the provided job_id.');
    }));
    it('POST /api/applications should create a new application successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        // First, create a job to apply to (using direct DB insert to avoid auto-creating application)
        const jobForApplication = {
            id: (0, crypto_1.randomUUID)(),
            title: 'UX Designer',
            company: 'Design Studio',
            status: 'open',
            posted_date: new Date('2025-02-01T09:00:00.000Z'),
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date)
       VALUES ($1, $2, $3, $4, $5)`, [jobForApplication.id, jobForApplication.title, jobForApplication.company, jobForApplication.status, jobForApplication.posted_date.toISOString()]);
        const jobId = jobForApplication.id;
        const newApplication = {
            job_id: jobId,
            status: 'submitted',
            application_date: new Date('2025-02-05T14:00:00.000Z'),
            notes: 'Followed up via email.',
        };
        const res = yield (0, supertest_1.default)(index_1.app)
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
        const dbRes = yield db_1.db.query('SELECT * FROM applications WHERE id = $1', [res.body.id]);
        expect(dbRes.rows).toHaveLength(1);
        expect(dbRes.rows[0].job_id).toBe(jobId);
        expect(dbRes.rows[0].user_id).toBe(testUserId);
        // Verify it's returned by GET /api/applications
        const getRes = yield (0, supertest_1.default)(index_1.app).get('/api/applications').set('Authorization', `Bearer ${authToken}`);
        expect(getRes.statusCode).toBe(200);
        expect(getRes.body.data.some((app) => app.id === res.body.id)).toBe(true);
    }));
    // --- PUT /api/jobs/:id tests ---
    it('PUT /api/jobs/:id should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).put('/api/jobs/some-uuid').send({});
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Unauthorized: No token provided.');
    }));
    it('PUT /api/jobs/:id should return 404 if job does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
        const nonExistentJobId = 'f0e1a0e1-b1c0-d2e3-f4a5-b6c7d8e9f0a1'; // Valid UUID, but not in DB
        const updateData = { title: 'Updated Title', company: 'Updated Company' };
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/jobs/${nonExistentJobId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Job not found.');
    }));
    it('PUT /api/jobs/:id should return 400 for invalid update data', () => __awaiter(void 0, void 0, void 0, function* () {
        // First, create a job
        const jobToUpdate = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job to Update',
            company: 'Company X',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobToUpdate.id, jobToUpdate.title, jobToUpdate.company, jobToUpdate.status, jobToUpdate.posted_date.toISOString(), jobToUpdate.location]);
        const invalidUpdate = { title: '', company: 123 }; // Invalid data
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/jobs/${jobToUpdate.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidUpdate);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('message', 'Validation error');
        expect(Array.isArray(res.body.errors)).toBe(true);
        const titleError = res.body.errors.find((err) => err.path && err.path.includes('title'));
        expect(titleError).toBeDefined();
    }));
    it('PUT /api/jobs/:id should update a job successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        // First, create a job
        const jobToUpdate = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Original Title',
            company: 'Original Co',
            status: 'open',
            posted_date: new Date('2024-05-01T00:00:00.000Z'),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobToUpdate.id, jobToUpdate.title, jobToUpdate.company, jobToUpdate.status, jobToUpdate.posted_date.toISOString(), jobToUpdate.location]);
        const updatedData = {
            title: 'New Title',
            company: 'New Company',
            description: 'Updated description.',
            status: 'closed',
            deadline_date: new Date('2024-06-30T23:59:59.000Z'),
            location: 'New York'
        };
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/jobs/${jobToUpdate.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);
        expect(res.statusCode).toBe(200);
        expect(res.body.id).toBe(jobToUpdate.id);
        expect(res.body.title).toBe(updatedData.title);
        expect(res.body.company).toBe(updatedData.company);
        expect(res.body.description).toBe(updatedData.description);
        expect(res.body.status).toBe(updatedData.status);
        expect(new Date(res.body.deadline_date)).toEqual(updatedData.deadline_date);
        expect(res.body.posted_date).toBeDefined(); // Should still be original posted_date
        // Verify changes in database
        const dbRes = yield db_1.db.query('SELECT * FROM jobs WHERE id = $1', [jobToUpdate.id]);
        expect(dbRes.rows[0].title).toBe(updatedData.title);
        expect(dbRes.rows[0].company).toBe(updatedData.company);
    }));
    it('PUT /api/jobs/:id should return 400 if ID in URL and body mismatch', () => __awaiter(void 0, void 0, void 0, function* () {
        const jobToUpdate = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job to Update',
            company: 'Company Y',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobToUpdate.id, jobToUpdate.title, jobToUpdate.company, jobToUpdate.status, jobToUpdate.posted_date.toISOString(), jobToUpdate.location]);
        const updateData = { id: (0, crypto_1.randomUUID)(), title: 'New Title' }; // Mismatched ID
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/jobs/${jobToUpdate.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Mismatched ID in URL and request body.');
    }));
    // --- DELETE /api/jobs/:id tests ---
    it('DELETE /api/jobs/:id should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).delete('/api/jobs/some-uuid');
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Unauthorized: No token provided.');
    }));
    it('DELETE /api/jobs/:id should return 404 if job does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
        const nonExistentJobId = (0, crypto_1.randomUUID)(); // Valid UUID, but not in DB
        const res = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/jobs/${nonExistentJobId}`)
            .set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Job not found or already deleted.');
    }));
    it('DELETE /api/jobs/:id should delete a job successfully and cascade to applications', () => __awaiter(void 0, void 0, void 0, function* () {
        // 1. Create a job
        const jobToDelete = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job to Delete',
            company: 'Delete Co',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobToDelete.id, jobToDelete.title, jobToDelete.company, jobToDelete.status, jobToDelete.posted_date.toISOString(), jobToDelete.location]);
        // 2. Create an application for that job
        const appToDelete = {
            id: (0, crypto_1.randomUUID)(),
            user_id: testUserId,
            job_id: jobToDelete.id,
            status: 'submitted'
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status) VALUES ($1, $2, $3, $4);`, [appToDelete.id, appToDelete.user_id, appToDelete.job_id, appToDelete.status]);
        // Verify job and application exist
        const jobCheck = yield db_1.db.query('SELECT id FROM jobs WHERE id = $1', [jobToDelete.id]);
        expect(jobCheck.rows).toHaveLength(1);
        const appCheck = yield db_1.db.query('SELECT id FROM applications WHERE id = $1', [appToDelete.id]);
        expect(appCheck.rows).toHaveLength(1);
        // 3. Perform the DELETE operation on the job
        const res = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/jobs/${jobToDelete.id}`)
            .set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(204); // No Content
        // 4. Verify job is deleted
        const jobCheckAfterDelete = yield db_1.db.query('SELECT id FROM jobs WHERE id = $1', [jobToDelete.id]);
        expect(jobCheckAfterDelete.rows).toHaveLength(0);
        // 5. Verify application is also deleted due to cascade
        const appCheckAfterDelete = yield db_1.db.query('SELECT id FROM applications WHERE id = $1', [appToDelete.id]);
        expect(appCheckAfterDelete.rows).toHaveLength(0);
    }));
    // --- PUT /api/applications/:id tests ---
    it('PUT /api/applications/:id should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).put('/api/applications/some-uuid').send({});
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Unauthorized: No token provided.');
    }));
    it('PUT /api/applications/:id should return 404 if application does not exist or does not belong to user', () => __awaiter(void 0, void 0, void 0, function* () {
        // Create a job for the app
        const jobForApp = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job for App',
            company: 'Comp A',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]);
        // Create an application for ANOTHER user
        const anotherUserId = (0, crypto_1.randomUUID)();
        const anotherUserEmail = `anotheruser_${Date.now()}@example.com`;
        yield db_1.db.query('INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4);', [anotherUserId, anotherUserEmail, 'hashedpass', 'user']);
        const appForOtherUser = {
            id: (0, crypto_1.randomUUID)(),
            user_id: anotherUserId,
            job_id: jobForApp.id,
            status: 'draft'
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status) VALUES ($1, $2, $3, $4);`, [appForOtherUser.id, appForOtherUser.user_id, appForOtherUser.job_id, appForOtherUser.status]);
        // Try to update it with authToken (testUser)
        const updateData = { status: 'submitted' };
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/applications/${appForOtherUser.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Application not found or does not belong to user.');
        // Clean up the other user
        yield db_1.db.query('DELETE FROM users WHERE id = $1', [anotherUserId]);
    }));
    it('PUT /api/applications/:id should return 400 for invalid update data', () => __awaiter(void 0, void 0, void 0, function* () {
        // Create a job for the app
        const jobForApp = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job for App 2',
            company: 'Comp B',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]);
        // Create an application
        const appToUpdate = {
            id: (0, crypto_1.randomUUID)(),
            user_id: testUserId,
            job_id: jobForApp.id,
            status: 'draft'
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status) VALUES ($1, $2, $3, $4);`, [appToUpdate.id, appToUpdate.user_id, appToUpdate.job_id, appToUpdate.status]);
        const invalidUpdate = { status: '' }; // Invalid status
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/applications/${appToUpdate.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(invalidUpdate);
        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('message', 'Validation error');
        expect(Array.isArray(res.body.errors)).toBe(true);
        const statusError = res.body.errors.find((err) => err.path && err.path.includes('status'));
        expect(statusError).toBeDefined();
    }));
    it('PUT /api/applications/:id should update an application successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        // Create a job
        const jobForApp = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job for App 3',
            company: 'Comp C',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]);
        // Create a second job for updating job_id
        const newJobForApp = {
            id: (0, crypto_1.randomUUID)(),
            title: 'New Job for App',
            company: 'Comp D',
            status: 'open',
            posted_date: new Date(),
            location: 'Hybrid'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [newJobForApp.id, newJobForApp.title, newJobForApp.company, newJobForApp.status, newJobForApp.posted_date.toISOString(), newJobForApp.location]);
        // Create an application
        const appToUpdate = {
            id: (0, crypto_1.randomUUID)(),
            user_id: testUserId,
            job_id: jobForApp.id,
            status: 'draft',
            application_date: new Date('2024-05-10T00:00:00.000Z')
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status, application_date) VALUES ($1, $2, $3, $4, $5);`, [appToUpdate.id, appToUpdate.user_id, appToUpdate.job_id, appToUpdate.status, appToUpdate.application_date.toISOString()]);
        const updatedData = {
            job_id: newJobForApp.id, // Changing job_id
            status: 'interview',
            notes: 'Scheduled for final interview.',
            application_date: new Date('2024-05-15T10:00:00.000Z'),
            event_type: 'status_change'
        };
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/applications/${appToUpdate.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updatedData);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('application');
        expect(res.body).toHaveProperty('timeline_event');
        // Check application data
        expect(res.body.application.id).toBe(appToUpdate.id);
        expect(res.body.application.user_id).toBe(testUserId);
        expect(res.body.application.job_id).toBe(newJobForApp.id); // Check updated job_id
        expect(res.body.application.status).toBe(updatedData.status);
        expect(res.body.application.notes).toBe(updatedData.notes);
        expect(new Date(res.body.application.application_date)).toEqual(updatedData.application_date);
        // Check timeline event
        expect(res.body.timeline_event.event_type).toBe('status_change');
        // Verify changes in database
        const dbRes = yield db_1.db.query('SELECT * FROM applications WHERE id = $1', [appToUpdate.id]);
        expect(dbRes.rows[0].job_id).toBe(newJobForApp.id);
        expect(dbRes.rows[0].status).toBe(updatedData.status);
    }));
    it('PUT /api/applications/:id should return 404 if new job_id for application does not exist', () => __awaiter(void 0, void 0, void 0, function* () {
        // Create an application
        const jobForApp = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job for App 4',
            company: 'Comp E',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]);
        const appToUpdate = {
            id: (0, crypto_1.randomUUID)(),
            user_id: testUserId,
            job_id: jobForApp.id,
            status: 'draft'
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status) VALUES ($1, $2, $3, $4);`, [appToUpdate.id, appToUpdate.user_id, appToUpdate.job_id, appToUpdate.status]);
        const nonExistentJobId = (0, crypto_1.randomUUID)(); // Valid UUID, but not in DB
        const updateData = {
            status: 'submitted',
            job_id: nonExistentJobId,
            event_type: 'status_change'
        };
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/applications/${appToUpdate.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('New job ID for application not found.');
    }));
    it('PUT /api/applications/:id should return 400 if ID in URL and body mismatch', () => __awaiter(void 0, void 0, void 0, function* () {
        const jobForApp = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job for App 5',
            company: 'Comp F',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]);
        const appToUpdate = {
            id: (0, crypto_1.randomUUID)(),
            user_id: testUserId,
            job_id: jobForApp.id,
            status: 'draft'
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status) VALUES ($1, $2, $3, $4);`, [appToUpdate.id, appToUpdate.user_id, appToUpdate.job_id, appToUpdate.status]);
        const updateData = { id: (0, crypto_1.randomUUID)(), status: 'submitted' }; // Mismatched ID
        const res = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/applications/${appToUpdate.id}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send(updateData);
        expect(res.statusCode).toBe(400);
        expect(res.body.message).toBe('Mismatched ID in URL and request body.');
    }));
    // --- DELETE /api/applications/:id tests ---
    it('DELETE /api/applications/:id should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).delete('/api/applications/some-uuid');
        expect(res.statusCode).toBe(401);
        expect(res.body.message).toBe('Unauthorized: No token provided.');
    }));
    it('DELETE /api/applications/:id should return 404 if application does not exist or does not belong to user', () => __awaiter(void 0, void 0, void 0, function* () {
        // Create a job for the app
        const jobForApp = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job for App Del',
            company: 'Comp G',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]);
        // Create an application for ANOTHER user
        const anotherUserId = (0, crypto_1.randomUUID)();
        const anotherUserEmail = `anotheruser2_${Date.now()}@example.com`;
        yield db_1.db.query('INSERT INTO users (id, email, password_hash, role) VALUES ($1, $2, $3, $4);', [anotherUserId, anotherUserEmail, 'hashedpass', 'user']);
        const appForOtherUser = {
            id: (0, crypto_1.randomUUID)(),
            user_id: anotherUserId,
            job_id: jobForApp.id,
            status: 'draft'
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status) VALUES ($1, $2, $3, $4);`, [appForOtherUser.id, appForOtherUser.user_id, appForOtherUser.job_id, appForOtherUser.status]);
        // Try to delete it with authToken (testUser)
        const res = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/applications/${appForOtherUser.id}`)
            .set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(404);
        expect(res.body.message).toBe('Application not found or does not belong to user.');
        // Clean up the other user
        yield db_1.db.query('DELETE FROM users WHERE id = $1', [anotherUserId]);
    }));
    it('DELETE /api/applications/:id should delete an application successfully', () => __awaiter(void 0, void 0, void 0, function* () {
        // Create a job for the app
        const jobForApp = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Job for App Del 2',
            company: 'Comp H',
            status: 'open',
            posted_date: new Date(),
            location: 'Remote'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, status, posted_date, location) VALUES ($1, $2, $3, $4, $5, $6);`, [jobForApp.id, jobForApp.title, jobForApp.company, jobForApp.status, jobForApp.posted_date.toISOString(), jobForApp.location]);
        // Create an application
        const appToDelete = {
            id: (0, crypto_1.randomUUID)(),
            user_id: testUserId,
            job_id: jobForApp.id,
            status: 'submitted'
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status) VALUES ($1, $2, $3, $4);`, [appToDelete.id, appToDelete.user_id, appToDelete.job_id, appToDelete.status]);
        // Verify application exists
        const appCheck = yield db_1.db.query('SELECT id FROM applications WHERE id = $1', [appToDelete.id]);
        expect(appCheck.rows).toHaveLength(1);
        // Perform the DELETE operation
        const res = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/applications/${appToDelete.id}`)
            .set('Authorization', `Bearer ${authToken}`);
        expect(res.statusCode).toBe(204); // No Content
        // Verify application is deleted
        const appCheckAfterDelete = yield db_1.db.query('SELECT id FROM applications WHERE id = $1', [appToDelete.id]);
        expect(appCheckAfterDelete.rows).toHaveLength(0);
    }));
});
