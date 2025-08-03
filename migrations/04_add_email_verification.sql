-- Add email verification fields to users table
ALTER TABLE users 
ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN verification_code TEXT,
ADD COLUMN verification_code_expires_at TIMESTAMPTZ;

-- Add index for faster verification code lookups
CREATE INDEX idx_users_verification_code ON users(verification_code) WHERE verification_code IS NOT NULL;
