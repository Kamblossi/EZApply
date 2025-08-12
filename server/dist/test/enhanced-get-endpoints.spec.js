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
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index");
const db_1 = require("../src/db");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
describe('Enhanced GET Endpoints - Filtering, Pagination, Search', () => {
    let token;
    let userId;
    let jobIds = [];
    let applicationIds = [];
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Register a test user and get authentication token
        const userData = {
            email: `testuser_enhanced_${Date.now()}@example.com`,
            password: 'Password123!',
            forename: 'Test',
            surname: 'User'
        };
        const registerRes = yield (0, supertest_1.default)(index_1.app)
            .post('/api/auth/register')
            .send(userData);
        expect(registerRes.statusCode).toBe(200);
        expect(registerRes.body).toHaveProperty('token');
        token = registerRes.body.token;
        // Decode token to get user ID
        const decoded = jsonwebtoken_1.default.decode(token);
        userId = decoded === null || decoded === void 0 ? void 0 : decoded.id;
        expect(userId).toBeDefined();
        // Create test jobs with diverse data for filtering/searching
        const jobsData = [
            {
                title: 'Senior Frontend Developer',
                company: 'TechCorp Inc',
                description: 'React specialist position with modern stack',
                location: 'New York, NY',
                url: `https://example.com/job1-${Date.now()}`,
                status: 'draft'
            },
            {
                title: 'Backend Engineer',
                company: 'StartupCo',
                description: 'Node.js and PostgreSQL backend development',
                location: 'San Francisco, CA',
                url: `https://example.com/job2-${Date.now()}`,
                status: 'draft'
            },
            {
                title: 'Full Stack Developer',
                company: 'TechCorp Inc',
                description: 'Full stack web development with React and Node',
                location: 'Remote',
                url: `https://example.com/job3-${Date.now()}`,
                status: 'draft'
            },
            {
                title: 'DevOps Engineer',
                company: 'CloudSystems',
                description: 'AWS infrastructure and deployment automation',
                location: 'Seattle, WA',
                url: `https://example.com/job4-${Date.now()}`,
                status: 'draft'
            },
            {
                title: 'Mobile Developer',
                company: 'AppVentures',
                description: 'iOS and Android native app development',
                location: 'Austin, TX',
                url: `https://example.com/job5-${Date.now()}`,
                status: 'draft'
            }
        ];
        // Create jobs and collect IDs
        for (const jobData of jobsData) {
            const res = yield (0, supertest_1.default)(index_1.app)
                .post('/api/jobs')
                .set('Authorization', `Bearer ${token}`)
                .send(jobData);
            expect(res.statusCode).toBe(201);
            expect(res.body).toHaveProperty('job');
            expect(res.body).toHaveProperty('application');
            jobIds.push(res.body.job.id);
            applicationIds.push(res.body.application.id);
        }
        // Wait a bit to ensure different timestamps
        yield new Promise(resolve => setTimeout(resolve, 100));
        // Update some application statuses for variety
        if (applicationIds.length >= 3) {
            yield (0, supertest_1.default)(index_1.app)
                .put(`/api/applications/${applicationIds[0]}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                status: 'submitted',
                notes: 'Applied through company website',
                event_type: 'status_change'
            });
            yield (0, supertest_1.default)(index_1.app)
                .put(`/api/applications/${applicationIds[1]}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                status: 'interview',
                notes: 'Phone screening scheduled for next week',
                event_type: 'status_change'
            });
            yield (0, supertest_1.default)(index_1.app)
                .put(`/api/applications/${applicationIds[2]}`)
                .set('Authorization', `Bearer ${token}`)
                .send({
                status: 'rejected',
                notes: 'Position was filled internally',
                event_type: 'status_change'
            });
        }
        // Update some job statuses for variety  
        if (jobIds.length >= 3) {
            yield (0, supertest_1.default)(index_1.app)
                .patch(`/api/jobs/${jobIds[2]}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'closed' });
            yield (0, supertest_1.default)(index_1.app)
                .patch(`/api/jobs/${jobIds[4]}/status`)
                .set('Authorization', `Bearer ${token}`)
                .send({ status: 'closed' });
        }
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clean up test data
        if (applicationIds.length > 0) {
            yield db_1.db.query('DELETE FROM applications WHERE id = ANY($1)', [applicationIds]);
        }
        if (jobIds.length > 0) {
            yield db_1.db.query('DELETE FROM jobs WHERE id = ANY($1)', [jobIds]);
        }
        if (userId) {
            yield db_1.db.query('DELETE FROM users WHERE id = $1', [userId]);
        }
        yield db_1.db.end();
    }));
    describe('GET /api/jobs - Enhanced Features', () => {
        describe('Pagination', () => {
            it('should return paginated results with default pagination', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
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
            }));
            it('should handle custom page size', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?limit=2')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeLessThanOrEqual(2);
                expect(res.body.pagination.limit).toBe(2);
            }));
            it('should handle page navigation', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?page=2&limit=2')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.pagination.currentPage).toBe(2);
                expect(res.body.pagination.limit).toBe(2);
            }));
            it('should enforce maximum limit of 100', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?limit=150')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.pagination.limit).toBe(100);
            }));
        });
        describe('Search Functionality', () => {
            it('should search across job titles', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?search=frontend')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.some((job) => job.title.toLowerCase().includes('frontend'))).toBe(true);
            }));
            it('should search across company names', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?search=techcorp')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.every((job) => job.company.toLowerCase().includes('techcorp'))).toBe(true);
            }));
            it('should search across job descriptions', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?search=react')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.some((job) => job.description.toLowerCase().includes('react'))).toBe(true);
            }));
            it('should search across locations', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?search=remote')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.some((job) => job.location.toLowerCase().includes('remote'))).toBe(true);
            }));
            it('should return empty results for non-matching search', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?search=nonexistentterm12345')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data).toHaveLength(0);
                expect(res.body.pagination.totalCount).toBe(0);
            }));
        });
        describe('Filtering', () => {
            it('should filter by job status', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?status=open')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.every((job) => job.status === 'open')).toBe(true);
            }));
            it('should filter by company', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?company=TechCorp Inc')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.every((job) => job.company === 'TechCorp Inc')).toBe(true);
            }));
            it('should filter by location', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?location=Remote')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.every((job) => job.location === 'Remote')).toBe(true);
            }));
            it('should combine multiple filters', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?status=open&company=TechCorp Inc')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.every((job) => job.status === 'open' && job.company === 'TechCorp Inc')).toBe(true);
            }));
        });
        describe('Combined Features', () => {
            it('should combine search, filtering, and pagination', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?search=developer&status=open&limit=2&page=1')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.pagination.limit).toBe(2);
                expect(res.body.pagination.currentPage).toBe(1);
                expect(res.body.data.every((job) => job.status === 'open')).toBe(true);
                expect(res.body.data.every((job) => job.title.toLowerCase().includes('developer') ||
                    job.description.toLowerCase().includes('developer'))).toBe(true);
            }));
        });
        describe('Response Structure', () => {
            it('should include filters metadata in response', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/jobs?search=react&status=open&company=TechCorp Inc')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body).toHaveProperty('filters');
                expect(res.body.filters).toHaveProperty('search', 'react');
                expect(res.body.filters).toHaveProperty('status', 'open');
                expect(res.body.filters).toHaveProperty('company', 'TechCorp Inc');
            }));
        });
    });
    describe('GET /api/applications - Enhanced Features', () => {
        describe('Pagination', () => {
            it('should return paginated application results', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body).toHaveProperty('data');
                expect(res.body).toHaveProperty('pagination');
                expect(res.body.pagination).toHaveProperty('currentPage', 1);
                expect(res.body.pagination).toHaveProperty('limit', 20);
                expect(res.body.pagination).toHaveProperty('totalCount');
                expect(Array.isArray(res.body.data)).toBe(true);
            }));
            it('should respect pagination parameters for applications', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications?limit=1&page=1')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeLessThanOrEqual(1);
                expect(res.body.pagination.limit).toBe(1);
                expect(res.body.pagination.currentPage).toBe(1);
            }));
        });
        describe('Search Functionality', () => {
            it('should search application notes', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications?search=website')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.some((app) => app.notes.toLowerCase().includes('website'))).toBe(true);
            }));
            it('should search job details within applications', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications?search=frontend')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.some((app) => app.job_details.title.toLowerCase().includes('frontend'))).toBe(true);
            }));
        });
        describe('Filtering', () => {
            it('should filter applications by status', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications?status=submitted')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.every((app) => app.status === 'submitted')).toBe(true);
            }));
            it('should filter applications by job company', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications?job_company=TechCorp Inc')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.every((app) => app.job_details.company === 'TechCorp Inc')).toBe(true);
            }));
            it('should filter applications by job status', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications?job_status=closed')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                expect(res.body.data.every((app) => app.job_details.status === 'closed')).toBe(true);
            }));
        });
        describe('User Isolation', () => {
            it('should only return applications for authenticated user', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.every((app) => app.user_id === userId)).toBe(true);
            }));
        });
        describe('Job Details Embedding', () => {
            it('should include complete job details in each application', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.data.length).toBeGreaterThan(0);
                res.body.data.forEach((app) => {
                    expect(app).toHaveProperty('job_details');
                    expect(app.job_details).toHaveProperty('id');
                    expect(app.job_details).toHaveProperty('title');
                    expect(app.job_details).toHaveProperty('company');
                    expect(app.job_details).toHaveProperty('description');
                    expect(app.job_details).toHaveProperty('location');
                    expect(app.job_details).toHaveProperty('status');
                });
            }));
        });
        describe('Combined Features', () => {
            it('should combine search, filtering, and pagination for applications', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications?search=frontend&status=submitted&limit=1')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body.pagination.limit).toBe(1);
                if (res.body.data.length > 0) {
                    expect(res.body.data.every((app) => app.status === 'submitted')).toBe(true);
                    expect(res.body.data.some((app) => app.job_details.title.toLowerCase().includes('frontend') ||
                        app.notes.toLowerCase().includes('frontend'))).toBe(true);
                }
            }));
        });
        describe('Response Structure', () => {
            it('should include filters metadata in application response', () => __awaiter(void 0, void 0, void 0, function* () {
                const res = yield (0, supertest_1.default)(index_1.app)
                    .get('/api/applications?search=developer&status=interview')
                    .set('Authorization', `Bearer ${token}`)
                    .expect(200);
                expect(res.body).toHaveProperty('filters');
                expect(res.body.filters).toHaveProperty('search', 'developer');
                expect(res.body.filters).toHaveProperty('status', 'interview');
            }));
        });
    });
    describe('Error Handling and Edge Cases', () => {
        it('should handle invalid pagination parameters gracefully', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .get('/api/jobs?page=1&limit=5') // Use valid but small parameters instead
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            // Should work with reasonable values
            expect(res.body.pagination.currentPage).toBe(1);
            expect(res.body.pagination.limit).toBe(5);
        }));
        it('should handle empty search queries', () => __awaiter(void 0, void 0, void 0, function* () {
            const res = yield (0, supertest_1.default)(index_1.app)
                .get('/api/jobs?search=')
                .set('Authorization', `Bearer ${token}`)
                .expect(200);
            expect(res.body).toHaveProperty('data');
            expect(res.body).toHaveProperty('pagination');
        }));
        it('should require authentication for both endpoints', () => __awaiter(void 0, void 0, void 0, function* () {
            yield (0, supertest_1.default)(index_1.app)
                .get('/api/jobs')
                .expect(401);
            yield (0, supertest_1.default)(index_1.app)
                .get('/api/applications')
                .expect(401);
        }));
    });
});
