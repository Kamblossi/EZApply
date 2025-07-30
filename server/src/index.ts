import express from 'express';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';
import profileRouter from './routes/profile';
import { requireAuth } from './middleware/auth';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/profile', requireAuth, profileRouter);

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`EZApply API running on :${PORT}`));
}

export { app };
