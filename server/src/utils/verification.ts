import crypto from 'crypto';

/**
 * Generate a 6-digit verification code
 */
export function generateVerificationCode(): string {
  return crypto.randomInt(100000, 999999).toString();
}

/**
 * Generate verification code expiration time (15 minutes from now)
 */
export function getVerificationExpiration(): Date {
  const expiration = new Date();
  expiration.setMinutes(expiration.getMinutes() + 15);
  return expiration;
}

/**
 * Check if verification code has expired
 */
export function isVerificationExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}
