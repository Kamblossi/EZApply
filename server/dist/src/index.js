"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const http_1 = require("http");
const socket_io_1 = require("socket.io");
const zod_1 = require("zod");
const zod_to_openapi_1 = require("@asteasolutions/zod-to-openapi");
const auth_1 = require("./routes/auth");
const me_1 = require("./routes/me");
const profile_1 = __importDefault(require("./routes/profile"));
const jobs_1 = __importDefault(require("./routes/jobs"));
const applications_1 = __importDefault(require("./routes/applications"));
const employment_1 = require("./routes/employment");
const education_1 = require("./routes/education");
const references_1 = require("./routes/references");
const documents_1 = require("./routes/documents");
const skills_1 = require("./routes/skills");
const streaming_1 = __importDefault(require("./routes/streaming"));
const jobDiscovery_1 = __importDefault(require("./routes/jobDiscovery"));
const uploads_1 = __importDefault(require("./routes/uploads"));
const automation_1 = __importDefault(require("./routes/automation"));
const runs_1 = __importDefault(require("./routes/runs"));
const dashboard_1 = __importStar(require("./routes/dashboard"));
const auth_2 = require("./middleware/auth");
const auth_3 = require("./validators/auth");
const profile_2 = require("./validators/profile");
const job_1 = require("./validators/job");
const application_1 = require("./validators/application");
const user_1 = require("./validators/user");
dotenv_1.default.config();
const app = (0, express_1.default)();
exports.app = app;
const server = (0, http_1.createServer)(app);
// Setup Socket.IO with CORS configuration
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ['http://localhost:5173', 'http://localhost:5174'],
        credentials: true,
        methods: ['GET', 'POST']
    }
});
exports.io = io;
// Setup WebSocket handlers
(0, dashboard_1.setupDashboardWebSocket)(io);
// Configure CORS for development
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://localhost:5174'], // Vite dev server ports
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json());
app.use('/api/auth', auth_1.authRouter);
app.use('/api/me', me_1.meRouter);
app.use('/api/profile', auth_2.requireAuth, profile_1.default);
app.use('/api/jobs', auth_2.requireAuth, jobs_1.default);
app.use('/api/jobs', jobDiscovery_1.default);
app.use('/api/applications', auth_2.requireAuth, applications_1.default);
// Granular sub-resource endpoints
app.use('/api/profile/employment', auth_2.requireAuth, employment_1.employmentRouter);
app.use('/api/profile/education', auth_2.requireAuth, education_1.educationRouter);
app.use('/api/profile/references', auth_2.requireAuth, references_1.referencesRouter);
app.use('/api/profile/documents', auth_2.requireAuth, documents_1.documentsRouter);
app.use('/api/profile/skills', auth_2.requireAuth, skills_1.skillsRouter);
// Automation and file upload endpoints
app.use('/api/automation', automation_1.default);
app.use('/api/runs', runs_1.default);
app.use('/api/dashboard', dashboard_1.default);
app.use('/api/stream', auth_2.requireAuth, streaming_1.default);
app.use('/api/uploads', auth_2.requireAuth, uploads_1.default);
// ---------- 🔥 OpenAPI doc generation ----------
const registry = new zod_to_openapi_1.OpenAPIRegistry();
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
                    schema: auth_3.RegisterUserDTO,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'User registered successfully',
            content: {
                'application/json': {
                    schema: auth_3.AuthResponseDTO,
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
                    schema: auth_3.ErrorResponseDTO,
                },
            },
        },
        429: {
            description: 'Too Many Requests - Rate limit exceeded',
            content: {
                'application/json': {
                    schema: auth_3.ErrorResponseDTO,
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
                    schema: auth_3.LoginUserDTO,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Login successful',
            content: {
                'application/json': {
                    schema: auth_3.AuthResponseDTO,
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
                    schema: auth_3.ErrorResponseDTO,
                },
            },
        },
        429: {
            description: 'Too Many Requests - Rate limit exceeded',
            content: {
                'application/json': {
                    schema: auth_3.ErrorResponseDTO,
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
                    schema: user_1.UserDTO,
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
                    schema: profile_2.ProfileDTO,
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
                    schema: profile_2.ProfileDTO,
                },
            },
        },
    },
    responses: {
        200: {
            description: 'Profile updated successfully',
            content: {
                'application/json': {
                    schema: profile_2.ProfileDTO,
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
const JobListResponseDTO = zod_1.z.object({
    data: zod_1.z.array(job_1.JobDTO),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
    }),
    filters: zod_1.z.object({}).optional(),
}).openapi({
    title: 'JobListResponseDTO',
    description: 'Paginated list of jobs with metadata'
});
const ApplicationListResponseDTO = zod_1.z.object({
    data: zod_1.z.array(application_1.ApplicationDTO),
    pagination: zod_1.z.object({
        page: zod_1.z.number(),
        limit: zod_1.z.number(),
        total: zod_1.z.number(),
        totalPages: zod_1.z.number(),
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
                    schema: job_1.JobDTO,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Job created successfully',
            content: {
                'application/json': {
                    schema: job_1.JobDTO,
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
                    schema: job_1.JobDTO,
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
                    schema: application_1.ApplicationDTO,
                },
            },
        },
    },
    responses: {
        201: {
            description: 'Application created successfully',
            content: {
                'application/json': {
                    schema: application_1.ApplicationDTO,
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
const generator = new zod_to_openapi_1.OpenApiGeneratorV3(registry.definitions);
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
app.use('/swagger', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(openApiDocument));
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
