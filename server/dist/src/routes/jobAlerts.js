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
const jobAlertsService_1 = require("../services/jobAlertsService");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// Validation schemas
const CreateJobAlertSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, 'Alert name is required'),
    searchCriteria: zod_1.z.object({
        keywords: zod_1.z.string().min(1),
        location: zod_1.z.string().optional(),
        platforms: zod_1.z.array(zod_1.z.string()).default(['nhs', 'indeed', 'reed']),
        salaryMin: zod_1.z.number().optional(),
        salaryMax: zod_1.z.number().optional(),
        jobType: zod_1.z.string().optional(),
        radius: zod_1.z.number().default(25),
        excludeKeywords: zod_1.z.array(zod_1.z.string()).default([])
    }),
    frequency: zod_1.z.enum(['daily', 'weekly', 'monthly', 'manual']),
    emailEnabled: zod_1.z.boolean().default(true),
    pushEnabled: zod_1.z.boolean().default(false)
});
const UpdateJobAlertSchema = CreateJobAlertSchema.partial();
// Create a new job alert
router.post('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const validatedData = CreateJobAlertSchema.parse(req.body);
        const userId = req.user.id;
        const newAlert = yield jobAlertsService_1.JobAlertsService.createJobAlert(userId, validatedData);
        res.status(201).json({
            message: 'Job alert created successfully',
            alert: newAlert
        });
    }
    catch (error) {
        console.error('Error creating job alert:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.issues
            });
        }
        res.status(500).json({ error: 'Failed to create job alert' });
    }
}));
// Get user's job alerts
router.get('/', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, active_only } = req.query;
        let query = `
      SELECT 
        id,
        name,
        search_criteria,
        frequency,
        is_active,
        notification_email,
        platforms,
        last_run_at,
        next_run_at,
        created_at,
        updated_at,
        (
          SELECT COUNT(*) 
          FROM jobs j 
          WHERE j.id = ANY(
            SELECT DISTINCT job_id 
            FROM job_alert_matches 
            WHERE alert_id = eja.id
          )
        ) as matched_jobs_count
      FROM enhanced_job_alerts eja
      WHERE user_id = $1
    `;
        const params = [userId];
        if (active_only === 'true') {
            query += ' AND is_active = true';
        }
        query += ' ORDER BY created_at DESC';
        const offset = (Number(page) - 1) * Number(limit);
        query += ` LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(String(limit), String(offset));
        const result = yield db_1.db.query(query, params);
        // Get total count
        let countQuery = 'SELECT COUNT(*) FROM enhanced_job_alerts WHERE user_id = $1';
        const countParams = [userId];
        if (active_only === 'true') {
            countQuery += ' AND is_active = true';
        }
        const countResult = yield db_1.db.query(countQuery, countParams);
        const totalCount = parseInt(countResult.rows[0].count);
        res.json({
            alerts: result.rows,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: totalCount,
                totalPages: Math.ceil(totalCount / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('Error fetching job alerts:', error);
        res.status(500).json({ error: 'Failed to fetch job alerts' });
    }
}));
// Get specific job alert
router.get('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const result = yield db_1.db.query(`SELECT 
        id,
        name,
        search_criteria,
        frequency,
        is_active,
        notification_email,
        platforms,
        last_run_at,
        next_run_at,
        created_at,
        updated_at
      FROM enhanced_job_alerts 
      WHERE id = $1 AND user_id = $2`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job alert not found' });
        }
        // Get recent matches
        const matches = yield db_1.db.query(`SELECT 
        j.id,
        j.title,
        j.company,
        j.location,
        j.salary_range,
        j.created_at as matched_at,
        jam.created_at as alert_match_date
      FROM job_alert_matches jam
      JOIN jobs j ON j.id = jam.job_id
      WHERE jam.alert_id = $1
      ORDER BY jam.created_at DESC
      LIMIT 20`, [id]);
        res.json({
            alert: result.rows[0],
            recent_matches: matches.rows
        });
    }
    catch (error) {
        console.error('Error fetching job alert:', error);
        res.status(500).json({ error: 'Failed to fetch job alert' });
    }
}));
// Update job alert
router.put('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const validatedData = UpdateJobAlertSchema.parse(req.body);
        // Check if alert exists and belongs to user
        const existingAlert = yield db_1.db.query('SELECT id FROM enhanced_job_alerts WHERE id = $1 AND user_id = $2', [id, userId]);
        if (existingAlert.rows.length === 0) {
            return res.status(404).json({ error: 'Job alert not found' });
        }
        // Build update query dynamically
        const updateFields = [];
        const values = [];
        let paramCount = 1;
        for (const [key, value] of Object.entries(validatedData)) {
            if (value !== undefined) {
                updateFields.push(`${key} = $${paramCount}`);
                values.push(key === 'search_criteria' ? JSON.stringify(value) : value);
                paramCount++;
            }
        }
        if (updateFields.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }
        updateFields.push(`updated_at = NOW()`);
        values.push(id, userId);
        const query = `
      UPDATE enhanced_job_alerts 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND user_id = $${paramCount + 1}
      RETURNING *
    `;
        const result = yield db_1.db.query(query, values);
        // Note: Alert scheduling is handled automatically by the service
        res.json({
            message: 'Job alert updated successfully',
            alert: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error updating job alert:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                error: 'Validation error',
                details: error.issues
            });
        }
        res.status(500).json({ error: 'Failed to update job alert' });
    }
}));
// Delete job alert
router.delete('/:id', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const result = yield db_1.db.query('DELETE FROM enhanced_job_alerts WHERE id = $1 AND user_id = $2 RETURNING id', [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job alert not found' });
        }
        res.json({ message: 'Job alert deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting job alert:', error);
        res.status(500).json({ error: 'Failed to delete job alert' });
    }
}));
// Toggle job alert active status
router.patch('/:id/toggle', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const result = yield db_1.db.query(`UPDATE enhanced_job_alerts 
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 
       RETURNING id, is_active`, [id, userId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job alert not found' });
        }
        // Note: Alert scheduling is handled automatically by the service
        res.json({
            message: `Job alert ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully`,
            is_active: result.rows[0].is_active
        });
    }
    catch (error) {
        console.error('Error toggling job alert:', error);
        res.status(500).json({ error: 'Failed to toggle job alert' });
    }
}));
// Test job alert (run immediately)
router.post('/:id/test', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Verify alert belongs to user
        const alertResult = yield db_1.db.query('SELECT * FROM enhanced_job_alerts WHERE id = $1 AND user_id = $2', [id, userId]);
        if (alertResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job alert not found' });
        }
        const alert = alertResult.rows[0];
        // Run the alert manually using the public method
        const result = yield jobAlertsService_1.JobAlertsService.runJobAlertManually(id, userId);
        res.json({
            message: 'Job alert test completed',
            matches_found: result.newJobsFound,
            matches: result.newJobs
        });
    }
    catch (error) {
        console.error('Error testing job alert:', error);
        res.status(500).json({ error: 'Failed to test job alert' });
    }
}));
// Get job alert statistics
router.get('/:id/stats', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        // Verify alert belongs to user
        const alertResult = yield db_1.db.query('SELECT id FROM enhanced_job_alerts WHERE id = $1 AND user_id = $2', [id, userId]);
        if (alertResult.rows.length === 0) {
            return res.status(404).json({ error: 'Job alert not found' });
        }
        // Get statistics
        const stats = yield db_1.db.query(`SELECT 
        COUNT(DISTINCT jam.job_id) as total_matches,
        COUNT(DISTINCT CASE WHEN jam.created_at >= NOW() - INTERVAL '7 days' THEN jam.job_id END) as matches_last_week,
        COUNT(DISTINCT CASE WHEN jam.created_at >= NOW() - INTERVAL '30 days' THEN jam.job_id END) as matches_last_month,
        MAX(jam.created_at) as last_match_date,
        COUNT(DISTINCT DATE(jam.created_at)) as active_days
      FROM job_alert_matches jam
      WHERE jam.alert_id = $1`, [id]);
        const weeklyTrend = yield db_1.db.query(`SELECT 
        DATE_TRUNC('week', jam.created_at) as week,
        COUNT(DISTINCT jam.job_id) as matches
      FROM job_alert_matches jam
      WHERE jam.alert_id = $1 
        AND jam.created_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', jam.created_at)
      ORDER BY week DESC`, [id]);
        res.json({
            stats: stats.rows[0],
            weekly_trend: weeklyTrend.rows
        });
    }
    catch (error) {
        console.error('Error fetching job alert stats:', error);
        res.status(500).json({ error: 'Failed to fetch job alert statistics' });
    }
}));
exports.default = router;
