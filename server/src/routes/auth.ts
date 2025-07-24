import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';

const router = Router();
const Creds = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

router.post('/register', async (req, res) => {
  const parse = Creds.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error);

  const { email, password } = parse.data;
  const hash = await bcrypt.hash(password, 12);

  try {
    const { rows } = await db.query(
      `INSERT INTO users (email, password_hash)
       VALUES ($1, $2)
       RETURNING id, email, role, created_at`,
      [email, hash]
    );
    const user = rows[0];
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

router.post('/login', async (req, res) => {
  const parse = Creds.safeParse(req.body);
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
