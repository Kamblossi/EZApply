import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { db } from '../db';

const router = Router();

router.get('/', requireAuth, async (req, res) => {
  const user = (req as any).user as { id: string; email: string };
  const { rows } = await db.query(
    `SELECT id, email, role, created_at
       FROM users
      WHERE id = $1`,
    [user.id]
  );
  res.json(rows[0]);
});

export { router as meRouter };
