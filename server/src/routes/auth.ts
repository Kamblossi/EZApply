import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { RegisterUserDTO, LoginUserDTO } from '../validators/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

router.post('/register', authLimiter, async (req, res) => {
  const parse = RegisterUserDTO.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);

  const { email, password, forename, surname } = parse.data;
  const hash = await bcrypt.hash(password, 12);

  try {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, role, created_at`,
      [email, hash]
    );
    const user = rows[0];

    // Create user profile with forename and surname
    await db.query(
      `INSERT INTO user_profiles (user_id, forename, surname)
       VALUES ($1, $2, $3)`,
      [user.id, forename, surname]
    );

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET as string,
      { expiresIn: '7d' }
    );
    res.json({ token });
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

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  );
  res.json({ token });
});

export { router as authRouter };
