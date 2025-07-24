import express from 'express';

import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`EZApply API running on :${PORT}`));
