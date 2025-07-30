// server/src/routes/applications.ts
import { Router } from 'express';
import { db } from '../db';
import { ApplicationDTO } from '../validators/application'; // Import ApplicationDTO
import { JobDTO } from '../validators/job'; // Import JobDTO to potentially embed job data
import { z } from 'zod'; // Import z for array validation

const applicationsRouter = Router();

// =====================================================================
// GET /api/applications - Fetch all applications for the authenticated user
// (with optional job details)
// =====================================================================
applicationsRouter.get('/', async (req, res) => {
  const userId = (req as any).user?.id; // Assuming authentication middleware populates req.user

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
  }

  try {
    const result = await db.query(`
      SELECT
          a.id AS application_id,
          a.user_id,
          a.job_id,
          a.status AS application_status,
          a.application_date,
          a.notes,
          a.created_at AS application_created_at,
          a.updated_at AS application_updated_at,
          j.id AS job_id_from_job, -- to avoid conflict with a.job_id
          j.title AS job_title,
          j.company AS job_company,
          j.location AS job_location,
          j.description AS job_description,
          j.url AS job_url,
          j.status AS job_status,
          j.posted_date AS job_posted_date,
          j.deadline_date AS job_deadline_date,
          j.created_at AS job_created_at,
          j.updated_at AS job_updated_at
      FROM
          applications a
      JOIN
          jobs j ON a.job_id = j.id
      WHERE
          a.user_id = $1
      ORDER BY
          a.application_date DESC, a.created_at DESC;
    `, [userId]);

    const applications = result.rows.map(row => {
      // Construct the nested job object for validation if needed, or directly flatten
      const jobData = {
        id: row.job_id_from_job, // Use the alias to prevent clash
        title: row.job_title,
        company: row.job_company,
        location: row.job_location,
        description: row.job_description,
        url: row.job_url,
        status: row.job_status,
        posted_date: row.job_posted_date ? new Date(row.job_posted_date) : null,
        deadline_date: row.job_deadline_date ? new Date(row.job_deadline_date) : null,
        created_at: new Date(row.job_created_at),
        updated_at: new Date(row.job_updated_at),
      };
      // You could optionally validate the jobData here with JobDTO.parse(jobData)
      // For now, we'll keep it flattened as application-centric

      return {
        id: row.application_id,
        user_id: row.user_id,
        job_id: row.job_id, // This is the FK
        status: row.application_status,
        application_date: row.application_date ? new Date(row.application_date) : null,
        notes: row.notes,
        created_at: new Date(row.application_created_at),
        updated_at: new Date(row.application_updated_at),
        // Optionally embed job details directly, or return them separately
        job_details: JobDTO.parse(jobData) // Validate and include job details
      };
    });

    // Validate applications array
    // Note: If you choose to embed job_details, your ApplicationDTO needs to reflect that.
    // For now, let's assume ApplicationDTO is for the application's base fields, and we embed job_details separately.
    // If ApplicationDTO was designed to contain job_details:
    // const validatedApplications = z.array(ApplicationDTO.extend({ job_details: JobDTO })).parse(applications);
    // For now, let's validate each application individually with its base DTO
    const validatedApplications = applications.map(app => {
        const baseApp = ApplicationDTO.parse(app);
        // Re-attach job_details if successfully parsed
        return { ...baseApp, job_details: app.job_details };
    });


    res.status(200).json(validatedApplications);

  } catch (error: any) {
    console.error('Error fetching applications:', error);
    if (error.issues) { // Zod validation error
      return res.status(400).json({ message: "Validation error on retrieved data", errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
});

export default applicationsRouter;