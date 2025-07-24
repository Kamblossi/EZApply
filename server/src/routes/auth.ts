import { Router } from 'express';
const router = Router();

/* placeholder — will implement in Step 2 C */
router.get('/ping', (_, res) => res.json({ ok: true }));

export { router as authRouter };
