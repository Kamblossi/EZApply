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
Object.defineProperty(exports, "__esModule", { value: true });
exports.redisConnection = exports.automationQueue = void 0;
exports.addAutomationJob = addAutomationJob;
exports.getQueueStats = getQueueStats;
const bullmq_1 = require("bullmq");
// Connection configuration for Redis
const connection = {
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: 3,
};
// Create the automation queue for job processing
exports.automationQueue = new bullmq_1.Queue("automation", {
    connection,
    defaultJobOptions: {
        removeOnComplete: 100, // Keep last 100 completed jobs
        removeOnFail: 50, // Keep last 50 failed jobs
        attempts: 3, // Retry failed jobs up to 3 times
        backoff: {
            type: 'exponential',
            delay: 2000, // Start with 2 second delay
        },
    }
});
// Export the connection for use in workers
exports.redisConnection = connection;
// Queue management functions
function addAutomationJob(jobData) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const job = yield exports.automationQueue.add('process-application', jobData, {
                jobId: jobData.runId, // Use runId as BullMQ job ID for easy tracking
            });
            console.log(`Queued automation job: ${job.id} for user ${jobData.userId}, job ${jobData.jobId}`);
            return job;
        }
        catch (error) {
            console.error('Failed to queue automation job:', error);
            throw error;
        }
    });
}
function getQueueStats() {
    return __awaiter(this, void 0, void 0, function* () {
        const waiting = yield exports.automationQueue.getWaiting();
        const active = yield exports.automationQueue.getActive();
        const completed = yield exports.automationQueue.getCompleted();
        const failed = yield exports.automationQueue.getFailed();
        return {
            waiting: waiting.length,
            active: active.length,
            completed: completed.length,
            failed: failed.length,
        };
    });
}
