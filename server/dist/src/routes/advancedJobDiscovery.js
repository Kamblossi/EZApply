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
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../middleware/auth");
const multiPlatformJobDiscovery_1 = require("../services/multiPlatformJobDiscovery");
const jobAlertService_1 = require("../services/jobAlertService");
const db_1 = require("../db");
const nanoid_1 = require("nanoid");
const router = (0, express_1.Router)();
// =====================================================================
// POST /api/jobs/discover/advanced - Multi-platform job search
// =====================================================================
router.post('/discover/advanced', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Validate search criteria
        const searchCriteria = multiPlatformJobDiscovery_1.JobSearchSchema.parse(req.body);
        // Perform multi-platform search
        const searchResults = yield multiPlatformJobDiscovery_1.MultiPlatformJobDiscoveryService.searchAllPlatforms(searchCriteria);
        // Store search history
        yield db_1.db.query(`INSERT INTO job_searches (id, user_id, search_criteria, results_count, platform)
       VALUES ($1, $2, $3, $4, $5)`, [
            (0, nanoid_1.nanoid)(),
            userId,
            JSON.stringify(searchCriteria),
            searchResults.totalJobs,
            'multi-platform'
        ]);
        // Cache discovered jobs with enhanced metadata
        for (const [platformName, platformResult] of Object.entries(searchResults.platforms)) {
            if (platformResult.success && platformResult.jobs.length > 0) {
                for (const job of platformResult.jobs) {
                    try {
                        yield db_1.db.query(`INSERT INTO discovered_jobs (
                id, search_id, platform, external_id, title, company, location, 
                url, salary_min, salary_max, description, requirements, benefits,
                posted_date, deadline_date, job_type, work_pattern, experience_level,
                sector, matching_score, discovered_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
              ON CONFLICT (external_id, platform) DO UPDATE SET
                discovered_at = NOW(),
                search_id = $2,
                matching_score = EXCLUDED.matching_score`, [
                            (0, nanoid_1.nanoid)(),
                            searchResults.searchId,
                            job.platform,
                            job.id,
                            job.title,
                            job.company,
                            job.location,
                            job.url,
                            job.salary ? extractSalaryMin(job.salary) : null,
                            job.salary ? extractSalaryMax(job.salary) : null,
                            job.description,
                            job.requirements ? JSON.stringify(job.requirements) : null,
                            job.benefits ? JSON.stringify(job.benefits) : null,
                            job.postedDate ? new Date(job.postedDate) : null,
                            job.deadline ? new Date(job.deadline) : null,
                            job.jobType,
                            job.workPattern,
                            job.experience,
                            job.sector,
                            job.score || 0
                        ]);
                    }
                    catch (jobError) {
                        console.warn('Failed to cache job:', job.id, jobError);
                    }
                }
            }
        }
        res.status(200).json(Object.assign({ success: true }, searchResults));
    }
    catch (error) {
        console.error('Advanced job discovery error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Invalid search criteria',
                details: error.issues
            });
        }
        res.status(500).json({
            success: false,
            error: 'Advanced job discovery failed',
            details: error.message
        });
    }
}));
// =====================================================================
// GET /api/jobs/discover/platforms - Get supported platforms
// =====================================================================
router.get('/discover/platforms', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const platforms = multiPlatformJobDiscovery_1.MultiPlatformJobDiscoveryService.getSupportedPlatforms();
        res.status(200).json({ platforms });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch platforms' });
    }
}));
// =====================================================================
// GET /api/jobs/discover/categories - Get job categories
// =====================================================================
router.get('/discover/categories', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const categories = multiPlatformJobDiscovery_1.MultiPlatformJobDiscoveryService.getJobCategories();
        res.status(200).json({ categories });
    }
    catch (error) {
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
}));
// =====================================================================
// POST /api/jobs/alerts - Create job alert
// =====================================================================
router.post('/alerts', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const alertConfig = jobAlertService_1.JobAlertSchema.parse(req.body);
        const alert = yield jobAlertService_1.JobAlertService.createAlert(userId, alertConfig);
        res.status(201).json({
            success: true,
            alert
        });
    }
    catch (error) {
        console.error('Create alert error:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Invalid alert configuration',
                details: error.issues
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to create alert',
            details: error.message
        });
    }
}));
// =====================================================================
// GET /api/jobs/alerts - Get user's job alerts
// =====================================================================
router.get('/alerts', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const alerts = yield jobAlertService_1.JobAlertService.getUserAlerts(userId);
        res.status(200).json({ alerts });
    }
    catch (error) {
        console.error('Get alerts error:', error);
        res.status(500).json({ error: 'Failed to fetch alerts' });
    }
}));
// =====================================================================
// PUT /api/jobs/alerts/:alertId - Update job alert
// =====================================================================
router.put('/alerts/:alertId', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { alertId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const updates = req.body;
        const alert = yield jobAlertService_1.JobAlertService.updateAlert(alertId, userId, updates);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.status(200).json({
            success: true,
            alert
        });
    }
    catch (error) {
        console.error('Update alert error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update alert',
            details: error.message
        });
    }
}));
// =====================================================================
// DELETE /api/jobs/alerts/:alertId - Delete job alert
// =====================================================================
router.delete('/alerts/:alertId', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { alertId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const deleted = yield jobAlertService_1.JobAlertService.deleteAlert(alertId, userId);
        if (!deleted) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Delete alert error:', error);
        res.status(500).json({ error: 'Failed to delete alert' });
    }
}));
// =====================================================================
// POST /api/jobs/alerts/:alertId/execute - Execute job alert manually
// =====================================================================
router.post('/alerts/:alertId/execute', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { alertId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Verify alert ownership
        const alerts = yield jobAlertService_1.JobAlertService.getUserAlerts(userId);
        const alert = alerts.find(a => a.id === alertId);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const execution = yield jobAlertService_1.JobAlertService.executeAlert(alertId);
        res.status(200).json({
            success: true,
            execution
        });
    }
    catch (error) {
        console.error('Execute alert error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to execute alert',
            details: error.message
        });
    }
}));
// =====================================================================
// GET /api/jobs/alerts/:alertId/executions - Get alert execution history
// =====================================================================
router.get('/alerts/:alertId/executions', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { alertId } = req.params;
        const limit = parseInt(req.query.limit) || 20;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Verify alert ownership
        const alerts = yield jobAlertService_1.JobAlertService.getUserAlerts(userId);
        const alert = alerts.find(a => a.id === alertId);
        if (!alert) {
            return res.status(404).json({ error: 'Alert not found' });
        }
        const executions = yield jobAlertService_1.JobAlertService.getAlertExecutions(alertId, limit);
        res.status(200).json({ executions });
    }
    catch (error) {
        console.error('Get alert executions error:', error);
        res.status(500).json({ error: 'Failed to fetch alert executions' });
    }
}));
// =====================================================================
// GET /api/jobs/recommendations - Get personalized job recommendations
// =====================================================================
router.get('/recommendations', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const limit = parseInt(req.query.limit) || 10;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Get user's matching profile
        const profileResult = yield db_1.db.query('SELECT * FROM job_matching_profiles WHERE user_id = $1', [userId]);
        let searchCriteria;
        if (profileResult.rows.length > 0) {
            const profile = profileResult.rows[0];
            searchCriteria = {
                keywords: ((_b = profile.preferred_job_titles) === null || _b === void 0 ? void 0 : _b.join(' ')) || '',
                location: ((_c = profile.preferred_locations) === null || _c === void 0 ? void 0 : _c[0]) || '',
                platforms: ['nhs', 'indeed', 'reed'],
                salaryMin: (_d = profile.salary_expectations) === null || _d === void 0 ? void 0 : _d.min,
                salaryMax: (_e = profile.salary_expectations) === null || _e === void 0 ? void 0 : _e.max
            };
        }
        else {
            // Fallback to user's recent search history
            const recentSearchResult = yield db_1.db.query(`SELECT search_criteria FROM job_searches 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`, [userId]);
            if (recentSearchResult.rows.length > 0) {
                searchCriteria = recentSearchResult.rows[0].search_criteria;
            }
            else {
                return res.status(200).json({
                    recommendations: [],
                    message: 'Complete your profile to get personalized recommendations'
                });
            }
        }
        // Get recommendations from recent discoveries
        const recommendationsResult = yield db_1.db.query(`SELECT dj.*, jms.matching_score 
       FROM discovered_jobs dj
       LEFT JOIN job_matching_scores jms ON dj.external_id = jms.job_external_id 
         AND dj.platform = jms.platform AND jms.user_id = $1
       WHERE dj.discovered_at >= NOW() - INTERVAL '7 days'
         AND dj.is_applied = FALSE
       ORDER BY COALESCE(jms.matching_score, dj.matching_score, 0) DESC
       LIMIT $2`, [userId, limit]);
        const recommendations = recommendationsResult.rows.map(row => ({
            id: row.external_id,
            title: row.title,
            company: row.company,
            location: row.location,
            salary: formatSalaryRange(row.salary_min, row.salary_max),
            url: row.url,
            description: row.description,
            requirements: row.requirements ? JSON.parse(row.requirements) : [],
            benefits: row.benefits ? JSON.parse(row.benefits) : [],
            platform: row.platform,
            matchingScore: row.matching_score,
            discoveredAt: row.discovered_at
        }));
        res.status(200).json({ recommendations });
    }
    catch (error) {
        console.error('Get recommendations error:', error);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
}));
// =====================================================================
// POST /api/jobs/recommendations/:jobId/feedback - Provide feedback on recommendation
// =====================================================================
router.post('/recommendations/:jobId/feedback', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { jobId } = req.params;
        const { feedback, platform } = req.body; // feedback: -1, 0, 1
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        if (![-1, 0, 1].includes(feedback)) {
            return res.status(400).json({ error: 'Invalid feedback value' });
        }
        yield db_1.db.query(`INSERT INTO job_matching_scores (id, user_id, job_external_id, platform, matching_score, user_feedback, feedback_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, job_external_id, platform) 
       DO UPDATE SET user_feedback = $6, feedback_date = NOW()`, [(0, nanoid_1.nanoid)(), userId, jobId, platform, 0, feedback]);
        res.status(200).json({ success: true });
    }
    catch (error) {
        console.error('Recommendation feedback error:', error);
        res.status(500).json({ error: 'Failed to save feedback' });
    }
}));
// =====================================================================
// GET /api/jobs/analytics - Get user job discovery analytics
// =====================================================================
router.get('/analytics', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const analyticsResult = yield db_1.db.query('SELECT * FROM user_job_discovery_analytics WHERE user_id = $1', [userId]);
        const analytics = analyticsResult.rows[0] || {
            user_id: userId,
            total_searches: 0,
            searches_last_30_days: 0,
            total_discovered_jobs: 0,
            discovered_last_30_days: 0,
            applied_jobs: 0,
            total_alerts: 0,
            active_alerts: 0
        };
        res.status(200).json({ analytics });
    }
    catch (error) {
        console.error('Get analytics error:', error);
        res.status(500).json({ error: 'Failed to fetch analytics' });
    }
}));
// Helper functions (same as before)
function extractSalaryMin(salaryText) {
    const matches = salaryText.match(/£?(\d+(?:,\d+)?)/);
    return matches ? parseInt(matches[1].replace(/,/g, '')) : null;
}
function extractSalaryMax(salaryText) {
    const matches = salaryText.match(/£?\d+(?:,\d+)?\s*[-–]\s*£?(\d+(?:,\d+)?)/);
    return matches ? parseInt(matches[1].replace(/,/g, '')) : null;
}
function formatSalaryRange(min, max) {
    if (!min && !max)
        return undefined;
    if (min && max)
        return `£${min.toLocaleString()} - £${max.toLocaleString()}`;
    if (min)
        return `£${min.toLocaleString()}+`;
    if (max)
        return `Up to £${max.toLocaleString()}`;
    return undefined;
}
exports.default = router;
