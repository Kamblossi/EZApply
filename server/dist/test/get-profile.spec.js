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
// server/test/get-profile.spec.ts
const supertest_1 = __importDefault(require("supertest"));
const index_1 = require("../src/index"); // Import app from index.ts
const db_1 = require("../src/db"); // Your database client
const crypto_1 = require("crypto");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
describe('GET /api/profile', () => {
    let testUserId;
    let testAuthToken;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Register a test user and get a token
        const registerRes = yield (0, supertest_1.default)(index_1.app)
            .post('/api/auth/register')
            .send({
            email: `testuser_${Date.now()}@example.com`,
            password: 'Password123!',
            forename: 'Test',
            surname: 'User',
        });
        expect(registerRes.statusCode).toBe(200);
        expect(registerRes.body).toHaveProperty('token');
        expect(typeof registerRes.body.token).toBe('string');
        testAuthToken = registerRes.body.token;
        // Decode token to get user id
        const decoded = jsonwebtoken_1.default.decode(testAuthToken);
        testUserId = decoded === null || decoded === void 0 ? void 0 : decoded.id;
        expect(testUserId).toBeDefined();
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clean up the test user and profile data
        yield db_1.db.query('DELETE FROM users WHERE id = $1', [testUserId]);
        yield db_1.db.end(); // Close DB connection pool after all tests
    }));
    it('should return an empty profile for a new user', () => __awaiter(void 0, void 0, void 0, function* () {
        // Register another new user for this specific test
        const newUserEmail = `newuser_${Date.now()}@example.com`;
        const newRegisterRes = yield (0, supertest_1.default)(index_1.app)
            .post('/api/auth/register')
            .send({
            email: newUserEmail,
            password: 'Password123!',
            forename: 'New',
            surname: 'User',
        });
        const newAuthToken = newRegisterRes.body.token;
        // Decode token to get new user id
        const decodedNew = jsonwebtoken_1.default.decode(newAuthToken);
        const newUserId = decodedNew === null || decodedNew === void 0 ? void 0 : decodedNew.id;
        expect(newUserId).toBeDefined();
        const res = yield (0, supertest_1.default)(index_1.app)
            .get('/api/profile')
            .set('Authorization', `Bearer ${newAuthToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('user_id', newUserId);
        expect(res.body).toHaveProperty('forename', 'New'); // Expect default from registration
        expect(res.body).toHaveProperty('surname', 'User'); // Expect default from registration
        // Verify Zod schema conformity
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ProfileDTO } = require('../src/validators/profile');
        const parsedProfile = ProfileDTO.safeParse(res.body);
        expect(parsedProfile.success).toBe(true);
        // Ensure nested arrays are empty
        expect(res.body.employment_records).toEqual([]);
        expect(res.body.education_records).toEqual([]);
        expect(res.body.reference_contacts).toEqual([]);
        expect(res.body.user_documents).toEqual([]);
        expect(res.body.user_skills).toEqual([]);
        // Clean up this specific test user
        yield db_1.db.query('DELETE FROM users WHERE id = $1', [newUserId]);
    }));
    it('should return profile data with nested records if they exist', () => __awaiter(void 0, void 0, void 0, function* () {
        // Insert some dummy profile data for the `testUserId`
        // Check if profile already exists to avoid duplicate key error
        const existingProfile = yield db_1.db.query('SELECT id FROM user_profiles WHERE user_id = $1', [testUserId]);
        let profileId;
        if (existingProfile.rows.length > 0) {
            profileId = existingProfile.rows[0].id;
            // Update profile to new values
            yield db_1.db.query(`
        UPDATE user_profiles SET forename = 'Updated', surname = 'Profile', mobile_phone = '0712345678' WHERE id = $1
      `, [profileId]);
        }
        else {
            profileId = (0, crypto_1.randomUUID)(); // Generate a UUID for the user_profile
            yield db_1.db.query(`
        INSERT INTO user_profiles (id, user_id, forename, surname, mobile_phone)
        VALUES ($1, $2, 'Updated', 'Profile', '0712345678');
      `, [profileId, testUserId]);
        }
        const employmentId = (0, crypto_1.randomUUID)();
        yield db_1.db.query(`
      INSERT INTO employment_records (id, user_profile_id, employer, position, start_date)
      VALUES ($1, $2, 'Acme Corp', 'Software Engineer', '2020-01-15');
    `, [employmentId, profileId]);
        const educationId = (0, crypto_1.randomUUID)();
        yield db_1.db.query(`
      INSERT INTO education_records (id, user_profile_id, institution, qualification_type, degree_diploma, start_date)
      VALUES ($1, $2, 'University of Tech', 'Bachelors', 'Computer Science', '2016-09-01');
    `, [educationId, profileId]);
        const res = yield (0, supertest_1.default)(index_1.app)
            .get('/api/profile')
            .set('Authorization', `Bearer ${testAuthToken}`);
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('user_id', testUserId);
        expect(res.body).toHaveProperty('forename', 'Updated');
        expect(res.body).toHaveProperty('surname', 'Profile');
        expect(res.body).toHaveProperty('mobile_phone', '0712345678');
        // Check employment records
        expect(res.body.employment_records).toHaveLength(1);
        expect(res.body.employment_records[0]).toMatchObject({
            id: employmentId,
            employer: 'Acme Corp',
            position: 'Software Engineer',
            // start_date will be a Date object due to Zod.coerce.date()
        });
        // Check education records
        expect(res.body.education_records).toHaveLength(1);
        expect(res.body.education_records[0]).toMatchObject({
            id: educationId,
            institution: 'University of Tech',
            qualification_type: 'Bachelors',
            degree_diploma: 'Computer Science',
        });
        // Verify Zod schema conformity for the full profile
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { ProfileDTO } = require('../src/validators/profile');
        const parsedProfile = ProfileDTO.safeParse(res.body);
        expect(parsedProfile.success).toBe(true);
        // Clean up inserted profile data
        yield db_1.db.query('DELETE FROM user_profiles WHERE id = $1', [profileId]);
        yield db_1.db.query('DELETE FROM employment_records WHERE user_profile_id = $1', [profileId]);
        yield db_1.db.query('DELETE FROM education_records WHERE user_profile_id = $1', [profileId]);
    }));
    it('should return 401 if no token is provided', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app)
            .get('/api/profile');
        expect(res.statusCode).toBe(401);
        expect(res.body).toHaveProperty('message', 'Unauthorized: No token provided.');
    }));
});
