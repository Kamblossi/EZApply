import { Router } from 'express';
const router = Router();

/* protected stub */
router.get('/', (_, res) => res.json({ me: 'soon' }));

export { router as meRouter };
