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
const dotenv_1 = __importDefault(require("dotenv"));
const index_1 = require("../src/index");
dotenv_1.default.config({ path: './.env' }); // load test env
describe('Me endpoint', () => {
    const api = (0, supertest_1.default)(index_1.app);
    let token;
    const email = `user${Date.now()}@example.com`;
    const password = 'S3curePass!';
    const forename = 'Test';
    const surname = 'User';
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Register user
        const registerRes = yield api.post('/api/auth/register').send({
            email,
            password,
            forename,
            surname
        });
        token = registerRes.body.token;
    }));
    it('returns user info with valid token', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield api.get('/api/me').set('Authorization', `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('id');
        expect(res.body).toHaveProperty('email', email);
        expect(res.body).toHaveProperty('role');
        expect(res.body).toHaveProperty('created_at');
    }));
    it('returns 401 without token', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield api.get('/api/me');
        expect(res.status).toBe(401);
    }));
});
