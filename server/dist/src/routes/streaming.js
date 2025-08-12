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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const automation_1 = require("../queues/automation");
const ioredis_1 = __importDefault(require("ioredis"));
const router = (0, express_1.Router)();
// Redis connection for pub/sub
const redis = new ioredis_1.default({
    host: 'localhost',
    port: 6379,
});
// SSE endpoint for real-time automation progress
router.get('/automation/:jobId/stream', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { jobId } = req.params;
    // Set SSE headers
    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
    });
    // Send initial connection message
    res.write(`data: ${JSON.stringify({
        type: 'connected',
        jobId,
        timestamp: new Date().toISOString(),
        message: 'Connected to automation stream'
    })}\n\n`);
    try {
        // Get job status
        const job = yield automation_1.automationQueue.getJob(jobId);
        if (!job) {
            res.write(`data: ${JSON.stringify({
                type: 'error',
                jobId,
                timestamp: new Date().toISOString(),
                message: 'Job not found'
            })}\n\n`);
            res.end();
            return;
        }
        // Send current job state
        res.write(`data: ${JSON.stringify({
            type: 'status',
            jobId,
            timestamp: new Date().toISOString(),
            data: {
                id: job.id,
                progress: job.progress,
                processedOn: job.processedOn,
                finishedOn: job.finishedOn,
                failedReason: job.failedReason,
                opts: job.opts,
                data: job.data,
                returnvalue: job.returnvalue
            }
        })}\n\n`);
        // Send job logs
        const logs = yield job.getLogsFromRedis();
        if (logs && logs.logs.length > 0) {
            logs.logs.forEach((log) => {
                res.write(`data: ${JSON.stringify({
                    type: 'log',
                    jobId,
                    timestamp: new Date().toISOString(),
                    message: log
                })}\n\n`);
            });
        }
        // Subscribe to job events via Redis pub/sub
        const subscriber = new ioredis_1.default({
            host: 'localhost',
            port: 6379,
        });
        const jobEventChannel = `bull:automation:${jobId}`;
        const queueEventChannel = 'bull:automation:*';
        yield subscriber.subscribe(jobEventChannel, queueEventChannel);
        subscriber.on('message', (channel, message) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const eventData = JSON.parse(message);
                // Filter events for this specific job
                if (eventData.jobId === jobId || channel.includes(jobId)) {
                    res.write(`data: ${JSON.stringify({
                        type: 'event',
                        jobId,
                        timestamp: new Date().toISOString(),
                        channel,
                        data: eventData
                    })}\n\n`);
                }
            }
            catch (error) {
                console.error('Error parsing Redis message:', error);
            }
        }));
        // Periodically check job status and send updates
        const statusInterval = setInterval(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const updatedJob = yield automation_1.automationQueue.getJob(jobId);
                if (updatedJob) {
                    res.write(`data: ${JSON.stringify({
                        type: 'progress',
                        jobId,
                        timestamp: new Date().toISOString(),
                        data: {
                            progress: updatedJob.progress,
                            processedOn: updatedJob.processedOn,
                            finishedOn: updatedJob.finishedOn,
                            failedReason: updatedJob.failedReason
                        }
                    })}\n\n`);
                    // Stop streaming if job is completed or failed
                    if (updatedJob.finishedOn || updatedJob.failedReason) {
                        res.write(`data: ${JSON.stringify({
                            type: 'completed',
                            jobId,
                            timestamp: new Date().toISOString(),
                            message: updatedJob.failedReason ? 'Job failed' : 'Job completed successfully'
                        })}\n\n`);
                        clearInterval(statusInterval);
                        yield subscriber.unsubscribe();
                        subscriber.disconnect();
                        res.end();
                    }
                }
            }
            catch (error) {
                console.error('Error checking job status:', error);
            }
        }), 1000); // Check every second
        // Handle client disconnect
        req.on('close', () => __awaiter(void 0, void 0, void 0, function* () {
            clearInterval(statusInterval);
            yield subscriber.unsubscribe();
            subscriber.disconnect();
            console.log(`Client disconnected from job ${jobId} stream`);
        }));
        req.on('end', () => __awaiter(void 0, void 0, void 0, function* () {
            clearInterval(statusInterval);
            yield subscriber.unsubscribe();
            subscriber.disconnect();
            console.log(`Stream ended for job ${jobId}`);
        }));
    }
    catch (error) {
        console.error('SSE error:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        res.write(`data: ${JSON.stringify({
            type: 'error',
            jobId,
            timestamp: new Date().toISOString(),
            message: errorMessage
        })}\n\n`);
        res.end();
    }
}));
// Get automation job status
router.get('/automation/:jobId/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { jobId } = req.params;
        const job = yield automation_1.automationQueue.getJob(jobId);
        if (!job) {
            return res.status(404).json({ error: 'Job not found' });
        }
        const logs = yield job.getLogsFromRedis();
        res.json({
            id: job.id,
            progress: job.progress,
            processedOn: job.processedOn,
            finishedOn: job.finishedOn,
            failedReason: job.failedReason,
            data: job.data,
            returnvalue: job.returnvalue,
            logs: (logs === null || logs === void 0 ? void 0 : logs.logs) || []
        });
    }
    catch (error) {
        console.error('Error getting job status:', error);
        res.status(500).json({ error: 'Failed to get job status' });
    }
}));
// Start automation job
router.post('/automation/start', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const _a = req.body, { jobTitle, companyName, applicationId } = _a, otherData = __rest(_a, ["jobTitle", "companyName", "applicationId"]);
        const jobData = Object.assign({ jobTitle: jobTitle || 'Software Developer', companyName: companyName || 'NHS', applicationId }, otherData);
        const job = yield automation_1.automationQueue.add('nhsTracAutomation', {
            jobData
        }, {
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        res.json({
            jobId: job.id,
            message: 'Automation job started',
            streamUrl: `/api/stream/automation/${job.id}/stream`
        });
    }
    catch (error) {
        console.error('Error starting automation job:', error);
        res.status(500).json({ error: 'Failed to start automation job' });
    }
}));
// Get queue statistics
router.get('/automation/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const waiting = yield automation_1.automationQueue.getWaiting();
        const active = yield automation_1.automationQueue.getActive();
        const completed = yield automation_1.automationQueue.getCompleted();
        const failed = yield automation_1.automationQueue.getFailed();
        res.json({
            stats: {
                waiting: waiting.length,
                active: active.length,
                completed: completed.length,
                failed: failed.length,
            },
            jobs: {
                waiting: waiting.map(j => ({ id: j.id, data: j.data })),
                active: active.map(j => ({ id: j.id, progress: j.progress, data: j.data })),
                completed: completed.slice(0, 10).map(j => ({
                    id: j.id,
                    finishedOn: j.finishedOn,
                    returnvalue: j.returnvalue,
                    data: j.data
                })),
                failed: failed.slice(0, 10).map(j => ({
                    id: j.id,
                    failedReason: j.failedReason,
                    data: j.data
                }))
            }
        });
    }
    catch (error) {
        console.error('Error getting queue stats:', error);
        res.status(500).json({ error: 'Failed to get queue statistics' });
    }
}));
exports.default = router;
