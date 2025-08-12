"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateVerificationCode = generateVerificationCode;
exports.getVerificationExpiration = getVerificationExpiration;
exports.isVerificationExpired = isVerificationExpired;
const crypto_1 = __importDefault(require("crypto"));
/**
 * Generate a 6-digit verification code
 */
function generateVerificationCode() {
    return crypto_1.default.randomInt(100000, 999999).toString();
}
/**
 * Generate verification code expiration time (15 minutes from now)
 */
function getVerificationExpiration() {
    const expiration = new Date();
    expiration.setMinutes(expiration.getMinutes() + 15);
    return expiration;
}
/**
 * Check if verification code has expired
 */
function isVerificationExpired(expiresAt) {
    return new Date() > expiresAt;
}
