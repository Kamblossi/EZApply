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
exports.JobAlertsService = exports.jobAlertsQueue = exports.JobAlertSchema = void 0;
const bullmq_1 = require("bullmq");
const db_1 = require("../db");
const automation_1 = require("../queues/automation");
const multiPlatformJobDiscovery_1 = require("./multiPlatformJobDiscovery");
const jobDeduplicationService_1 = require("./jobDeduplicationService");
const nanoid_1 = require("nanoid");
const zod_1 = require("zod");
// Schema for job alert criteria
exports.JobAlertSchema = zod_1.z.object({
    keywords: zod_1.z.string().min(1),
    location: zod_1.z.string().optional(),
    platforms: zod_1.z.array(zod_1.z.string()).default(['nhs', 'indeed', 'reed']),
    salaryMin: zod_1.z.number().optional(),
    salaryMax: zod_1.z.number().optional(),
    jobType: zod_1.z.string().optional(),
    radius: zod_1.z.number().default(25),
    excludeKeywords: zod_1.z.array(zod_1.z.string()).default([])
});
// Create dedicated queue for job alerts
exports.jobAlertsQueue = new bullmq_1.Queue('job-alerts', {
    connection: automation_1.redisConnection,
    defaultJobOptions: {
        removeOnComplete: 50,
        removeOnFail: 20,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    }
});
class JobAlertsService {
    /**
     * Initialize the job alerts worker
     */
    static initializeWorker() {
        if (this.worker) {
            return; // Already initialized
        }
        this.worker = new bullmq_1.Worker('job-alerts', (job) => __awaiter(this, void 0, void 0, function* () {
            console.log(`Processing job alert: ${job.name} with data:`, job.data);
            switch (job.name) {
                case 'run-alert':
                    return yield this.processJobAlert(job.data.alertId);
                case 'schedule-recurring-alerts':
                    return yield this.scheduleRecurringAlerts();
                default:
                    throw new Error(`Unknown job type: ${job.name}`);
            }
        }), {
            connection: automation_1.redisConnection,
            concurrency: 3 // Process up to 3 alerts concurrently
        });
        this.worker.on('completed', (job) => {
            console.log(`Job alert completed: ${job.id}`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`Job alert failed: ${job === null || job === void 0 ? void 0 : job.id}`, err);
        });
        // Schedule the recurring alerts scheduler to run every hour
        this.scheduleRecurringAlertsJob();
    }
    /**
     * Create a new job alert
     */
    static createJobAlert(userId, alertData) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            const alertId = (0, nanoid_1.nanoid)();
            const now = new Date();
            // Calculate next run time based on frequency
            const nextRunAt = this.calculateNextRunTime(alertData.frequency, now);
            const query = `
      INSERT INTO enhanced_job_alerts (
        id, user_id, name, search_criteria, is_active, frequency,
        next_run_at, email_enabled, push_enabled, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
            const values = [
                alertId,
                userId,
                alertData.name,
                JSON.stringify(alertData.searchCriteria),
                true,
                alertData.frequency,
                nextRunAt,
                (_a = alertData.emailEnabled) !== null && _a !== void 0 ? _a : true,
                (_b = alertData.pushEnabled) !== null && _b !== void 0 ? _b : false,
                now,
                now
            ];
            const result = yield db_1.db.query(query, values);
            return this.mapDbRowToJobAlert(result.rows[0]);
        });
    }
    /**
     * Update an existing job alert
     */
    static updateJobAlert(alertId, userId, updates) {
        return __awaiter(this, void 0, void 0, function* () {
            const setParts = [];
            const values = [alertId, userId];
            let paramCount = 2;
            // Build dynamic update query
            Object.entries(updates).forEach(([key, value]) => {
                if (value !== undefined) {
                    paramCount++;
                    if (key === 'searchCriteria') {
                        setParts.push(`search_criteria = $${paramCount}`);
                        values.push(JSON.stringify(value));
                    }
                    else if (key === 'nextRunAt' && alertId && updates.frequency) {
                        // Recalculate next run time if frequency changed
                        const nextRun = this.calculateNextRunTime(updates.frequency);
                        setParts.push(`next_run_at = $${paramCount}`);
                        values.push(nextRun);
                    }
                    else {
                        const dbField = this.camelToSnakeCase(key);
                        setParts.push(`${dbField} = $${paramCount}`);
                        values.push(value);
                    }
                }
            });
            if (setParts.length === 0) {
                return null;
            }
            setParts.push(`updated_at = NOW()`);
            const query = `
      UPDATE enhanced_job_alerts 
      SET ${setParts.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;
            const result = yield db_1.db.query(query, values);
            return result.rows.length > 0 ? this.mapDbRowToJobAlert(result.rows[0]) : null;
        });
    }
    /**
     * Get job alerts for a user
     */
    static getUserJobAlerts(userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT * FROM enhanced_job_alerts 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;
            const result = yield db_1.db.query(query, [userId]);
            return result.rows.map(this.mapDbRowToJobAlert);
        });
    }
    /**
     * Delete a job alert
     */
    static deleteJobAlert(alertId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      DELETE FROM enhanced_job_alerts 
      WHERE id = $1 AND user_id = $2
    `;
            const result = yield db_1.db.query(query, [alertId, userId]);
            return (result.rowCount || 0) > 0;
        });
    }
    /**
     * Run a job alert manually
     */
    static runJobAlertManually(alertId, userId) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify the alert belongs to the user
            const alertQuery = `
      SELECT * FROM enhanced_job_alerts 
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `;
            const alertResult = yield db_1.db.query(alertQuery, [alertId, userId]);
            if (alertResult.rows.length === 0) {
                throw new Error('Job alert not found or inactive');
            }
            // Queue the job alert for immediate processing
            yield exports.jobAlertsQueue.add('run-alert', { alertId }, {
                priority: 10, // High priority for manual runs
                delay: 0
            });
            // Process immediately and return results
            return yield this.processJobAlert(alertId);
        });
    }
    /**
     * Schedule recurring alerts job
     */
    static scheduleRecurringAlertsJob() {
        return __awaiter(this, void 0, void 0, function* () {
            // Add a repeating job that runs every hour to check for alerts that need to run
            yield exports.jobAlertsQueue.add('schedule-recurring-alerts', {}, {
                repeat: { pattern: '0 * * * *' }, // Every hour at minute 0
                jobId: 'recurring-alerts-scheduler' // Prevent duplicates
            });
        });
    }
    /**
     * Process a job alert and find new jobs
     */
    static processJobAlert(alertId) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Processing job alert: ${alertId}`);
            // Get the alert details
            const alertQuery = `
      SELECT eja.*, u.email 
      FROM enhanced_job_alerts eja
      JOIN users u ON eja.user_id = u.id
      WHERE eja.id = $1 AND eja.is_active = true
    `;
            const alertResult = yield db_1.db.query(alertQuery, [alertId]);
            if (alertResult.rows.length === 0) {
                throw new Error(`Active job alert not found: ${alertId}`);
            }
            const alert = alertResult.rows[0];
            const searchCriteria = alert.search_criteria;
            const lastRunAt = alert.last_run_at;
            try {
                // Perform job discovery using the search criteria
                const discoveryResult = yield multiPlatformJobDiscovery_1.MultiPlatformJobDiscoveryService.searchAllPlatforms(searchCriteria);
                let newJobs = [];
                let totalJobsChecked = 0;
                // Process results from each platform
                for (const [platform, results] of Object.entries(discoveryResult.platforms)) {
                    const platformResults = results;
                    if (platformResults.success && platformResults.jobs) {
                        totalJobsChecked += platformResults.jobs.length;
                        for (const job of platformResults.jobs) {
                            // Check if this is a new job (discovered after last run)
                            const jobDiscoveredAt = new Date(job.postedDate || Date.now());
                            const isNewJob = !lastRunAt || jobDiscoveredAt > lastRunAt;
                            if (isNewJob) {
                                // Check for duplicates to avoid sending the same job multiple times
                                const duplicateCheck = yield jobDeduplicationService_1.JobDeduplicationService.checkForDuplicates({
                                    title: job.title,
                                    company: job.company,
                                    location: job.location,
                                    url: job.url
                                });
                                if (!duplicateCheck.isDuplicate) {
                                    newJobs.push({
                                        id: job.id,
                                        title: job.title,
                                        company: job.company,
                                        location: job.location,
                                        url: job.url,
                                        platform,
                                        discoveredAt: jobDiscoveredAt,
                                        salary: job.salary,
                                        matchScore: job.score
                                    });
                                }
                            }
                        }
                    }
                }
                // Update alert's last run statistics
                yield this.updateAlertRunStats(alertId, newJobs.length);
                // Send notifications if there are new jobs and notifications are enabled
                if (newJobs.length > 0) {
                    if (alert.email_enabled) {
                        yield this.sendEmailNotification(alert.user_id, alert.email, alert.name, newJobs);
                    }
                    if (alert.push_enabled) {
                        yield this.sendPushNotification(alert.user_id, alert.name, newJobs);
                    }
                }
                console.log(`Job alert ${alertId} completed: ${newJobs.length} new jobs found`);
                return {
                    alertId,
                    newJobsFound: newJobs.length,
                    totalJobsChecked,
                    newJobs
                };
            }
            catch (error) {
                console.error(`Error processing job alert ${alertId}:`, error);
                throw error;
            }
        });
    }
    /**
     * Schedule recurring alerts that are due to run
     */
    static scheduleRecurringAlerts() {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      SELECT id FROM enhanced_job_alerts 
      WHERE is_active = true 
        AND frequency != 'manual'
        AND (next_run_at IS NULL OR next_run_at <= NOW())
    `;
            const result = yield db_1.db.query(query);
            for (const alert of result.rows) {
                // Queue each alert for processing
                yield exports.jobAlertsQueue.add('run-alert', { alertId: alert.id }, {
                    delay: Math.random() * 30000 // Spread out over 30 seconds to avoid overload
                });
                // Update next run time
                yield this.updateNextRunTime(alert.id);
            }
            console.log(`Scheduled ${result.rows.length} recurring job alerts`);
        });
    }
    /**
     * Update alert statistics after a run
     */
    static updateAlertRunStats(alertId, newJobsCount) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      UPDATE enhanced_job_alerts 
      SET 
        last_run_at = NOW(),
        last_results_count = $2,
        total_alerts_sent = total_alerts_sent + CASE WHEN $2 > 0 THEN 1 ELSE 0 END
      WHERE id = $1
    `;
            yield db_1.db.query(query, [alertId, newJobsCount]);
        });
    }
    /**
     * Update the next run time for an alert
     */
    static updateNextRunTime(alertId) {
        return __awaiter(this, void 0, void 0, function* () {
            const query = `
      UPDATE enhanced_job_alerts 
      SET next_run_at = $2
      WHERE id = $1
    `;
            // Get current frequency to calculate next run
            const alertQuery = `SELECT frequency FROM enhanced_job_alerts WHERE id = $1`;
            const alertResult = yield db_1.db.query(alertQuery, [alertId]);
            if (alertResult.rows.length > 0) {
                const frequency = alertResult.rows[0].frequency;
                const nextRun = this.calculateNextRunTime(frequency);
                yield db_1.db.query(query, [alertId, nextRun]);
            }
        });
    }
    /**
     * Calculate next run time based on frequency
     */
    static calculateNextRunTime(frequency, fromDate = new Date()) {
        if (frequency === 'manual') {
            return null;
        }
        const nextRun = new Date(fromDate);
        switch (frequency) {
            case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                break;
            case 'weekly':
                nextRun.setDate(nextRun.getDate() + 7);
                break;
            case 'monthly':
                nextRun.setMonth(nextRun.getMonth() + 1);
                break;
        }
        return nextRun;
    }
    /**
     * Send email notification for new jobs
     */
    static sendEmailNotification(userId, userEmail, alertName, newJobs) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implement email notification
            // This would integrate with your existing email service
            console.log(`Would send email to ${userEmail} about ${newJobs.length} new jobs for alert: ${alertName}`);
        });
    }
    /**
     * Send push notification for new jobs
     */
    static sendPushNotification(userId, alertName, newJobs) {
        return __awaiter(this, void 0, void 0, function* () {
            // TODO: Implement push notification
            console.log(`Would send push notification to user ${userId} about ${newJobs.length} new jobs for alert: ${alertName}`);
        });
    }
    /**
     * Convert camelCase to snake_case
     */
    static camelToSnakeCase(str) {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
    /**
     * Map database row to JobAlert object
     */
    static mapDbRowToJobAlert(row) {
        return {
            id: row.id,
            userId: row.user_id,
            name: row.name,
            searchCriteria: row.search_criteria,
            filters: row.filters,
            isActive: row.is_active,
            frequency: row.frequency,
            lastRunAt: row.last_run_at,
            nextRunAt: row.next_run_at,
            lastResultsCount: row.last_results_count || 0,
            totalAlertsSent: row.total_alerts_sent || 0,
            emailEnabled: row.email_enabled,
            pushEnabled: row.push_enabled,
            createdAt: row.created_at,
            updatedAt: row.updated_at
        };
    }
    /**
     * Close the worker gracefully
     */
    static close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.worker) {
                yield this.worker.close();
                this.worker = null;
            }
        });
    }
}
exports.JobAlertsService = JobAlertsService;
JobAlertsService.worker = null;
