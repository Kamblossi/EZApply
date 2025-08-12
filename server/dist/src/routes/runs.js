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
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const db_1 = require("../db");
const path_1 = require("path");
const fs_1 = require("fs");
const router = express_1.default.Router();
// Configure multer for screenshot uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const { id: runId } = req.params;
        const uploadDir = (0, path_1.join)(process.cwd(), 'uploads', 'runs', runId, 'screenshots');
        // Create directory if it doesn't exist
        if (!(0, fs_1.existsSync)(uploadDir)) {
            (0, fs_1.mkdirSync)(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const ext = (0, path_1.extname)(file.originalname);
        cb(null, `screenshot_${timestamp}${ext}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Only allow image files
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
// POST /api/runs/:id/screenshot - Upload screenshot for a run
router.post('/:id/screenshot', auth_1.requireAuth, upload.single('screenshot'), (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id: runId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const file = req.file;
        if (!file) {
            return res.status(400).json({ error: 'No screenshot file provided' });
        }
        // Verify the run belongs to the user
        const runResult = yield db_1.db.query('SELECT id FROM automation_runs WHERE id = $1 AND user_id = $2', [runId, userId]);
        if (runResult.rows.length === 0) {
            return res.status(404).json({ error: 'Run not found' });
        }
        // Update screenshots count
        yield db_1.db.query('UPDATE automation_runs SET screenshots_count = screenshots_count + 1 WHERE id = $1', [runId]);
        // Return public URL for the screenshot
        const publicUrl = `/api/runs/${runId}/screenshots/${file.filename}`;
        res.json({
            success: true,
            filename: file.filename,
            url: publicUrl,
            size: file.size
        });
    }
    catch (error) {
        console.error('Error uploading screenshot:', error);
        res.status(500).json({ error: 'Failed to upload screenshot' });
    }
}));
// GET /api/runs/:id/stream - Server-Sent Events endpoint for live log streaming
router.get('/:id/stream', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id: runId } = req.params;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
    try {
        // Verify the run belongs to the user
        const runResult = yield db_1.db.query('SELECT id, status FROM automation_runs WHERE id = $1 AND user_id = $2', [runId, userId]);
        if (runResult.rows.length === 0) {
            return res.status(404).json({ error: 'Run not found' });
        }
        const run = runResult.rows[0];
        // Set up Server-Sent Events headers
        res.writeHead(200, {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Cache-Control',
        });
        // Send initial connection confirmation
        res.write(`data: ${JSON.stringify({ type: 'connected', runId, status: run.status })}\n\n`);
        // Get existing logs and send them
        const existingLogs = yield db_1.db.query(`SELECT step_number, step_type, message, screenshot_path, timestamp 
       FROM automation_logs 
       WHERE run_id = $1 
       ORDER BY step_number ASC`, [runId]);
        // Send existing logs
        for (const log of existingLogs.rows) {
            const logEvent = {
                type: 'log',
                step: log.step_number,
                stepType: log.step_type,
                message: log.message,
                screenshot: log.screenshot_path,
                timestamp: log.timestamp
            };
            res.write(`data: ${JSON.stringify(logEvent)}\n\n`);
        }
        // Set up polling for new logs if the run is still active
        let pollInterval = null;
        let lastStepNumber = existingLogs.rows.length > 0
            ? Math.max(...existingLogs.rows.map(log => log.step_number))
            : 0;
        if (run.status === 'pending' || run.status === 'running') {
            pollInterval = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    // Check for new logs
                    const newLogs = yield db_1.db.query(`SELECT step_number, step_type, message, screenshot_path, timestamp 
             FROM automation_logs 
             WHERE run_id = $1 AND step_number > $2 
             ORDER BY step_number ASC`, [runId, lastStepNumber]);
                    // Send new logs
                    for (const log of newLogs.rows) {
                        const logEvent = {
                            type: 'log',
                            step: log.step_number,
                            stepType: log.step_type,
                            message: log.message,
                            screenshot: log.screenshot_path,
                            timestamp: log.timestamp
                        };
                        res.write(`data: ${JSON.stringify(logEvent)}\n\n`);
                        lastStepNumber = Math.max(lastStepNumber, log.step_number);
                    }
                    // Check if run status changed
                    const statusResult = yield db_1.db.query('SELECT status FROM automation_runs WHERE id = $1', [runId]);
                    if (statusResult.rows.length > 0) {
                        const currentStatus = statusResult.rows[0].status;
                        if (currentStatus !== run.status) {
                            res.write(`data: ${JSON.stringify({
                                type: 'status_change',
                                status: currentStatus,
                                runId
                            })}\n\n`);
                            // If run is completed, stop polling
                            if (currentStatus === 'success' || currentStatus === 'failed') {
                                if (pollInterval) {
                                    clearInterval(pollInterval);
                                    pollInterval = null;
                                }
                                // Send completion event
                                res.write(`data: ${JSON.stringify({
                                    type: 'completed',
                                    status: currentStatus,
                                    runId
                                })}\n\n`);
                            }
                        }
                    }
                }
                catch (error) {
                    console.error('Error polling for log updates:', error);
                    res.write(`data: ${JSON.stringify({
                        type: 'error',
                        message: 'Failed to fetch log updates'
                    })}\n\n`);
                }
            }), 2000); // Poll every 2 seconds
        }
        else {
            // Run is already completed, send completion event
            res.write(`data: ${JSON.stringify({
                type: 'completed',
                status: run.status,
                runId
            })}\n\n`);
        }
        // Handle client disconnect
        req.on('close', () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
            res.end();
        });
        req.on('error', () => {
            if (pollInterval) {
                clearInterval(pollInterval);
            }
            res.end();
        });
    }
    catch (error) {
        console.error('Error setting up log stream:', error);
        res.status(500).json({ error: 'Failed to set up log stream' });
    }
}));
// GET /api/runs/:id/logs - Get all logs for a run (non-streaming)
router.get('/:id/logs', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id: runId } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Verify the run belongs to the user
        const runResult = yield db_1.db.query('SELECT id FROM automation_runs WHERE id = $1 AND user_id = $2', [runId, userId]);
        if (runResult.rows.length === 0) {
            return res.status(404).json({ error: 'Run not found' });
        }
        // Get all logs for the run
        const logs = yield db_1.db.query(`SELECT step_number, step_type, message, screenshot_path, timestamp 
       FROM automation_logs 
       WHERE run_id = $1 
       ORDER BY step_number ASC`, [runId]);
        res.json({
            runId,
            logs: logs.rows
        });
    }
    catch (error) {
        console.error('Error getting run logs:', error);
        res.status(500).json({ error: 'Failed to get run logs' });
    }
}));
// GET /api/runs/:id/screenshots/:filename - Serve screenshot files
router.get('/:id/screenshots/:filename', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { id: runId, filename } = req.params;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        // Verify the run belongs to the user
        const runResult = yield db_1.db.query('SELECT id FROM automation_runs WHERE id = $1 AND user_id = $2', [runId, userId]);
        if (runResult.rows.length === 0) {
            return res.status(404).json({ error: 'Run not found' });
        }
        // Verify the screenshot exists in logs
        const screenshotResult = yield db_1.db.query('SELECT id FROM automation_logs WHERE run_id = $1 AND screenshot_path = $2', [runId, filename]);
        if (screenshotResult.rows.length === 0) {
            return res.status(404).json({ error: 'Screenshot not found' });
        }
        // Serve the screenshot file
        const screenshotPath = require('path').join(process.cwd(), 'uploads', 'runs', runId, 'screenshots', filename);
        res.sendFile(screenshotPath, (err) => {
            if (err) {
                console.error('Error serving screenshot:', err);
                res.status(404).json({ error: 'Screenshot file not found' });
            }
        });
    }
    catch (error) {
        console.error('Error serving screenshot:', error);
        res.status(500).json({ error: 'Failed to serve screenshot' });
    }
}));
exports.default = router;
