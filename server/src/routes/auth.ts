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
  const hash = await bcrypt.hash(password, 12);
  const verificationCode = generateVerificationCode();
  const codeExpiration = getVerificationExpiration();

  try {
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

    // Send verification email
    const emailSent = await emailService.sendVerificationEmail(email, verificationCode);
    
    if (!emailSent) {
      // If email fails, we should still allow registration but log the error
      console.error(`Failed to send verification email to ${email}`);
    }

    // Don't return a token yet - user must verify email first
    res.status(201).json({ 
      message: 'Registration successful. Please check your email for verification code.',
      email: email,
      requiresVerification: true
    });
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'email exists' });
    res.status(500).json({ error: 'db error' });
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
