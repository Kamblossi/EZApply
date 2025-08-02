// server/src/routes/applications.ts
import { Router } from 'express';
import { db } from '../db';
import { ApplicationDTO, ApplicationTimelineUpdateSchema } from '../validators/application'; // Import timeline schema
import { JobDTO } from '../validators/job'; // Import JobDTO to potentially embed job data
import { z } from 'zod'; // Import z for array validation

const applicationsRouter = Router();

// =====================================================================
// GET /api/applications - Fetch applications for the authenticated user with filtering, pagination, and search
// =====================================================================
applicationsRouter.get('/', async (req, res) => {
  const userId = (req as any).user?.id; // Assuming authentication middleware populates req.user

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
  }

  try {
    // Extract query parameters with defaults
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100); // Max 100 per page
    const offset = (page - 1) * limit;

    // Search parameters (searches across job title, company, and application notes)
    const search = req.query.search as string;

    // Filter parameters
    const status = req.query.status as string;
    const jobCompany = req.query.job_company as string;
    const jobLocation = req.query.job_location as string;
    const jobStatus = req.query.job_status as string;
    const appliedAfter = req.query.applied_after as string;
    const appliedBefore = req.query.applied_before as string;

    // Build dynamic SQL query
    let baseQuery = `
      SELECT
          a.id AS application_id,
          a.user_id,
          a.job_id,
          a.status AS application_status,
          a.application_date,
          a.notes,
          a.created_at AS application_created_at,
          a.updated_at AS application_updated_at,
          j.id AS job_id_from_job,
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
          a.user_id = $1`;

    let countQuery = `
      SELECT COUNT(*) as total
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.user_id = $1`;

    const conditions: string[] = [];
    const queryParams: any[] = [userId]; // First param is always userId
    let paramIndex = 2;

    // Add search functionality (searches across job title, company, description, and application notes)
    if (search && search.trim()) {
      conditions.push(`(
        j.title ILIKE $${paramIndex} OR 
        j.company ILIKE $${paramIndex} OR 
        j.description ILIKE $${paramIndex} OR
        a.notes ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search.trim()}%`);
      paramIndex++;
    }

    // Add filters
    if (status) {
      conditions.push(`a.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (jobCompany) {
      conditions.push(`j.company ILIKE $${paramIndex}`);
      queryParams.push(`%${jobCompany}%`);
      paramIndex++;
    }

    if (jobLocation) {
      conditions.push(`j.location ILIKE $${paramIndex}`);
      queryParams.push(`%${jobLocation}%`);
      paramIndex++;
    }

    if (jobStatus) {
      conditions.push(`j.status = $${paramIndex}`);
      queryParams.push(jobStatus);
      paramIndex++;
    }

    if (appliedAfter) {
      conditions.push(`a.application_date >= $${paramIndex}`);
      queryParams.push(appliedAfter);
      paramIndex++;
    }

    if (appliedBefore) {
      conditions.push(`a.application_date <= $${paramIndex}`);
      queryParams.push(appliedBefore);
      paramIndex++;
    }

    // Apply additional WHERE conditions if any exist
    if (conditions.length > 0) {
      const additionalConditions = ` AND ${conditions.join(' AND ')}`;
      baseQuery += additionalConditions;
      countQuery += additionalConditions;
    }

    // Add sorting and pagination
    baseQuery += ` ORDER BY a.application_date DESC, a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    queryParams.push(limit, offset);

    // Execute both queries
    const [applicationsResult, countResult] = await Promise.all([
      db.query(baseQuery, queryParams),
      db.query(countQuery, queryParams.slice(0, -2)) // Remove limit/offset params for count
    ]);

    const totalCount = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(totalCount / limit);

    const applications = applicationsResult.rows.map(row => {
      // Construct the nested job object
      const jobData = {
        id: row.job_id_from_job,
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

      return {
        id: row.application_id,
        user_id: row.user_id,
        job_id: row.job_id,
        status: row.application_status,
        application_date: row.application_date ? new Date(row.application_date) : null,
        notes: row.notes,
        created_at: new Date(row.application_created_at),
        updated_at: new Date(row.application_updated_at),
        job_details: JobDTO.parse(jobData)
      };
    });

    // Validate applications array
    const validatedApplications = applications.map(app => {
        const baseApp = ApplicationDTO.parse(app);
        return { ...baseApp, job_details: app.job_details };
    });

    // Return paginated response with metadata
    res.status(200).json({
      data: validatedApplications,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
        limit
      },
      filters: {
        search: search || null,
        status: status || null,
        job_company: jobCompany || null,
        job_location: jobLocation || null,
        job_status: jobStatus || null,
        applied_after: appliedAfter || null,
        applied_before: appliedBefore || null
      }
    });

  } catch (error: any) {
    console.error('Error fetching applications:', error);
    if (error.issues) { // Zod validation error
      return res.status(400).json({ message: "Validation error on retrieved data", errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
});


// =====================================================================
// POST /api/applications - Create a new application for the authenticated user
// =====================================================================
applicationsRouter.post('/', async (req, res) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
  }

  let client;
  try {
    client = await db.connect();

    // First, try to extract and validate just the job_id to check existence
    try {
      const basicJobIdValidation = z.object({ job_id: z.string().uuid('Invalid job ID format.') });
      const { job_id } = basicJobIdValidation.parse(req.body);
      
      // Check if job_id exists
      const jobCheckResult = await client.query('SELECT id FROM jobs WHERE id = $1;', [job_id]);
      if (jobCheckResult.rowCount === 0) {
          return res.status(404).json({ message: 'Job not found with the provided job_id.' });
      }
    } catch (jobIdError) {
      // If job_id validation fails, continue to full validation to get all errors
      // This will fall through to the full validation below
    }

    // Now perform full validation to get all validation errors
    const incomingApplicationData = ApplicationDTO.omit({ user_id: true }).parse(req.body);

    // Insert into applications table
    const insertResult = await client.query(
      `INSERT INTO applications (
        user_id, job_id, status, application_date, notes
       ) VALUES ($1, $2, $3, $4, $5)
       RETURNING *;`,
      [
        userId, // Use the authenticated user's ID
        incomingApplicationData.job_id,
        incomingApplicationData.status || 'draft', // Default in DTO, ensure DB default matches
        incomingApplicationData.application_date ? incomingApplicationData.application_date.toISOString() : null,
        incomingApplicationData.notes || null,
      ]
    );

    const createdApplication = insertResult.rows[0];

    // Format dates back to Date objects for consistent DTO response
    const formattedApplication = {
        ...createdApplication,
        application_date: createdApplication.application_date ? new Date(createdApplication.application_date) : null,
        created_at: new Date(createdApplication.created_at),
        updated_at: new Date(createdApplication.updated_at),
    };

    // Re-fetch the job details to include in the response, consistent with GET
    const jobDetailsResult = await client.query('SELECT * FROM jobs WHERE id = $1;', [formattedApplication.job_id]);
    const jobDetails = jobDetailsResult.rows[0];
    const formattedJobDetails = {
        ...jobDetails,
        posted_date: jobDetails.posted_date ? new Date(jobDetails.posted_date) : null,
        deadline_date: jobDetails.deadline_date ? new Date(jobDetails.deadline_date) : null,
        created_at: new Date(jobDetails.created_at),
        updated_at: new Date(jobDetails.updated_at),
    };
    const validatedJobDetails = JobDTO.parse(formattedJobDetails); // Validate job details


    // Validate and send the final response, embedding job_details
    const validatedApplicationResponse = {
        ...ApplicationDTO.parse(formattedApplication), // Validate base application
        job_details: validatedJobDetails // Embed validated job details
    };

    res.status(201).json(validatedApplicationResponse); // 201 Created

  } catch (error: any) {
    console.error('Error creating application:', error);
    if (error instanceof z.ZodError) { // Zod validation error
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to create application', error: error.message });
  } finally {
    if (client) client.release();
  }
});


// =====================================================================
// PUT /api/applications/:id - Update an existing application for the authenticated user
// =====================================================================
applicationsRouter.put('/:id', async (req, res) => {
  const applicationId = req.params.id; // Get ID from URL parameters
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
  }

  let client;
  try {
    // Check for ID mismatch BEFORE validation
    if (req.body.id && req.body.id !== applicationId) {
      return res.status(400).json({ message: 'Mismatched ID in URL and request body.' });
    }

    client = await db.connect();

    // Check if this is a timeline-focused update
    const isTimelineUpdate = req.body.event_type || 
                           (req.body.status && Object.keys(req.body).length <= 3);

    // First get existing application data for comparison
    const existingResult = await client.query(
      'SELECT * FROM applications WHERE id = $1 AND user_id = $2;', 
      [applicationId, userId]
    );
    
    if (existingResult.rowCount === 0) {
      return res.status(404).json({ message: 'Application not found or does not belong to user.' });
    }
    
    const existingApplication = existingResult.rows[0];

    let updatedApplicationData: any;
    let timelineEvent = null;

    if (isTimelineUpdate) {
      // Use timeline-focused validation for timeline updates
      const timelineData = ApplicationTimelineUpdateSchema.parse(req.body);
      
      // Create timeline event record
      if (timelineData.status && timelineData.status !== existingApplication.status) {
        timelineEvent = {
          event_type: timelineData.event_type || 'status_change',
          previous_value: existingApplication.status,
          new_value: timelineData.status,
          notes: timelineData.notes,
          timestamp: new Date(),
          field_changed: 'status'
        };
      } else if (timelineData.notes) {
        timelineEvent = {
          event_type: timelineData.event_type || 'note_added',
          previous_value: existingApplication.notes,
          new_value: timelineData.notes,
          notes: timelineData.notes,
          timestamp: new Date(),
          field_changed: 'notes'
        };
      }

      // Convert to application update format
      updatedApplicationData = {
        job_id: timelineData.job_id, // Include job_id from timeline data
        status: timelineData.status || existingApplication.status,
        application_date: timelineData.application_date || existingApplication.application_date,
        notes: timelineData.notes || existingApplication.notes
      };
    } else {
      // Use standard validation for regular updates
      updatedApplicationData = ApplicationDTO.omit({ user_id: true }).partial().parse(req.body);
    }

    const existingJobId = existingApplication.job_id;

    // If job_id is being updated, verify the new job_id exists
    if (updatedApplicationData.job_id && updatedApplicationData.job_id !== existingJobId) {
        const newJobCheckResult = await client.query('SELECT id FROM jobs WHERE id = $1;', [updatedApplicationData.job_id]);
        if (newJobCheckResult.rowCount === 0) {
            return res.status(404).json({ message: 'New job ID for application not found.' });
        }
    }

    // Perform the update
    const updateResult = await client.query(
      `UPDATE applications SET
        job_id = $1,
        status = $2,
        application_date = $3,
        notes = $4,
        updated_at = NOW()
       WHERE id = $5 AND user_id = $6
       RETURNING *;`,
      [
        updatedApplicationData.job_id || existingJobId, // Use existing if not provided
        updatedApplicationData.status || 'draft',
        updatedApplicationData.application_date ? updatedApplicationData.application_date.toISOString() : null,
        updatedApplicationData.notes || null,
        applicationId,
        userId,
      ]
    );

    const updatedApplication = updateResult.rows[0];

    // Format dates back to Date objects for consistent DTO response
    const formattedApplication = {
        ...updatedApplication,
        application_date: updatedApplication.application_date ? new Date(updatedApplication.application_date) : null,
        created_at: new Date(updatedApplication.created_at),
        updated_at: new Date(updatedApplication.updated_at),
    };

    // Re-fetch the job details to include in the response, consistent with GET
    const jobDetailsResult = await client.query('SELECT * FROM jobs WHERE id = $1;', [formattedApplication.job_id]);
    const jobDetails = jobDetailsResult.rows[0];
    const formattedJobDetails = {
        ...jobDetails,
        posted_date: jobDetails.posted_date ? new Date(jobDetails.posted_date) : null,
        deadline_date: jobDetails.deadline_date ? new Date(jobDetails.deadline_date) : null,
        created_at: new Date(jobDetails.created_at),
        updated_at: new Date(jobDetails.updated_at),
    };
    const validatedJobDetails = JobDTO.parse(formattedJobDetails);

    const validatedApplicationResponse = {
        ...ApplicationDTO.parse(formattedApplication),
        job_details: validatedJobDetails
    };

    // Enhanced response with timeline context
    const response: any = {
      application: validatedApplicationResponse,
      message: 'Application updated successfully'
    };

    // Add timeline event information if this was a timeline update
    if (timelineEvent) {
      response.timeline_event = timelineEvent;
      response.message = `Application ${timelineEvent.event_type.replace('_', ' ')} recorded successfully`;
    }

    res.status(200).json(response);

  } catch (error: any) {
    console.error(`Error updating application ${applicationId}:`, error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Validation error', errors: error.issues });
    }
    res.status(500).json({ message: 'Failed to update application', error: error.message });
  } finally {
    if (client) client.release();
  }
});


// =====================================================================
// GET /api/applications/:id/timeline - Get application timeline history
// =====================================================================
applicationsRouter.get('/:id/timeline', async (req, res) => {
  const applicationId = req.params.id;
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(applicationId)) {
    return res.status(400).json({ message: 'Invalid application ID format. Must be a valid UUID.' });
  }

  let client;
  try {
    client = await db.connect();

    // Get application details and verify ownership
    const applicationResult = await client.query(
      'SELECT * FROM applications WHERE id = $1 AND user_id = $2;',
      [applicationId, userId]
    );

    if (applicationResult.rowCount === 0) {
      return res.status(404).json({ message: 'Application not found or does not belong to user.' });
    }

    const application = applicationResult.rows[0];

    // Generate timeline events from application history
    const timeline = [];

    // Application created event
    timeline.push({
      event_type: 'application_created',
      timestamp: new Date(application.created_at),
      notes: 'Application tracking started',
      status: 'draft',
      field_changed: null
    });

    // Application submitted event (if different from created)
    if (application.application_date && 
        new Date(application.application_date).getTime() !== new Date(application.created_at).getTime()) {
      timeline.push({
        event_type: 'application_submitted',
        timestamp: new Date(application.application_date),
        notes: 'Application officially submitted',
        status: 'submitted',
        field_changed: 'application_date'
      });
    }

    // Status updated event (if updated)
    if (new Date(application.updated_at).getTime() !== new Date(application.created_at).getTime()) {
      timeline.push({
        event_type: 'status_updated',
        timestamp: new Date(application.updated_at),
        notes: application.notes || `Status updated to ${application.status}`,
        status: application.status,
        field_changed: 'status'
      });
    }

    // Sort timeline chronologically
    const sortedTimeline = timeline.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Timeline summary
    const timelineSummary = {
      total_events: sortedTimeline.length,
      current_status: application.status,
      first_event: sortedTimeline[0],
      latest_event: sortedTimeline[sortedTimeline.length - 1],
      duration_days: Math.ceil(
        (new Date(application.updated_at).getTime() - new Date(application.created_at).getTime()) 
        / (1000 * 60 * 60 * 24)
      )
    };

    res.status(200).json({
      application_id: applicationId,
      timeline: sortedTimeline,
      timeline_summary: timelineSummary
    });

  } catch (error: any) {
    console.error(`Error fetching application timeline ${applicationId}:`, error);
    res.status(500).json({ message: 'Failed to fetch application timeline', error: error.message });
  } finally {
    if (client) client.release();
  }
});


// =====================================================================
// DELETE /api/applications/:id - Delete an application for the authenticated user
// =====================================================================
applicationsRouter.delete('/:id', async (req, res) => {
  const applicationId = req.params.id; // Get ID from URL parameters
  const userId = (req as any).user?.id;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
  }

  let client;
  try {
    client = await db.connect();

    // Perform the deletion, ensuring it belongs to the authenticated user
    const deleteResult = await client.query('DELETE FROM applications WHERE id = $1 AND user_id = $2 RETURNING id;', [applicationId, userId]);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ message: 'Application not found or does not belong to user.' });
    }

    res.status(204).send(); // 204 No Content for successful deletion

  } catch (error: any) {
    console.error(`Error deleting application ${applicationId}:`, error);
    res.status(500).json({ message: 'Failed to delete application', error: error.message });
  } finally {
    if (client) client.release();
  }
});

export default applicationsRouter;