import express from 'express';
import { z } from 'zod';
import { requireAuth, JwtPayload } from '../middleware/auth';
import { addAutomationJob, getQueueStats } from '../queues/automation';
import { db } from '../db';
import { nanoid } from 'nanoid';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

const router = express.Router();

// Schema for automation run request
const runAutomationSchema = z.object({
  jobId: z.string().uuid('Invalid job ID format'),
});

// POST /api/automation/run - Start automation for a job
router.post('/run', requireAuth, async (req, res) => {
  try {
    const { jobId } = runAutomationSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Verify the job exists and belongs to the user's accessible jobs
    const job = await db.query(
      'SELECT id, title, employer, location, deadline FROM jobs WHERE id = $1',
      [jobId]
    );

    if (job.rows.length === 0) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Create a new automation run record
    const runId = nanoid();
    const runResult = await db.query(
      `INSERT INTO automation_runs (id, job_id, user_id, status, created_at, updated_at) 
       VALUES ($1, $2, $3, 'pending', NOW(), NOW()) 
       RETURNING id, status, created_at`,
      [runId, jobId, userId]
    );

    const run = runResult.rows[0];

    // Add job to the automation queue
    await addAutomationJob({
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

  } catch (error) {
    console.error('Error starting automation:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: error.issues 
      });
    }

    res.status(500).json({ error: 'Failed to start automation' });
  }
});

// GET /api/automation/status - Get queue status
router.get('/status', requireAuth, async (req, res) => {
  try {
    const stats = await getQueueStats();
    res.json(stats);
  } catch (error) {
    console.error('Error getting queue status:', error);
    res.status(500).json({ error: 'Failed to get queue status' });
  }
});

// GET /api/automation/runs/:runId - Get specific run details
router.get('/runs/:runId', requireAuth, async (req, res) => {
  try {
    const { runId } = req.params;
    const userId = req.user?.id;

    const result = await db.query(
      `SELECT ar.*, j.title as job_title, j.employer, j.location
       FROM automation_runs ar
       JOIN jobs j ON ar.job_id = j.id
       WHERE ar.id = $1 AND ar.user_id = $2`,
      [runId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Run not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting run details:', error);
    res.status(500).json({ error: 'Failed to get run details' });
  }
});

export default router;
