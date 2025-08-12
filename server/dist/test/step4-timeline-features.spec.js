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
// server/test/step4-timeline-features.spec.ts
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
const db_1 = require("../src/db");
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
// Mock user for testing authentication
const testUser = {
    email: `timelineuser_${Date.now()}@example.com`,
    password: 'Password123!',
    forename: 'Timeline',
    surname: 'User',
};
let testUserId;
let authToken;
let testJobId;
let testApplicationId;
describe('Step 4 Timeline Features', () => {
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
        // Create a test job
        const testJob = {
            id: (0, crypto_1.randomUUID)(),
            title: 'Test Timeline Job',
            company: 'Timeline Test Hospital',
            location: 'Test City',
            description: 'Test job for timeline features',
            url: `https://example.com/job-${Date.now()}`,
            status: 'open'
        };
        yield db_1.db.query(`INSERT INTO jobs (id, title, company, location, description, url, status) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`, [testJob.id, testJob.title, testJob.company, testJob.location, testJob.description, testJob.url, testJob.status]);
        testJobId = testJob.id;
        // Create a test application
        const testApplication = {
            id: (0, crypto_1.randomUUID)(),
            user_id: testUserId,
            job_id: testJobId,
            status: 'draft',
            notes: 'Initial application notes'
        };
        yield db_1.db.query(`INSERT INTO applications (id, user_id, job_id, status, notes) 
       VALUES ($1, $2, $3, $4, $5)`, [testApplication.id, testApplication.user_id, testApplication.job_id, testApplication.status, testApplication.notes]);
        testApplicationId = testApplication.id;
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clean up test data
        yield db_1.db.query('DELETE FROM applications WHERE user_id = $1', [testUserId]);
        yield db_1.db.query('DELETE FROM jobs WHERE id = $1', [testJobId]);
        yield db_1.db.query('DELETE FROM users WHERE id = $1', [testUserId]);
    }));
    describe('4-C: GET /api/jobs/:id - Job with Timeline', () => {
        it('should return job details with application timeline for authenticated user', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .get(`/api/jobs/${testJobId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('job');
            expect(res.body).toHaveProperty('application');
            expect(res.body).toHaveProperty('has_application', true);
            expect(res.body).toHaveProperty('timeline_summary');
            expect(res.body).toHaveProperty('timeline');
            // Verify job data structure
            expect(res.body.job.id).toBe(testJobId);
            expect(res.body.job.title).toBe('Test Timeline Job');
            // Verify application data
            expect(res.body.application.id).toBe(testApplicationId);
            expect(res.body.application.status).toBe('draft');
            // Verify timeline structure
            expect(res.body.timeline).toBeInstanceOf(Array);
            expect(res.body.timeline.length).toBeGreaterThan(0);
            // Verify timeline summary
            expect(res.body.timeline_summary.current_status).toBe('draft');
            expect(res.body.timeline_summary).toHaveProperty('total_events');
            expect(res.body.timeline_summary).toHaveProperty('next_suggested_action');
        }));
        it('should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .get(`/api/jobs/${testJobId}`);
            expect(res.statusCode).toBe(401);
            expect(res.body).toHaveProperty('message', 'Unauthorized: No token provided.');
        }));
        it('should return 400 for invalid UUID format', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .get('/api/jobs/invalid-uuid')
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('message', 'Invalid job ID format. Must be a valid UUID.');
        }));
        it('should return 404 for non-existent job', () => __awaiter(void 0, void 0, void 0, function* () {
            const nonExistentJobId = (0, crypto_1.randomUUID)();
            const res = yield (0, supertest_1.default)(index_1.app)
                .get(`/api/jobs/${nonExistentJobId}`)
                .set('Authorization', `Bearer ${authToken}`);
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('message', 'Job not found.');
        }));
        it('should return job without application for user with no application', () => __awaiter(void 0, void 0, void 0, function* () {
            // Create another user
            const otherUser = {
                email: `other_${Date.now()}@example.com`,
                password: 'Password123!',
                forename: 'Other',
                surname: 'User',
            };
            const registerRes = yield (0, supertest_1.default)(index_1.app)
                .post('/api/auth/register')
                .send(otherUser);
            const otherToken = registerRes.body.token;
            // Decode token to get user id
            const decoded = jsonwebtoken_1.default.decode(registerRes.body.token);
            const otherUserId = decoded === null || decoded === void 0 ? void 0 : decoded.id;
            try {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get(`/api/jobs/${testJobId}`)
                    .set('Authorization', `Bearer ${otherToken}`);
                expect(res.statusCode).toBe(200);
                expect(res.body).toHaveProperty('job');
                expect(res.body).toHaveProperty('application', null);
                expect(res.body).toHaveProperty('has_application', false);
                expect(res.body).toHaveProperty('timeline_summary', null);
                expect(res.body).toHaveProperty('timeline');
                expect(res.body.timeline).toEqual([]);
            }
            finally {
                // Clean up other user
                yield db_1.db.query('DELETE FROM users WHERE id = $1', [otherUserId]);
            }
        }));
    });
    describe('4-D: PATCH /api/jobs/:id/status - Job Status Management', () => {
        it('should update job status successfully', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .patch(`/api/jobs/${testJobId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'closed' });
            expect(res.statusCode).toBe(200);
            expect(res.body).toHaveProperty('message', 'Job status updated successfully');
            expect(res.body).toHaveProperty('job');
            expect(res.body.job.status).toBe('closed');
            expect(res.body.job.id).toBe(testJobId);
            // Reset status for other tests
            yield db_1.db.query('UPDATE jobs SET status = $1 WHERE id = $2', ['open', testJobId]);
        }));
        it('should return 401 if no authentication token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .patch(`/api/jobs/${testJobId}/status`)
                .send({ status: 'closed' });
            expect(res.statusCode).toBe(401);
            expect(res.body).toHaveProperty('message', 'Unauthorized: No token provided.');
        }));
        it('should return 400 for invalid status value', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .patch(`/api/jobs/${testJobId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'invalid_status' });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('message', 'Validation error');
            expect(res.body).toHaveProperty('errors');
        }));
        it('should return 400 for invalid UUID format', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .patch('/api/jobs/invalid-uuid/status')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'closed' });
            expect(res.statusCode).toBe(400);
            expect(res.body).toHaveProperty('message', 'Invalid job ID format. Must be a valid UUID.');
        }));
        it('should return 404 for non-existent job', () => __awaiter(void 0, void 0, void 0, function* () {
            const nonExistentJobId = (0, crypto_1.randomUUID)();
            const res = yield (0, supertest_1.default)(index_1.app)
                .patch(`/api/jobs/${nonExistentJobId}/status`)
                .set('Authorization', `Bearer ${authToken}`)
                .send({ status: 'closed' });
            expect(res.statusCode).toBe(404);
            expect(res.body).toHaveProperty('message', 'Job not found.');
        }));
        it('should accept all valid status values', () => __awaiter(void 0, void 0, void 0, function* () {
            const validStatuses = ['open', 'closed', 'archived'];
            for (const status of validStatuses) {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .patch(`/api/jobs/${testJobId}/status`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ status });
                expect(res.statusCode).toBe(200);
                expect(res.body.job.status).toBe(status);
            }
            // Reset to open for other tests
            yield db_1.db.query('UPDATE jobs SET status = $1 WHERE id = $2', ['open', testJobId]);
        }));
    });
    describe('4-E: Enhanced Timeline Management', () => {
        describe('Timeline-focused Application Updates', () => {
            it('should update application status with timeline event tracking', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .put(`/api/applications/${testApplicationId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    status: 'submitted',
                    notes: 'Application submitted via NHS portal',
                    event_type: 'status_change'
                });
                expect(res.statusCode).toBe(200);
                expect(res.body).toHaveProperty('application');
                expect(res.body).toHaveProperty('timeline_event');
                expect(res.body).toHaveProperty('message');
                // Verify application was updated
                expect(res.body.application.status).toBe('submitted');
                expect(res.body.application.notes).toBe('Application submitted via NHS portal');
                // Verify timeline event was created
                expect(res.body.timeline_event.event_type).toBe('status_change');
                expect(res.body.timeline_event.previous_value).toBe('draft');
                expect(res.body.timeline_event.new_value).toBe('submitted');
                expect(res.body.timeline_event.field_changed).toBe('status');
            }));
            it('should add notes without status change', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .put(`/api/applications/${testApplicationId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    notes: 'Follow-up email sent to HR department',
                    event_type: 'note_added'
                });
                expect(res.statusCode).toBe(200);
                expect(res.body).toHaveProperty('timeline_event');
                expect(res.body.timeline_event.event_type).toBe('note_added');
                expect(res.body.timeline_event.new_value).toBe('Follow-up email sent to HR department');
            }));
            it('should handle interview scheduling', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .put(`/api/applications/${testApplicationId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    status: 'interview',
                    notes: 'Phone interview scheduled for Friday 2pm',
                    event_type: 'interview_scheduled',
                    application_date: '2025-08-05T14:00:00Z'
                });
                expect(res.statusCode).toBe(200);
                expect(res.body.application.status).toBe('interview');
                expect(res.body.timeline_event.event_type).toBe('interview_scheduled');
                expect(res.body.message).toContain('interview scheduled');
            }));
            it('should validate timeline update data', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .put(`/api/applications/${testApplicationId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    status: 'invalid_status',
                    event_type: 'status_change'
                });
                expect(res.statusCode).toBe(400);
                expect(res.body).toHaveProperty('message', 'Validation error');
            }));
        });
        describe('Application Timeline History', () => {
            it('should retrieve complete timeline for an application', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get(`/api/applications/${testApplicationId}/timeline`)
                    .set('Authorization', `Bearer ${authToken}`);
                expect(res.statusCode).toBe(200);
                expect(res.body).toHaveProperty('application_id', testApplicationId);
                expect(res.body).toHaveProperty('timeline');
                expect(res.body).toHaveProperty('timeline_summary');
                // Verify timeline structure
                expect(res.body.timeline).toBeInstanceOf(Array);
                expect(res.body.timeline.length).toBeGreaterThan(0);
                // Verify timeline events have proper structure
                const firstEvent = res.body.timeline[0];
                expect(firstEvent).toHaveProperty('event_type');
                expect(firstEvent).toHaveProperty('timestamp');
                expect(firstEvent).toHaveProperty('status');
                // Verify timeline summary
                expect(res.body.timeline_summary).toHaveProperty('total_events');
                expect(res.body.timeline_summary).toHaveProperty('current_status');
                expect(res.body.timeline_summary).toHaveProperty('duration_days');
                expect(res.body.timeline_summary.total_events).toBeGreaterThan(0);
            }));
            it('should return 401 if no authentication token provided', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get(`/api/applications/${testApplicationId}/timeline`);
                expect(res.statusCode).toBe(401);
                expect(res.body).toHaveProperty('message', 'Unauthorized: No token provided.');
            }));
            it('should return 400 for invalid UUID format', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications/invalid-uuid/timeline')
                    .set('Authorization', `Bearer ${authToken}`);
                expect(res.statusCode).toBe(400);
                expect(res.body).toHaveProperty('message', 'Invalid application ID format. Must be a valid UUID.');
            }));
            it('should return 404 for non-existent application', () => __awaiter(void 0, void 0, void 0, function* () {
                const nonExistentAppId = (0, crypto_1.randomUUID)();
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get(`/api/applications/${nonExistentAppId}/timeline`)
                    .set('Authorization', `Bearer ${authToken}`);
                expect(res.statusCode).toBe(404);
                expect(res.body).toHaveProperty('message', 'Application not found or does not belong to user.');
            }));
            it('should not allow access to other users\' application timelines', () => __awaiter(void 0, void 0, void 0, function* () {
                // Create another user and application
                const otherUser = {
                    email: `other2_${Date.now()}@example.com`,
                    password: 'Password123!',
                    forename: 'Other',
                    surname: 'User2',
                };
                const registerRes = yield (0, supertest_1.default)(index_1.app)
                    .post('/api/auth/register')
                    .send(otherUser);
                const otherToken = registerRes.body.token;
                // Decode token to get user id
                const decoded = jsonwebtoken_1.default.decode(registerRes.body.token);
                const otherUserId = decoded === null || decoded === void 0 ? void 0 : decoded.id;
                try {
                    const res = yield (0, supertest_1.default)(index_1.app)
                        .get(`/api/applications/${testApplicationId}/timeline`)
                        .set('Authorization', `Bearer ${otherToken}`);
                    expect(res.statusCode).toBe(404);
                    expect(res.body).toHaveProperty('message', 'Application not found or does not belong to user.');
                }
                finally {
                    // Clean up other user
                    yield db_1.db.query('DELETE FROM users WHERE id = $1', [otherUserId]);
                }
            }));
        });
    });
    describe('Integration Tests', () => {
        it('should create job with application and retrieve with timeline', () => __awaiter(void 0, void 0, void 0, function* () {
            // Step 1: Create job using POST /api/jobs (Step 4-B)
            const newJobData = {
                title: 'Integration Test Job',
                company: 'Integration Hospital',
                location: 'Integration City',
                url: `https://example.com/integration-${Date.now()}`,
                description: 'Integration test job',
                status: 'draft'
            };
            const createRes = yield (0, supertest_1.default)(index_1.app)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${authToken}`)
                .send(newJobData);
            expect(createRes.statusCode).toBe(201);
            expect(createRes.body).toHaveProperty('job');
            expect(createRes.body).toHaveProperty('application');
            const createdJobId = createRes.body.job.id;
            const createdAppId = createRes.body.application.id;
            try {
                // Step 2: Retrieve job with timeline (Step 4-C)
                const getRes = yield (0, supertest_1.default)(index_1.app)
                    .get(`/api/jobs/${createdJobId}`)
                    .set('Authorization', `Bearer ${authToken}`);
                expect(getRes.statusCode).toBe(200);
                expect(getRes.body.has_application).toBe(true);
                expect(getRes.body.timeline).toBeInstanceOf(Array);
                // Step 3: Update application status (Step 4-E)
                const updateRes = yield (0, supertest_1.default)(index_1.app)
                    .put(`/api/applications/${createdAppId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({
                    status: 'submitted',
                    notes: 'Integration test submission',
                    event_type: 'status_change'
                });
                expect(updateRes.statusCode).toBe(200);
                expect(updateRes.body.timeline_event.event_type).toBe('status_change');
                // Step 4: Update job status (Step 4-D)
                const jobUpdateRes = yield (0, supertest_1.default)(index_1.app)
                    .patch(`/api/jobs/${createdJobId}/status`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ status: 'closed' });
                expect(jobUpdateRes.statusCode).toBe(200);
                expect(jobUpdateRes.body.job.status).toBe('closed');
                // Step 5: Retrieve timeline history (Step 4-E)
                const timelineRes = yield (0, supertest_1.default)(index_1.app)
                    .get(`/api/applications/${createdAppId}/timeline`)
                    .set('Authorization', `Bearer ${authToken}`);
                expect(timelineRes.statusCode).toBe(200);
                expect(timelineRes.body.timeline.length).toBeGreaterThan(1);
            }
            finally {
                // Clean up integration test data
                yield db_1.db.query('DELETE FROM applications WHERE id = $1', [createdAppId]);
                yield db_1.db.query('DELETE FROM jobs WHERE id = $1', [createdJobId]);
            }
        }));
    });
});
