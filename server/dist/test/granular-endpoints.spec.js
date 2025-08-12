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
// test/granular-endpoints.spec.ts
const globals_1 = require("@jest/globals");
const supertest_1 = __importDefault(require("supertest"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../src/index");
const db_1 = require("../src/db"); // Use the shared database connection
let authToken;
let userId;
let userProfileId;
(0, globals_1.beforeAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    // Clean up existing test data
    yield db_1.db.query('DELETE FROM users WHERE email = $1', ['granular.test@example.com']);
    // Register a user for testing
    const registerResponse = yield (0, supertest_1.default)(index_1.app)
        .post('/api/auth/register')
        .send({
        email: 'granular.test@example.com',
        password: 'Test123!',
        forename: 'Granular',
        surname: 'User',
    });
    // Debug registration response
    if (registerResponse.status !== 200) {
        console.error('Registration failed:', registerResponse.status, registerResponse.body);
        throw new Error(`Registration failed with status ${registerResponse.status}`);
    }
    authToken = registerResponse.body.token;
    // Debug token
    if (!authToken) {
        console.error('No token in response:', registerResponse.body);
        throw new Error('No token received from registration');
    }
    // Decode JWT to get user ID
    const decoded = jsonwebtoken_1.default.decode(authToken);
    if (!decoded || !decoded.id) {
        console.error('Failed to decode token:', authToken);
        console.error('Decoded result:', decoded);
        throw new Error('Failed to decode JWT token');
    }
    userId = decoded.id;
    // Create a profile for testing granular endpoints
    const profileResponse = yield (0, supertest_1.default)(index_1.app)
        .put('/api/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
        forename: 'Granular',
        surname: 'Test',
        mobile_phone: '1234567890',
        email: 'granular.test@example.com'
    });
    userProfileId = profileResponse.body.id;
}));
(0, globals_1.afterAll)(() => __awaiter(void 0, void 0, void 0, function* () {
    // Clean up test data
    yield db_1.db.query('DELETE FROM users WHERE email = $1', ['granular.test@example.com']);
    // Don't call db.end() since db is shared - it will be managed by the test framework
}));
(0, globals_1.describe)('Granular Employment Endpoints', () => {
    let employmentId;
    (0, globals_1.it)('should create a new employment record', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .post('/api/profile/employment')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            employer: 'Test Company',
            position: 'Software Developer',
            start_date: '2020-01-01',
            end_date: '2023-12-31',
            responsibilities: 'Developed software applications',
            reason_for_leaving: 'New opportunity',
            salary_information: '75000'
        });
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.body.employer).toBe('Test Company');
        (0, globals_1.expect)(response.body.position).toBe('Software Developer');
        employmentId = response.body.id;
    }));
    (0, globals_1.it)('should get all employment records for the user', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .get('/api/profile/employment')
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toHaveLength(1);
        (0, globals_1.expect)(response.body.data[0].employer).toBe('Test Company');
    }));
    (0, globals_1.it)('should get a specific employment record', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .get(`/api/profile/employment/${employmentId}`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.employer).toBe('Test Company');
        (0, globals_1.expect)(response.body.id).toBe(employmentId);
    }));
    (0, globals_1.it)('should update an employment record', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/profile/employment/${employmentId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            employer: 'Updated Company',
            position: 'Senior Software Developer',
            start_date: '2020-01-01',
            end_date: '2023-12-31',
            responsibilities: 'Led development team',
            reason_for_leaving: 'Career advancement',
            salary_information: '85000'
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.employer).toBe('Updated Company');
        (0, globals_1.expect)(response.body.position).toBe('Senior Software Developer');
    }));
    (0, globals_1.it)('should delete an employment record', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/profile/employment/${employmentId}`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(204);
        // Verify it's deleted
        const getResponse = yield (0, supertest_1.default)(index_1.app)
            .get(`/api/profile/employment/${employmentId}`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(getResponse.status).toBe(404);
    }));
});
(0, globals_1.describe)('Granular Education Endpoints', () => {
    let educationId;
    (0, globals_1.it)('should create a new education record', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .post('/api/profile/education')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            institution: 'Test University',
            qualification_type: 'Bachelor',
            degree_diploma: 'Computer Science',
            field_of_study: 'Software Engineering',
            start_date: '2016-09-01',
            end_date: '2020-06-01',
            grade_score: 'First Class Honours'
        });
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.body.institution).toBe('Test University');
        (0, globals_1.expect)(response.body.degree_diploma).toBe('Computer Science');
        educationId = response.body.id;
    }));
    (0, globals_1.it)('should get all education records for the user', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .get('/api/profile/education')
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toHaveLength(1);
        (0, globals_1.expect)(response.body.data[0].institution).toBe('Test University');
    }));
    (0, globals_1.it)('should update an education record', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/profile/education/${educationId}`)
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            institution: 'Updated University',
            qualification_type: 'Bachelor',
            degree_diploma: 'Computer Science',
            field_of_study: 'Software Engineering',
            start_date: '2016-09-01',
            end_date: '2020-06-01',
            grade_score: 'First Class Honours'
        });
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.institution).toBe('Updated University');
    }));
    (0, globals_1.it)('should delete an education record', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/profile/education/${educationId}`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(204);
    }));
});
(0, globals_1.describe)('Granular References Endpoints', () => {
    let referenceId;
    (0, globals_1.it)('should create a new reference contact', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .post('/api/profile/references')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            name: 'John Doe',
            relationship: 'Former Manager',
            email: 'john.doe@example.com',
            phone: '555-0123',
            company: 'Previous Company',
            position: 'Engineering Manager'
        });
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.body.name).toBe('John Doe');
        (0, globals_1.expect)(response.body.relationship).toBe('Former Manager');
        referenceId = response.body.id;
    }));
    (0, globals_1.it)('should get all reference contacts for the user', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .get('/api/profile/references')
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toHaveLength(1);
        (0, globals_1.expect)(response.body.data[0].name).toBe('John Doe');
    }));
    (0, globals_1.it)('should delete a reference contact', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/profile/references/${referenceId}`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(204);
    }));
});
(0, globals_1.describe)('Granular Skills Endpoints', () => {
    let skillId;
    (0, globals_1.it)('should create a new user skill', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .post('/api/profile/skills')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            skill_name: 'JavaScript',
            proficiency_level: 'Advanced',
            category: 'Programming Language'
        });
        (0, globals_1.expect)(response.status).toBe(201);
        (0, globals_1.expect)(response.body.skill_name).toBe('JavaScript');
        (0, globals_1.expect)(response.body.proficiency_level).toBe('Advanced');
        skillId = response.body.id;
    }));
    (0, globals_1.it)('should get all user skills for the user', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .get('/api/profile/skills')
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(200);
        (0, globals_1.expect)(response.body.data).toHaveLength(1);
        (0, globals_1.expect)(response.body.data[0].skill_name).toBe('JavaScript');
    }));
    (0, globals_1.it)('should delete a user skill', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/profile/skills/${skillId}`)
            .set('Authorization', `Bearer ${authToken}`);
        (0, globals_1.expect)(response.status).toBe(204);
    }));
});
(0, globals_1.describe)('User Isolation Tests', () => {
    let otherAuthToken;
    let otherUserId;
    let testEmploymentId;
    (0, globals_1.beforeEach)(() => __awaiter(void 0, void 0, void 0, function* () {
        // Create another user to test isolation
        yield db_1.db.query('DELETE FROM users WHERE email = $1', ['other.user@example.com']);
        const otherUserResponse = yield (0, supertest_1.default)(index_1.app)
            .post('/api/auth/register')
            .send({
            email: 'other.user@example.com',
            password: 'Test123!',
            forename: 'Other',
            surname: 'User'
        });
        otherAuthToken = otherUserResponse.body.token;
        // Decode JWT to get user ID
        const decodedOther = jsonwebtoken_1.default.decode(otherAuthToken);
        if (!decodedOther || !decodedOther.id) {
            throw new Error('Failed to decode other user JWT token');
        }
        otherUserId = decodedOther.id;
        // Create a profile for the other user
        yield (0, supertest_1.default)(index_1.app)
            .put('/api/profile')
            .set('Authorization', `Bearer ${otherAuthToken}`)
            .send({
            forename: 'Other',
            surname: 'User',
            mobile_phone: '9876543210',
            email: 'other.user@example.com'
        });
        // Create an employment record for the original user
        const employmentResponse = yield (0, supertest_1.default)(index_1.app)
            .post('/api/profile/employment')
            .set('Authorization', `Bearer ${authToken}`)
            .send({
            employer: 'Secret Company',
            position: 'Secret Position',
            start_date: '2020-01-01',
            end_date: null
        });
        testEmploymentId = employmentResponse.body.id;
    }));
    (0, globals_1.it)('should not allow access to other users employment records', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .get(`/api/profile/employment/${testEmploymentId}`)
            .set('Authorization', `Bearer ${otherAuthToken}`);
        (0, globals_1.expect)(response.status).toBe(404);
    }));
    (0, globals_1.it)('should not allow updating other users employment records', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .put(`/api/profile/employment/${testEmploymentId}`)
            .set('Authorization', `Bearer ${otherAuthToken}`)
            .send({
            employer: 'Hacked Company',
            position: 'Hacker',
            start_date: '2020-01-01',
            end_date: null
        });
        (0, globals_1.expect)(response.status).toBe(404);
    }));
    (0, globals_1.it)('should not allow deleting other users employment records', () => __awaiter(void 0, void 0, void 0, function* () {
        const response = yield (0, supertest_1.default)(index_1.app)
            .delete(`/api/profile/employment/${testEmploymentId}`)
            .set('Authorization', `Bearer ${otherAuthToken}`);
        (0, globals_1.expect)(response.status).toBe(404);
    }));
});
