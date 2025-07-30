import express from 'express';
import dotenv from 'dotenv';

import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';
import profileRouter from './routes/profile';
import jobsRouter from './routes/jobs';
import applicationsRouter from './routes/applications';
import { requireAuth } from './middleware/auth';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/jobs', requireAuth, jobsRouter);
app.use('/api/applications', requireAuth, applicationsRouter);

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`EZApply API running on :${PORT}`));
}

export { app };
