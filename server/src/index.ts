import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { z } from 'zod';
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
import streamingRouter from './routes/streaming';
import jobDiscoveryRouter from './routes/jobDiscovery';
import uploadsRouter from './routes/uploads';
import automationRouter from './routes/automation';
import runsRouter from './routes/runs';
import dashboardRouter, { setupDashboardWebSocket } from './routes/dashboard';
import { requireAuth } from './middleware/auth';
import { RegisterUserDTO, LoginUserDTO, AuthResponseDTO, ErrorResponseDTO } from './validators/auth';
import { ProfileDTO } from './validators/profile';
import { JobDTO } from './validators/job';
import { ApplicationDTO } from './validators/application';
import { UserDTO } from './validators/user';

dotenv.config();

const app = express();
const server = createServer(app);

// Setup Socket.IO with CORS configuration
const io = new SocketIOServer(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    methods: ['GET', 'POST']
  }
});

// Setup WebSocket handlers
setupDashboardWebSocket(io);

// Configure CORS for development
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite dev server ports
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/me', meRouter);
app.use('/api/profile', requireAuth, profileRouter);
app.use('/api/jobs', requireAuth, jobsRouter);
app.use('/api/jobs', jobDiscoveryRouter);
app.use('/api/applications', requireAuth, applicationsRouter);

// Granular sub-resource endpoints
app.use('/api/profile/employment', requireAuth, employmentRouter);
app.use('/api/profile/education', requireAuth, educationRouter);
app.use('/api/profile/references', requireAuth, referencesRouter);
app.use('/api/profile/documents', requireAuth, documentsRouter);
app.use('/api/profile/skills', requireAuth, skillsRouter);

// Automation and file upload endpoints
app.use('/api/automation', automationRouter);
app.use('/api/runs', runsRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/stream', requireAuth, streamingRouter);
app.use('/api/uploads', requireAuth, uploadsRouter);

// ---------- 🔥 OpenAPI doc generation ----------
const registry = new OpenAPIRegistry();

// Add security scheme for JWT
registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
});

// Register auth endpoints
registry.registerPath({
  method: 'post',
  path: '/api/auth/register',
  tags: ['Authentication'],
  summary: 'Register a new user',
  description: 'Create a new user account with email, password, and personal details. Rate limited to 5 requests per 15 minutes per IP address.',
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
      headers: {
        'RateLimit-Limit': {
          description: 'Request limit per window',
          schema: { type: 'integer', example: 5 },
        },
        'RateLimit-Remaining': {
          description: 'The number of requests left for the time window',
          schema: { type: 'integer', example: 4 },
        },
        'RateLimit-Reset': {
          description: 'The relative time in seconds when the rate limit resets',
          schema: { type: 'integer', example: 900 },
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
    429: {
      description: 'Too Many Requests - Rate limit exceeded',
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
  description: 'Authenticate user with email and password. Rate limited to 5 requests per 15 minutes per IP address.',
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
      headers: {
        'RateLimit-Limit': {
          description: 'Request limit per window',
          schema: { type: 'integer', example: 5 },
        },
        'RateLimit-Remaining': {
          description: 'The number of requests left for the time window',
          schema: { type: 'integer', example: 4 },
        },
        'RateLimit-Reset': {
          description: 'The relative time in seconds when the rate limit resets',
          schema: { type: 'integer', example: 900 },
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
    429: {
      description: 'Too Many Requests - Rate limit exceeded',
      content: {
        'application/json': {
          schema: ErrorResponseDTO,
        },
      },
    },
  },
});

// Register user info endpoint
registry.registerPath({
  method: 'get',
  path: '/api/me',
  tags: ['User'],
  summary: 'Get current user information',
  description: 'Retrieve information about the currently authenticated user',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'User information retrieved successfully',
      content: {
        'application/json': {
          schema: UserDTO,
        },
      },
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
    },
  },
});

// Register profile endpoints
registry.registerPath({
  method: 'get',
  path: '/api/profile',
  tags: ['Profile'],
  summary: 'Get user profile',
  description: 'Retrieve complete user profile with employment, education, and other details',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Profile retrieved successfully',
      content: {
        'application/json': {
          schema: ProfileDTO,
        },
      },
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
    },
    404: {
      description: 'Profile not found',
    },
  },
});

registry.registerPath({
  method: 'put',
  path: '/api/profile',
  tags: ['Profile'],
  summary: 'Update user profile',
  description: 'Update user profile information',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ProfileDTO,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Profile updated successfully',
      content: {
        'application/json': {
          schema: ProfileDTO,
        },
      },
    },
    400: {
      description: 'Invalid input data',
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
    },
  },
});

// Create response schemas
const JobListResponseDTO = z.object({
  data: z.array(JobDTO),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
  filters: z.object({}).optional(),
}).openapi({
  title: 'JobListResponseDTO',
  description: 'Paginated list of jobs with metadata'
});

const ApplicationListResponseDTO = z.object({
  data: z.array(ApplicationDTO),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
}).openapi({
  title: 'ApplicationListResponseDTO',
  description: 'Paginated list of applications with metadata'
});

// Register jobs endpoints
registry.registerPath({
  method: 'get',
  path: '/api/jobs',
  tags: ['Jobs'],
  summary: 'Get job listings',
  description: 'Retrieve job listings with filtering, pagination, and search capabilities',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Job listings retrieved successfully',
      content: {
        'application/json': {
          schema: JobListResponseDTO,
        },
      },
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/jobs',
  tags: ['Jobs'],
  summary: 'Create a new job',
  description: 'Add a new job posting',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: JobDTO,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Job created successfully',
      content: {
        'application/json': {
          schema: JobDTO,
        },
      },
    },
    400: {
      description: 'Invalid input data',
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
    },
  },
});

registry.registerPath({
  method: 'get',
  path: '/api/jobs/{id}',
  tags: ['Jobs'],
  summary: 'Get job by ID',
  description: 'Retrieve a specific job by its ID',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Job retrieved successfully',
      content: {
        'application/json': {
          schema: JobDTO,
        },
      },
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
    },
    404: {
      description: 'Job not found',
    },
  },
});

// Register applications endpoints
registry.registerPath({
  method: 'get',
  path: '/api/applications',
  tags: ['Applications'],
  summary: 'Get job applications',
  description: 'Retrieve job applications with filtering and pagination',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Applications retrieved successfully',
      content: {
        'application/json': {
          schema: ApplicationListResponseDTO,
        },
      },
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
    },
  },
});

registry.registerPath({
  method: 'post',
  path: '/api/applications',
  tags: ['Applications'],
  summary: 'Create a new application',
  description: 'Submit a new job application',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ApplicationDTO,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Application created successfully',
      content: {
        'application/json': {
          schema: ApplicationDTO,
        },
      },
    },
    400: {
      description: 'Invalid input data',
    },
    401: {
      description: 'Unauthorized - invalid or missing token',
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
  server.listen(PORT, () => {
    console.log(`EZApply API running on :${PORT}`);
    console.log(`OpenAPI docs available at: http://localhost:${PORT}/api-docs`);
    console.log(`Swagger UI available at: http://localhost:${PORT}/swagger`);
    console.log(`WebSocket server enabled for real-time dashboard metrics`);
  });
}

export { app, io };
