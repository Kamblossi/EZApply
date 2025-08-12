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
describe('Auth flow (register → login → me)', () => {
    const api = (0, supertest_1.default)(index_1.app);
    const email = `user${Date.now()}@example.com`;
    const password = 'S3curePass!';
    const forename = 'Test';
    const surname = 'User';
    it('registers a new user', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield api
            .post('/api/auth/register')
            .send({ email, password, forename, surname });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    }));
    it('logs the user in', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield api
            .post('/api/auth/login')
            .send({ email, password });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    }));
});
