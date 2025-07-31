import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { OpenAPIRegistry, OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';

import { authRouter } from './routes/auth';
import { meRouter } from './routes/me';
import profileRouter from './routes/profile';
import jobsRouter from './routes/jobs';
import applicationsRouter from './routes/applications';
import { employmentRouter } from './routes/employment';
import { educationRouter } from './routes/education';
import { referencesRouter } from './routes/references';
import { documentsRouter } from './routes/documents';
import { skillsRouter } from './routes/skills';
import { requireAuth } from './middleware/auth';
import { RegisterUserDTO, LoginUserDTO, AuthResponseDTO, ErrorResponseDTO } from './validators/auth';

dotenv.config();

const app = express();
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/jobs', requireAuth, jobsRouter);
app.use('/api/applications', requireAuth, applicationsRouter);

// Granular sub-resource endpoints
app.use('/api/profile/employment', requireAuth, employmentRouter);
app.use('/api/profile/education', requireAuth, educationRouter);
app.use('/api/profile/references', requireAuth, referencesRouter);
app.use('/api/profile/documents', requireAuth, documentsRouter);
app.use('/api/profile/skills', requireAuth, skillsRouter);

// ---------- 🔥 OpenAPI doc generation ----------
const registry = new OpenAPIRegistry();

// Register auth endpoints
registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Authentication'],
  summary: 'Register a new user',
  description: 'Create a new user account with email, password, and personal details',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterUserDTO,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User registered successfully',
      content: {
        'application/json': {
          schema: AuthResponseDTO,
        },
      },
    },
    400: {
      description: 'Invalid input data',
    },
    409: {
      description: 'Email already exists',
      content: {
        'application/json': {
          schema: ErrorResponseDTO,
        },
      },
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/auth/login',
  tags: ['Authentication'],
  summary: 'Login user',
  description: 'Authenticate user with email and password',
  request: {
    body: {
      content: {
        'application/json': {
          schema: LoginUserDTO,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: AuthResponseDTO,
        },
      },
    },
    400: {
      description: 'Invalid input data',
    },
    401: {
      description: 'Invalid credentials',
      content: {
        'application/json': {
          schema: ErrorResponseDTO,
        },
      },
    },
  },
});

const generator = new OpenApiGeneratorV3(registry.definitions);
const openApiDocument = generator.generateDocument({
  openapi: '3.1.0',
  info: {
    title: 'EZApply API',
    description: 'API for the EZApply job application automation system',
    version: '0.1.0',
  },
  servers: [
    {
      url: 'http://localhost:4000',
      description: 'Development server',
    },
  ],
});

app.use('/api-docs', (req, res) => res.json(openApiDocument));
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(openApiDocument));
// ------------------------------------------------

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`EZApply API running on :${PORT}`);
    console.log(`OpenAPI docs available at: http://localhost:${PORT}/api-docs`);
    console.log(`Swagger UI available at: http://localhost:${PORT}/swagger`);
  });
}

export { app };
