// server/src/routes/jobs.ts
import { Router } from 'express';
import { db } from '../db';
import { JobDTO } from '../validators/job'; // Import the JobDTO
import { z } from 'zod';

const jobsRouter = Router();

// =====================================================================
// GET /api/jobs - Fetch all job listings
// =====================================================================
jobsRouter.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM jobs ORDER BY posted_date DESC, created_at DESC;');
    const jobs = result.rows.map(row => ({
      ...row,
      posted_date: row.posted_date ? new Date(row.posted_date) : null,
      deadline_date: row.deadline_date ? new Date(row.deadline_date) : null,
      created_at: new Date(row.created_at),
      updated_at: new Date(row.updated_at),
    }));

    // Validate with Zod
    const validatedJobs = z.array(JobDTO).parse(jobs);
    res.status(200).json(validatedJobs);

  } catch (error: any) {
    console.error('Error fetching jobs:', error);
    if (error.issues) { // Zod validation error
      return res.status(400).json({ message: "Validation error on retrieved data", errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
  }
});

export default jobsRouter;