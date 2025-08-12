"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const automation_1 = require("../queues/automation");
const db_1 = require("../db");
const nanoid_1 = require("nanoid");
const router = express_1.default.Router();
// Schema for automation run request
const runAutomationSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid('Invalid job ID format'),
});
// POST /api/automation/run - Start automation for a job
router.post('/run', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { jobId } = runAutomationSchema.parse(req.body);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Verify the job exists and belongs to the user's accessible jobs
        const job = yield db_1.db.query('SELECT id, title, employer, location, deadline FROM jobs WHERE id = $1', [jobId]);
        if (job.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }
        // Create a new automation run record
        const runId = (0, nanoid_1.nanoid)();
        const runResult = yield db_1.db.query(`INSERT INTO automation_runs (id, job_id, user_id, status, created_at, updated_at) 
       VALUES ($1, $2, $3, 'pending', NOW(), NOW()) 
       RETURNING id, status, created_at`, [runId, jobId, userId]);
        const run = runResult.rows[0];
        // Add job to the automation queue
        yield (0, automation_1.addAutomationJob)({
            jobId,
            userId,
            runId: run.id,
        });
        res.status(201).json({
            runId: run.id,
            status: run.status,
            jobId,
            createdAt: run.created_at,
            message: 'Automation job queued successfully'
        });
    }
    catch (error) {
        console.error('Error starting automation:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation failed',
                details: error.issues
            });
        }
        res.status(500).json({ error: 'Failed to start automation' });
    }
}));
// GET /api/automation/status - Get queue status
router.get('/status', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield (0, automation_1.getQueueStats)();
        res.json(stats);
    }
    catch (error) {
        console.error('Error getting queue status:', error);
        res.status(500).json({ error: 'Failed to get queue status' });
    }
}));
// GET /api/automation/runs/:runId - Get specific run details
router.get('/runs/:runId', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { runId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const result = yield db_1.db.query(`SELECT ar.*, j.title as job_title, j.employer, j.location
       FROM automation_runs ar
       JOIN jobs j ON ar.job_id = j.id
       WHERE ar.id = $1 AND ar.user_id = $2`, [runId, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Run not found' });
        }
        res.json(result.rows[0]);
    }
    catch (error) {
        console.error('Error getting run details:', error);
        res.status(500).json({ error: 'Failed to get run details' });
    }
}));
exports.default = router;
