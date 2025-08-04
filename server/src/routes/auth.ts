import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { RegisterUserDTO, LoginUserDTO, VerifyEmailDTO, ResendVerificationDTO } from '../validators/auth';
import { authLimiter } from '../middleware/rateLimit';
import { emailService } from '../services/email';
import { generateVerificationCode, getVerificationExpiration, isVerificationExpired } from '../utils/verification';

const router = Router();

router.post('/register', authLimiter, async (req, res) => {
  const parse = RegisterUserDTO.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);

  const { email, password, forename, surname } = parse.data;

  try {
    // Step 1: Check for Existing User First
    const { rows: existingUsers } = await db.query(
      `SELECT id, email_verified, verification_code_expires_at FROM users WHERE email = $1`,
      [email]
    );

    if (existingUsers.length > 0) {
      const existingUser = existingUsers[0];
      
      // If user exists and is already verified, reject registration
      if (existingUser.email_verified) {
        return res.status(409).json({ error: 'email exists' });
      }
      
      // If user exists but not verified, allow "re-registration" with new verification code
      // We'll handle this below with the same email-first approach
    }

    // Step 2: Generate Verification Code and Expiry
    const verificationCode = generateVerificationCode();
    const codeExpiration = getVerificationExpiration();
    const hash = await bcrypt.hash(password, 12);

    // Step 3: ATTEMPT TO SEND THE EMAIL FIRST (Crucial Change)
    try {
      const emailSent = await emailService.sendVerificationEmail(email, verificationCode);
      
      if (!emailSent) {
        throw new Error('Email service returned false');
      }
    } catch (emailError: any) {
      // Step 5: Handle Email Sending Failure
      console.error(`Failed to send verification email to ${email}:`, emailError.message);
      return res.status(500).json({ 
        error: 'Failed to send verification email. Please try again later.' 
      });
    }

    // Step 4: ONLY IF EMAIL SENDING IS SUCCESSFUL, THEN Create and Save User
    if (existingUsers.length > 0) {
      // Update existing unverified user
      const { rows } = await db.query(
        `UPDATE users 
         SET password_hash = $1, verification_code = $2, verification_code_expires_at = $3, updated_at = NOW()
         WHERE email = $4
         RETURNING id, email, role, created_at`,
        [hash, verificationCode, codeExpiration, email]
      );
      const user = rows[0];

      // Update user profile with new forename and surname
      await db.query(
        `UPDATE user_profiles 
         SET forename = $1, surname = $2
         WHERE user_id = $3`,
        [forename, surname, user.id]
      );

      return res.status(200).json({ 
        message: 'Account updated. Please check your email for a new verification code.',
        email: email,
        requiresVerification: true
      });
    } else {
      // Create new user (email already sent successfully)
      const { rows } = await db.query(
        `INSERT INTO users (email, password_hash, verification_code, verification_code_expires_at)
         VALUES ($1, $2, $3, $4)
         RETURNING id, email, role, created_at`,
        [email, hash, verificationCode, codeExpiration]
      );
      const user = rows[0];

      // Create user profile with forename and surname
      await db.query(
        `INSERT INTO user_profiles (user_id, forename, surname)
         VALUES ($1, $2, $3)`,
        [user.id, forename, surname]
      );

      // Don't return a token yet - user must verify email first
      res.status(201).json({ 
        message: 'Registration successful. Please check your email for verification code.',
        email: email,
        requiresVerification: true
      });
    }
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const parse = LoginUserDTO.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);

  const { email, password } = parse.data;
  const { rows } = await db.query(
    `SELECT * FROM users WHERE email = $1`,
    [email]
  );
  const user = rows[0];
  if (!user) return res.status(401).json({ error: 'invalid creds' });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(401).json({ error: 'invalid creds' });

  // Check if email is verified
  if (!user.email_verified) {
    return res.status(403).json({ 
      error: 'email not verified',
      message: 'Please verify your email before logging in.',
      email: email,
      requiresVerification: true
    });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
  res.json({ token });
});

router.post('/verify-email', authLimiter, async (req, res) => {
  const parse = VerifyEmailDTO.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);

  const { email, code } = parse.data;

  try {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE email = $1 AND verification_code = $2`,
      [email, code]
    );
    
    const user = rows[0];
    if (!user) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    // Check if code has expired
    if (isVerificationExpired(user.verification_code_expires_at)) {
      return res.status(400).json({ 
        error: 'Verification code expired',
        message: 'Please request a new verification code.'
      });
    }

    // Mark email as verified and clear verification code
    await db.query(
      `UPDATE users 
       SET email_verified = TRUE, verification_code = NULL, verification_code_expires_at = NULL
       WHERE id = $1`,
      [user.id]
    );

    // Generate JWT token for the verified user
    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );

    res.json({ 
      message: 'Email verified successfully',
      token 
    });
  } catch (err) {
    console.error('Email verification error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

router.post('/resend-verification', authLimiter, async (req, res) => {
  const parse = ResendVerificationDTO.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);

  const { email } = parse.data;

  try {
    const { rows } = await db.query(
      `SELECT * FROM users WHERE email = $1`,
      [email]
    );
    
    const user = rows[0];
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const codeExpiration = getVerificationExpiration();

    await db.query(
      `UPDATE users 
       SET verification_code = $1, verification_code_expires_at = $2
       WHERE id = $3`,
      [verificationCode, codeExpiration, user.id]
    );

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(email, verificationCode);
    
    if (!emailSent) {
      return res.status(500).json({ error: 'Failed to send verification email' });
    }

    res.json({ 
      message: 'Verification code sent successfully',
      email: email
    });
  } catch (err) {
    console.error('Resend verification error:', err);
    res.status(500).json({ error: 'Failed to resend verification code' });
  }
});

export { router as authRouter };
