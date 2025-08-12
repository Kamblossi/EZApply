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
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = require("../src/db");
describe('Database integration tests', () => {
    it('should have users table', () => __awaiter(void 0, void 0, void 0, function* () {
        const res = yield db_1.db.query(`
      SELECT to_regclass('public.users') AS table_name;
    `);
        expect(res.rows[0].table_name).toBe('users');
    }));
    it('should insert and retrieve a user', () => __awaiter(void 0, void 0, void 0, function* () {
        const email = `testuser${Date.now()}@example.com`;
        const passwordHash = 'hashedpassword';
        // Insert user
        const insertRes = yield db_1.db.query(`INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email`, [email, passwordHash]);
        expect(insertRes.rows.length).toBe(1);
        expect(insertRes.rows[0].email).toBe(email);
        // Query user
        const queryRes = yield db_1.db.query(`SELECT id, email FROM users WHERE email = $1`, [email]);
        expect(queryRes.rows.length).toBe(1);
        expect(queryRes.rows[0].email).toBe(email);
    }));
});
