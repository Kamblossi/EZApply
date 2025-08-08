import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { requireAuth, JwtPayload } from '../middleware/auth';
import { 
  NHSJobSearchService, 
  NHSJobSearchSchema,
  JobSearchResults 
} from '../services/nhsJobSearch';
import { db } from '../db';
import { nanoid } from 'nanoid';

// Extend Request type to include user
interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const router = Router();

// =====================================================================
// POST /api/jobs/discover - Search for jobs across multiple platforms
// =====================================================================
router.post('/discover', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Validate search criteria
    const searchCriteria = NHSJobSearchSchema.parse(req.body);
    
    // Perform NHS Trac search
    const nhsResults = await NHSJobSearchService.searchJobs(searchCriteria);
    
    // Store search history in database
    await db.query(
      `INSERT INTO job_searches (id, user_id, search_criteria, results_count, platform)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        nanoid(),
        userId,
        JSON.stringify(searchCriteria),
        nhsResults.totalFound,
        'NHS'
      ]
    );

    // Cache discovered jobs for this search
    if (nhsResults.success && nhsResults.jobs.length > 0) {
      for (const job of nhsResults.jobs) {
        try {
          await db.query(
            `INSERT INTO discovered_jobs (
              id, search_id, platform, external_id, title, company, location, 
              url, salary_min, salary_max, description, requirements, 
              posted_date, deadline_date, discovered_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            ON CONFLICT (external_id, platform) DO UPDATE SET
              discovered_at = NOW(),
              search_id = $2`,
            [
              nanoid(),
              nhsResults.searchId,
              'NHS',
              job.id,
              job.title,
              job.company,
              job.location,
              job.url,
              job.salary ? extractSalaryMin(job.salary) : null,
              job.salary ? extractSalaryMax(job.salary) : null,
              job.description,
              job.requirements ? JSON.stringify(job.requirements) : null,
              job.postedDate ? new Date(job.postedDate) : null,
              job.deadline ? new Date(job.deadline) : null
            ]
          );
        } catch (jobError) {
          console.warn('Failed to cache job:', job.id, jobError);
        }
      }
    }

    // Return search results
    res.status(200).json({
      success: true,
      searchId: nhsResults.searchId,
      platforms: {
        nhs: nhsResults
      },
      totalJobs: nhsResults.totalFound,
      searchCriteria
    });

  } catch (error: any) {
    console.error('Job discovery error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid search criteria',
        details: error.issues
      });
    }

    res.status(500).json({
      success: false,
      error: 'Job discovery failed',
      details: error.message
    });
  }
});

// =====================================================================
// GET /api/jobs/discover/results/:searchId - Get cached search results
// =====================================================================
router.get('/discover/results/:searchId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { searchId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get search metadata
    const searchResult = await db.query(
      `SELECT * FROM job_searches WHERE id = $1 AND user_id = $2`,
      [searchId, userId]
    );

    if (searchResult.rows.length === 0) {
      return res.status(404).json({ error: 'Search not found' });
    }

    const search = searchResult.rows[0];

    // Get cached job results
    const jobsResult = await db.query(
      `SELECT * FROM discovered_jobs 
       WHERE search_id = $1 
       ORDER BY discovered_at DESC`,
      [searchId]
    );

    const jobs = jobsResult.rows.map(row => ({
      id: row.external_id,
      title: row.title,
      company: row.company,
      location: row.location,
      salary: formatSalaryRange(row.salary_min, row.salary_max),
      url: row.url,
      description: row.description,
      requirements: row.requirements ? JSON.parse(row.requirements) : [],
      postedDate: row.posted_date,
      deadline: row.deadline_date,
      platform: row.platform,
      discoveredAt: row.discovered_at,
      isApplied: row.is_applied
    }));

    res.status(200).json({
      searchId,
      searchCriteria: search?.search_criteria,
      platform: search?.platform,
      totalFound: search?.results_count,
      jobs,
      searchDate: search?.created_at
    });

  } catch (error: any) {
    console.error('Error fetching search results:', error);
    res.status(500).json({ error: 'Failed to fetch search results' });
  }
});

// =====================================================================
// GET /api/jobs/discover/history - Get user's search history
// =====================================================================
router.get('/discover/history', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const result = await db.query(
      `SELECT id, search_criteria, results_count, platform, created_at
       FROM job_searches 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`,
      [userId]
    );

    const searches = result.rows.map(row => ({
      searchId: row.id,
      criteria: row.search_criteria,
      resultsCount: row.results_count,
      platform: row.platform,
      searchDate: row.created_at
    }));

    res.status(200).json({ searches });

  } catch (error: any) {
    console.error('Error fetching search history:', error);
    res.status(500).json({ error: 'Failed to fetch search history' });
  }
});

// =====================================================================
// POST /api/jobs/discover/save - Save discovered job to user's job list
// =====================================================================
router.post('/discover/save', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { externalId, platform, createApplication = false } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get discovered job details
    const discoveredJobResult = await db.query(
      `SELECT * FROM discovered_jobs 
       WHERE external_id = $1 AND platform = $2`,
      [externalId, platform]
    );

    if (discoveredJobResult.rows.length === 0) {
      return res.status(404).json({ error: 'Discovered job not found' });
    }

    const discoveredJob = discoveredJobResult.rows[0];

    // Check if job already exists in jobs table
    let jobId;
    const existingJobResult = await db.query(
      `SELECT id FROM jobs WHERE url = $1`,
      [discoveredJob.url]
    );

    if (existingJobResult.rows.length > 0) {
      jobId = existingJobResult.rows[0].id;
    } else {
      // Create new job entry
      const newJobResult = await db.query(
        `INSERT INTO jobs (
          title, company, location, description, url, status, 
          posted_date, deadline_date
        ) VALUES ($1, $2, $3, $4, $5, 'open', $6, $7)
        RETURNING id`,
        [
          discoveredJob.title,
          discoveredJob.company,
          discoveredJob.location,
          discoveredJob.description,
          discoveredJob.url,
          discoveredJob.posted_date,
          discoveredJob.deadline_date
        ]
      );
      jobId = newJobResult.rows[0].id;
    }

    // Optionally create application
    let applicationId = null;
    if (createApplication) {
      const applicationResult = await db.query(
        `INSERT INTO applications (user_id, job_id, status)
         VALUES ($1, $2, 'interested')
         ON CONFLICT (user_id, job_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [userId, jobId]
      );
      applicationId = applicationResult.rows[0].id;
    }

    // Mark discovered job as applied
    await db.query(
      `UPDATE discovered_jobs 
       SET is_applied = true 
       WHERE external_id = $1 AND platform = $2`,
      [externalId, platform]
    );

    res.status(201).json({
      success: true,
      jobId,
      applicationId,
      message: createApplication ? 'Job saved and application created' : 'Job saved successfully'
    });

  } catch (error: any) {
    console.error('Error saving discovered job:', error);
    res.status(500).json({ error: 'Failed to save job' });
  }
});

// =====================================================================
// GET /api/jobs/discover/suggestions - Get search suggestions
// =====================================================================
router.get('/discover/suggestions', async (req, res) => {
  try {
    const { type, query } = req.query;
    
    let suggestions: string[] = [];
    
    switch (type) {
      case 'keywords':
        suggestions = NHSJobSearchService.getSearchSuggestions(query as string || '');
        break;
      case 'locations':
        suggestions = NHSJobSearchService.getLocationSuggestions(query as string || '');
        break;
      default:
        return res.status(400).json({ error: 'Invalid suggestion type' });
    }

    res.status(200).json({ suggestions });

  } catch (error: any) {
    console.error('Error getting suggestions:', error);
    res.status(500).json({ error: 'Failed to get suggestions' });
  }
});

// =====================================================================
// DELETE /api/jobs/discover/:searchId - Delete search and cached results
// =====================================================================
router.delete('/discover/:searchId', requireAuth, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { searchId } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Delete cached jobs first
    await db.query(
      `DELETE FROM discovered_jobs WHERE search_id = $1`,
      [searchId]
    );

    // Delete search record
    const deleteResult = await db.query(
      `DELETE FROM job_searches 
       WHERE id = $1 AND user_id = $2 
       RETURNING id`,
      [searchId, userId]
    );

    if (deleteResult.rows.length === 0) {
      return res.status(404).json({ error: 'Search not found' });
    }

    res.status(204).send();

  } catch (error: any) {
    console.error('Error deleting search:', error);
    res.status(500).json({ error: 'Failed to delete search' });
  }
});

// Helper functions
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
