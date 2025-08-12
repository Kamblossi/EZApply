"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Use more lenient rate limiting in test environment
const isTestEnv = process.env.NODE_ENV === 'test';
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: isTestEnv ? 1000 : 15 * 60 * 1000, // 1 second for tests, 15 minutes for production
    max: 5, // Always 5 to match test expectations
    message: {
        error: 'Too many attempts. Please try again later.',
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
