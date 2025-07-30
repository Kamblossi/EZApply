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


// =====================================================================
// POST /api/jobs - Create a new job listing
// =====================================================================
jobsRouter.post('/', async (req, res) => {
  // No explicit userId check needed here as jobs are not user-specific initially,
  // but authentication middleware ensures a user is logged in.
  let client;
  try {
    const newJobData = JobDTO.parse(req.body);

    client = await db.connect();
    // Insert into jobs table
    const insertResult = await client.query(
      `INSERT INTO jobs (
        title, company, location, description, url, status, posted_date, deadline_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`,
      [
        newJobData.title,
        newJobData.company,
        newJobData.location || null,
        newJobData.description || null,
        newJobData.url || null,
        newJobData.status || 'open', // Default in DTO, but ensure DB default matches
        newJobData.posted_date ? newJobData.posted_date.toISOString() : null,
        newJobData.deadline_date ? newJobData.deadline_date.toISOString() : null,
      ]
    );

    const createdJob = insertResult.rows[0];
    // Format dates back to Date objects for consistent DTO response
    const formattedJob = {
        ...createdJob,
        posted_date: createdJob.posted_date ? new Date(createdJob.posted_date) : null,
        deadline_date: createdJob.deadline_date ? new Date(createdJob.deadline_date) : null,
        created_at: new Date(createdJob.created_at),
        updated_at: new Date(createdJob.updated_at),
    };

    const validatedCreatedJob = JobDTO.parse(formattedJob); // Re-validate before sending
    res.status(201).json(validatedCreatedJob); // 201 Created

  } catch (error: any) {
    console.error('Error creating job:', error);
    if (error instanceof z.ZodError) { // Zod validation error
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to create job', error: error.message });
  } finally {
    if (client) client.release();
  }
});


// =====================================================================
// PUT /api/jobs/:id - Update an existing job listing
// =====================================================================
jobsRouter.put('/:id', async (req, res) => {
  const jobId = req.params.id; // Get ID from URL parameters

  let client;
  try {
    // Check for ID mismatch BEFORE validation
    if (req.body.id && req.body.id !== jobId) {
      return res.status(400).json({ message: 'Mismatched ID in URL and request body.' });
    }

    // Validate incoming data
    const updatedJobData = JobDTO.parse(req.body);

    client = await db.connect();

    // Check if the job exists
    const checkResult = await client.query('SELECT id FROM jobs WHERE id = $1;', [jobId]);
    if (checkResult.rowCount === 0) {
      return res.status(404).json({ message: 'Job not found.' });
    }

    // Perform the update
    const updateResult = await client.query(
      `UPDATE jobs SET
        title = $1,
        company = $2,
        location = $3,
        description = $4,
        url = $5,
        status = $6,
        posted_date = $7,
        deadline_date = $8,
        updated_at = NOW()
       WHERE id = $9
       RETURNING *;`,
      [
        updatedJobData.title,
        updatedJobData.company,
        updatedJobData.location || null,
        updatedJobData.description || null,
        updatedJobData.url || null,
        updatedJobData.status || 'open',
        updatedJobData.posted_date ? updatedJobData.posted_date.toISOString() : null,
        updatedJobData.deadline_date ? updatedJobData.deadline_date.toISOString() : null,
        jobId,
      ]
    );

    const updatedJob = updateResult.rows[0];
    // Format dates back to Date objects for consistent DTO response
    const formattedJob = {
        ...updatedJob,
        posted_date: updatedJob.posted_date ? new Date(updatedJob.posted_date) : null,
        deadline_date: updatedJob.deadline_date ? new Date(updatedJob.deadline_date) : null,
        created_at: new Date(updatedJob.created_at),
        updated_at: new Date(updatedJob.updated_at),
    };

    const validatedUpdatedJob = JobDTO.parse(formattedJob); // Re-validate before sending
    res.status(200).json(validatedUpdatedJob);

  } catch (error: any) {
    console.error(`Error updating job ${jobId}:`, error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to update job', error: error.message });
  } finally {
    if (client) client.release();
  }
});


// =====================================================================
// DELETE /api/jobs/:id - Delete a job listing
// =====================================================================
jobsRouter.delete('/:id', async (req, res) => {
  const jobId = req.params.id; // Get ID from URL parameters

  let client;
  try {
    client = await db.connect();

    // Perform the deletion
    // Due to ON DELETE CASCADE on applications table, applications linked to this job will also be deleted.
    const deleteResult = await client.query('DELETE FROM jobs WHERE id = $1 RETURNING id;', [jobId]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Job not found or already deleted.' });
    }

    res.status(204).send(); // 204 No Content for successful deletion

  } catch (error: any) {
    console.error(`Error deleting job ${jobId}:`, error);
    res.status(500).json({ message: 'Failed to delete job', error: error.message });
  } finally {
    if (client) client.release();
  }
});

export default jobsRouter;