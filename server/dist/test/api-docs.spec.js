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
const index_1 = require("../src/index");
const supertest_1 = __importDefault(require("supertest"));
describe('OpenAPI docs', () => {
    it('exposes JSON at /api-docs', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).get('/api-docs');
        expect(res.status).toBe(200);
        expect(res.body.openapi).toBe('3.1.0');
        expect(res.body.info).toBeDefined();
        expect(res.body.info.title).toBe('EZApply API');
        expect(res.body.paths).toBeDefined();
    }));
    it('exposes /swagger UI (allows redirects)', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).get('/swagger');
        // Swagger UI might redirect to /swagger/ so we accept both 200 and 301
        expect([200, 301]).toContain(res.status);
    }));
    it('has all main endpoints documented', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield (0, supertest_1.default)(index_1.app).get('/api-docs');
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
    }));
    it('has proper security schemes defined', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b;
        const res = yield (0, supertest_1.default)(index_1.app).get('/api-docs');
        expect((_b = (_a = res.body.components) === null || _a === void 0 ? void 0 : _a.securitySchemes) === null || _b === void 0 ? void 0 : _b.bearerAuth).toBeDefined();
        expect(res.body.components.securitySchemes.bearerAuth.type).toBe('http');
        expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer');
    }));
    it('has proper tags for organization', () => __awaiter(void 0, void 0, void 0, function* () {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const res = yield (0, supertest_1.default)(index_1.app).get('/api-docs');
        const paths = res.body.paths;
        // Check that endpoints have appropriate tags
        expect((_b = (_a = paths['/api/auth/register']) === null || _a === void 0 ? void 0 : _a.post) === null || _b === void 0 ? void 0 : _b.tags).toContain('Authentication');
        expect((_d = (_c = paths['/api/me']) === null || _c === void 0 ? void 0 : _c.get) === null || _d === void 0 ? void 0 : _d.tags).toContain('User');
        expect((_f = (_e = paths['/api/profile']) === null || _e === void 0 ? void 0 : _e.get) === null || _f === void 0 ? void 0 : _f.tags).toContain('Profile');
        expect((_h = (_g = paths['/api/jobs']) === null || _g === void 0 ? void 0 : _g.get) === null || _h === void 0 ? void 0 : _h.tags).toContain('Jobs');
        expect((_k = (_j = paths['/api/applications']) === null || _j === void 0 ? void 0 : _j.get) === null || _k === void 0 ? void 0 : _k.tags).toContain('Applications');
    }));
});
