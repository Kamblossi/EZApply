import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { 
  MultiPlatformJobDiscoveryService, 
  JobSearchSchema
} from '../services/multiPlatformJobDiscovery';
import { 
  JobAlertService, 
  JobAlertSchema 
} from '../services/jobAlertService';
import { db } from '../db';
import { nanoid } from 'nanoid';

const router = Router();

// =====================================================================
// POST /api/jobs/discover/advanced - Multi-platform job search
// =====================================================================
router.post('/discover/advanced', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate search criteria
    const searchCriteria = JobSearchSchema.parse(req.body);
    
    // Perform multi-platform search
    const searchResults = await MultiPlatformJobDiscoveryService.searchAllPlatforms(searchCriteria);
    
    // Store search history
    await db.query(
      `INSERT INTO job_searches (id, user_id, search_criteria, results_count, platform)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        nanoid(),
        userId,
        JSON.stringify(searchCriteria),
        searchResults.totalJobs,
        'multi-platform'
      ]
    );

    // Cache discovered jobs with enhanced metadata
    for (const [platformName, platformResult] of Object.entries(searchResults.platforms)) {
      if (platformResult.success && platformResult.jobs.length > 0) {
        for (const job of platformResult.jobs) {
          try {
            await db.query(
              `INSERT INTO discovered_jobs (
                id, search_id, platform, external_id, title, company, location, 
                url, salary_min, salary_max, description, requirements, benefits,
                posted_date, deadline_date, job_type, work_pattern, experience_level,
                sector, matching_score, discovered_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, NOW())
              ON CONFLICT (external_id, platform) DO UPDATE SET
                discovered_at = NOW(),
                search_id = $2,
                matching_score = EXCLUDED.matching_score`,
              [
                nanoid(),
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
              ]
            );
          } catch (jobError) {
            console.warn('Failed to cache job:', job.id, jobError);
          }
        }
      }
    }

    res.status(200).json({
      success: true,
      ...searchResults
    });

  } catch (error: any) {
    console.error('Advanced job discovery error:', error);
    
    if (error instanceof z.ZodError) {
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
});

// =====================================================================
// GET /api/jobs/discover/platforms - Get supported platforms
// =====================================================================
router.get('/discover/platforms', async (req: Request, res: Response) => {
  try {
    const platforms = MultiPlatformJobDiscoveryService.getSupportedPlatforms();
    res.status(200).json({ platforms });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch platforms' });
  }
});

// =====================================================================
// GET /api/jobs/discover/categories - Get job categories
// =====================================================================
router.get('/discover/categories', async (req: Request, res: Response) => {
  try {
    const categories = MultiPlatformJobDiscoveryService.getJobCategories();
    res.status(200).json({ categories });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// =====================================================================
// POST /api/jobs/alerts - Create job alert
// =====================================================================
router.post('/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const alertConfig = JobAlertSchema.parse(req.body);
    const alert = await JobAlertService.createAlert(userId, alertConfig);
    
    res.status(201).json({
      success: true,
      alert
    });

  } catch (error: any) {
    console.error('Create alert error:', error);
    
    if (error instanceof z.ZodError) {
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
});

// =====================================================================
// GET /api/jobs/alerts - Get user's job alerts
// =====================================================================
router.get('/alerts', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const alerts = await JobAlertService.getUserAlerts(userId);
    res.status(200).json({ alerts });

  } catch (error: any) {
    console.error('Get alerts error:', error);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// =====================================================================
// PUT /api/jobs/alerts/:alertId - Update job alert
// =====================================================================
router.put('/alerts/:alertId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { alertId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const updates = req.body;
    const alert = await JobAlertService.updateAlert(alertId, userId, updates);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.status(200).json({
      success: true,
      alert
    });

  } catch (error: any) {
    console.error('Update alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update alert',
      details: error.message
    });
  }
});

// =====================================================================
// DELETE /api/jobs/alerts/:alertId - Delete job alert
// =====================================================================
router.delete('/alerts/:alertId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { alertId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const deleted = await JobAlertService.deleteAlert(alertId, userId);
    
    if (!deleted) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.status(204).send();

  } catch (error: any) {
    console.error('Delete alert error:', error);
    res.status(500).json({ error: 'Failed to delete alert' });
  }
});

// =====================================================================
// POST /api/jobs/alerts/:alertId/execute - Execute job alert manually
// =====================================================================
router.post('/alerts/:alertId/execute', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { alertId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify alert ownership
    const alerts = await JobAlertService.getUserAlerts(userId);
    const alert = alerts.find(a => a.id === alertId);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const execution = await JobAlertService.executeAlert(alertId);
    
    res.status(200).json({
      success: true,
      execution
    });

  } catch (error: any) {
    console.error('Execute alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to execute alert',
      details: error.message
    });
  }
});

// =====================================================================
// GET /api/jobs/alerts/:alertId/executions - Get alert execution history
// =====================================================================
router.get('/alerts/:alertId/executions', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { alertId } = req.params;
    const limit = parseInt(req.query.limit as string) || 20;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify alert ownership
    const alerts = await JobAlertService.getUserAlerts(userId);
    const alert = alerts.find(a => a.id === alertId);
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const executions = await JobAlertService.getAlertExecutions(alertId, limit);
    
    res.status(200).json({ executions });

  } catch (error: any) {
    console.error('Get alert executions error:', error);
    res.status(500).json({ error: 'Failed to fetch alert executions' });
  }
});

// =====================================================================
// GET /api/jobs/recommendations - Get personalized job recommendations
// =====================================================================
router.get('/recommendations', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const limit = parseInt(req.query.limit as string) || 10;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get user's matching profile
    const profileResult = await db.query(
      'SELECT * FROM job_matching_profiles WHERE user_id = $1',
      [userId]
    );

    let searchCriteria;
    if (profileResult.rows.length > 0) {
      const profile = profileResult.rows[0];
      searchCriteria = {
        keywords: profile.preferred_job_titles?.join(' ') || '',
        location: profile.preferred_locations?.[0] || '',
        platforms: ['nhs', 'indeed', 'reed'],
        salaryMin: profile.salary_expectations?.min,
        salaryMax: profile.salary_expectations?.max
      };
    } else {
      // Fallback to user's recent search history
      const recentSearchResult = await db.query(
        `SELECT search_criteria FROM job_searches 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [userId]
      );
      
      if (recentSearchResult.rows.length > 0) {
        searchCriteria = recentSearchResult.rows[0].search_criteria;
      } else {
        return res.status(200).json({ 
          recommendations: [],
          message: 'Complete your profile to get personalized recommendations'
        });
      }
    }

    // Get recommendations from recent discoveries
    const recommendationsResult = await db.query(
      `SELECT dj.*, jms.matching_score 
       FROM discovered_jobs dj
       LEFT JOIN job_matching_scores jms ON dj.external_id = jms.job_external_id 
         AND dj.platform = jms.platform AND jms.user_id = $1
       WHERE dj.discovered_at >= NOW() - INTERVAL '7 days'
         AND dj.is_applied = FALSE
       ORDER BY COALESCE(jms.matching_score, dj.matching_score, 0) DESC
       LIMIT $2`,
      [userId, limit]
    );

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

  } catch (error: any) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: 'Failed to fetch recommendations' });
  }
});

// =====================================================================
// POST /api/jobs/recommendations/:jobId/feedback - Provide feedback on recommendation
// =====================================================================
router.post('/recommendations/:jobId/feedback', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { jobId } = req.params;
    const { feedback, platform } = req.body; // feedback: -1, 0, 1
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (![-1, 0, 1].includes(feedback)) {
      return res.status(400).json({ error: 'Invalid feedback value' });
    }

    await db.query(
      `INSERT INTO job_matching_scores (id, user_id, job_external_id, platform, matching_score, user_feedback, feedback_date)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (user_id, job_external_id, platform) 
       DO UPDATE SET user_feedback = $6, feedback_date = NOW()`,
      [nanoid(), userId, jobId, platform, 0, feedback]
    );

    res.status(200).json({ success: true });

  } catch (error: any) {
    console.error('Recommendation feedback error:', error);
    res.status(500).json({ error: 'Failed to save feedback' });
  }
});

// =====================================================================
// GET /api/jobs/analytics - Get user job discovery analytics
// =====================================================================
router.get('/analytics', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const analyticsResult = await db.query(
      'SELECT * FROM user_job_discovery_analytics WHERE user_id = $1',
      [userId]
    );

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

  } catch (error: any) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Helper functions (same as before)
function extractSalaryMin(salaryText: string): number | null {
  const matches = salaryText.match(/£?(\d+(?:,\d+)?)/);
  return matches ? parseInt(matches[1].replace(/,/g, '')) : null;
}

function extractSalaryMax(salaryText: string): number | null {
  const matches = salaryText.match(/£?\d+(?:,\d+)?\s*[-–]\s*£?(\d+(?:,\d+)?)/);
  return matches ? parseInt(matches[1].replace(/,/g, '')) : null;
}

function formatSalaryRange(min: number | null, max: number | null): string | undefined {
  if (!min && !max) return undefined;
  if (min && max) return `£${min.toLocaleString()} - £${max.toLocaleString()}`;
  if (min) return `£${min.toLocaleString()}+`;
  if (max) return `Up to £${max.toLocaleString()}`;
  return undefined;
}

export default router;
