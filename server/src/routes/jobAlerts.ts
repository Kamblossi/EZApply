import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { JobAlertsService } from '../services/jobAlertsService';
import { db } from '../db';

const router = Router();

// Validation schemas
const CreateJobAlertSchema = z.object({
  name: z.string().min(1, 'Alert name is required'),
  searchCriteria: z.object({
    keywords: z.string().min(1),
    location: z.string().optional(),
    platforms: z.array(z.string()).default(['nhs', 'indeed', 'reed']),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    jobType: z.string().optional(),
    radius: z.number().default(25),
    excludeKeywords: z.array(z.string()).default([])
  }),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'manual']),
  emailEnabled: z.boolean().default(true),
  pushEnabled: z.boolean().default(false)
});

const UpdateJobAlertSchema = CreateJobAlertSchema.partial();

// Create a new job alert
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const validatedData = CreateJobAlertSchema.parse(req.body);
    const userId = (req as any).user.id;

    const newAlert = await JobAlertsService.createJobAlert(userId, validatedData);

    res.status(201).json({
      message: 'Job alert created successfully',
      alert: newAlert
    });
  } catch (error) {
    console.error('Error creating job alert:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }
    res.status(500).json({ error: 'Failed to create job alert' });
  }
});

// Get user's job alerts
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
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

    const result = await db.query(query, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM enhanced_job_alerts WHERE user_id = $1';
    const countParams = [userId];
    if (active_only === 'true') {
      countQuery += ' AND is_active = true';
    }
    const countResult = await db.query(countQuery, countParams);
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
  } catch (error) {
    console.error('Error fetching job alerts:', error);
    res.status(500).json({ error: 'Failed to fetch job alerts' });
  }
});

// Get specific job alert
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const result = await db.query(
      `SELECT 
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
      WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job alert not found' });
    }

    // Get recent matches
    const matches = await db.query(
      `SELECT 
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
      LIMIT 20`,
      [id]
    );

    res.json({
      alert: result.rows[0],
      recent_matches: matches.rows
    });
  } catch (error) {
    console.error('Error fetching job alert:', error);
    res.status(500).json({ error: 'Failed to fetch job alert' });
  }
});

// Update job alert
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const validatedData = UpdateJobAlertSchema.parse(req.body);

    // Check if alert exists and belongs to user
    const existingAlert = await db.query(
      'SELECT id FROM enhanced_job_alerts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

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

    const result = await db.query(query, values);

    // Note: Alert scheduling is handled automatically by the service
    res.json({
      message: 'Job alert updated successfully',
      alert: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating job alert:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.issues
      });
    }
    res.status(500).json({ error: 'Failed to update job alert' });
  }
});

// Delete job alert
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const result = await db.query(
      'DELETE FROM enhanced_job_alerts WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job alert not found' });
    }

    res.json({ message: 'Job alert deleted successfully' });
  } catch (error) {
    console.error('Error deleting job alert:', error);
    res.status(500).json({ error: 'Failed to delete job alert' });
  }
});

// Toggle job alert active status
router.patch('/:id/toggle', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const result = await db.query(
      `UPDATE enhanced_job_alerts 
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 AND user_id = $2 
       RETURNING id, is_active`,
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Job alert not found' });
    }

    // Note: Alert scheduling is handled automatically by the service
    res.json({
      message: `Job alert ${result.rows[0].is_active ? 'activated' : 'deactivated'} successfully`,
      is_active: result.rows[0].is_active
    });
  } catch (error) {
    console.error('Error toggling job alert:', error);
    res.status(500).json({ error: 'Failed to toggle job alert' });
  }
});

// Test job alert (run immediately)
router.post('/:id/test', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Verify alert belongs to user
    const alertResult = await db.query(
      'SELECT * FROM enhanced_job_alerts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job alert not found' });
    }

    const alert = alertResult.rows[0];

    // Run the alert manually using the public method
    const result = await JobAlertsService.runJobAlertManually(id, userId);

    res.json({
      message: 'Job alert test completed',
      matches_found: result.newJobsFound,
      matches: result.newJobs
    });
  } catch (error) {
    console.error('Error testing job alert:', error);
    res.status(500).json({ error: 'Failed to test job alert' });
  }
});

// Get job alert statistics
router.get('/:id/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    // Verify alert belongs to user
    const alertResult = await db.query(
      'SELECT id FROM enhanced_job_alerts WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (alertResult.rows.length === 0) {
      return res.status(404).json({ error: 'Job alert not found' });
    }

    // Get statistics
    const stats = await db.query(
      `SELECT 
        COUNT(DISTINCT jam.job_id) as total_matches,
        COUNT(DISTINCT CASE WHEN jam.created_at >= NOW() - INTERVAL '7 days' THEN jam.job_id END) as matches_last_week,
        COUNT(DISTINCT CASE WHEN jam.created_at >= NOW() - INTERVAL '30 days' THEN jam.job_id END) as matches_last_month,
        MAX(jam.created_at) as last_match_date,
        COUNT(DISTINCT DATE(jam.created_at)) as active_days
      FROM job_alert_matches jam
      WHERE jam.alert_id = $1`,
      [id]
    );

    const weeklyTrend = await db.query(
      `SELECT 
        DATE_TRUNC('week', jam.created_at) as week,
        COUNT(DISTINCT jam.job_id) as matches
      FROM job_alert_matches jam
      WHERE jam.alert_id = $1 
        AND jam.created_at >= NOW() - INTERVAL '8 weeks'
      GROUP BY DATE_TRUNC('week', jam.created_at)
      ORDER BY week DESC`,
      [id]
    );

    res.json({
      stats: stats.rows[0],
      weekly_trend: weeklyTrend.rows
    });
  } catch (error) {
    console.error('Error fetching job alert stats:', error);
    res.status(500).json({ error: 'Failed to fetch job alert statistics' });
  }
});

export default router;
