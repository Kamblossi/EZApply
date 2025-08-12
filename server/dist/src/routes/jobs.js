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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// server/src/routes/jobs.ts
const express_1 = require("express");
const db_1 = require("../db");
const job_1 = require("../validators/job"); // Import the new schema
const jobUrlParser_1 = require("../services/jobUrlParser");
const advancedJobDiscovery_1 = __importDefault(require("./advancedJobDiscovery"));
const zod_1 = require("zod");
const jobsRouter = (0, express_1.Router)();
// =====================================================================
// Mount advanced job discovery routes
// =====================================================================
jobsRouter.use('/', advancedJobDiscovery_1.default);
// =====================================================================
// POST /api/jobs/parse-url - Parse job URL to extract job details
// =====================================================================
jobsRouter.post('/parse-url', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Validate request body
        const { url } = zod_1.z.object({ url: zod_1.z.string().url('Invalid URL format') }).parse(req.body);
        // Parse the job URL
        const parsedData = yield jobUrlParser_1.JobUrlParserService.parseJobUrl(url);
        // Return parsed data (always return, even if parsing failed)
        res.status(200).json(parsedData);
    }
    catch (error) {
        console.error('Error in parse-url endpoint:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: error.issues
            });
        }
        res.status(500).json({
            success: false,
            error: 'Failed to parse job URL',
            details: error.message
        });
    }
}));
// =====================================================================
// GET /api/jobs/supported-sites - Get list of supported job sites
// =====================================================================
jobsRouter.get('/supported-sites', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const supportedSites = jobUrlParser_1.JobUrlParserService.getSupportedSites();
        res.status(200).json({
            sites: supportedSites,
            count: supportedSites.length
        });
    }
    catch (error) {
        console.error('Error getting supported sites:', error);
        res.status(500).json({ error: 'Failed to get supported sites' });
    }
}));
// Helper function for timeline suggestions
function getNextSuggestedAction(status) {
    switch (status) {
        case 'draft':
            return 'Submit your application';
        case 'submitted':
            return 'Wait for response or send follow-up';
        case 'interview':
            return 'Prepare for interview';
        case 'rejected':
            return 'Apply to similar positions';
        case 'accepted':
            return 'Congratulations! Prepare for onboarding';
        default:
            return 'Update your application status';
    }
}
// =====================================================================
// POST /api/jobs - Add job to user tracker (shared job model)
// =====================================================================
jobsRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Assuming authentication middleware populates req.user
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
    }
    let client;
    try {
        // Validate incoming data
        const parsed = job_1.JobInsertSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation error',
                errors: parsed.error.issues
            });
        }
        const { title, company, location, url, description, status = 'draft' } = parsed.data;
        client = yield db_1.db.connect();
        yield client.query('BEGIN');
        // Step 1: Check if job already exists by URL (deduplication)
        const existingJobResult = yield client.query(`SELECT * FROM jobs WHERE url = $1`, [url]);
        let job;
        if (existingJobResult.rows.length > 0) {
            // Job already exists, use it
            job = existingJobResult.rows[0];
        }
        else {
            // Create new job
            const insertJobResult = yield client.query(`INSERT INTO jobs (title, company, location, url, description, status)
         VALUES ($1, $2, $3, $4, $5, 'open')
         RETURNING *`, [title, company, location, url, description]);
            job = insertJobResult.rows[0];
        }
        // Step 2: Check if user already has an application for this job
        const existingApplicationResult = yield client.query(`SELECT * FROM applications WHERE user_id = $1 AND job_id = $2`, [userId, job.id]);
        if (existingApplicationResult.rows.length > 0) {
            yield client.query('ROLLBACK');
            // Format existing data for response
            const existingApplication = existingApplicationResult.rows[0];
            const formattedJob = Object.assign(Object.assign({}, job), { posted_date: job.posted_date ? new Date(job.posted_date) : null, deadline_date: job.deadline_date ? new Date(job.deadline_date) : null, created_at: new Date(job.created_at), updated_at: new Date(job.updated_at) });
            const formattedApplication = Object.assign(Object.assign({}, existingApplication), { application_date: existingApplication.application_date ? new Date(existingApplication.application_date) : null, created_at: new Date(existingApplication.created_at), updated_at: new Date(existingApplication.updated_at) });
            return res.status(409).json({
                message: 'Application already exists for this job',
                job: job_1.JobDTO.parse(formattedJob),
                application: formattedApplication
            });
        }
        // Step 3: Create user application linked to this job
        const insertApplicationResult = yield client.query(`INSERT INTO applications (user_id, job_id, status)
       VALUES ($1, $2, $3)
       RETURNING *`, [userId, job.id, status]);
        yield client.query('COMMIT');
        const application = insertApplicationResult.rows[0];
        // Format dates for response
        const formattedJob = Object.assign(Object.assign({}, job), { posted_date: job.posted_date ? new Date(job.posted_date) : null, deadline_date: job.deadline_date ? new Date(job.deadline_date) : null, created_at: new Date(job.created_at), updated_at: new Date(job.updated_at) });
        const formattedApplication = Object.assign(Object.assign({}, application), { application_date: application.application_date ? new Date(application.application_date) : null, created_at: new Date(application.created_at), updated_at: new Date(application.updated_at) });
        // Validate and return combined result
        const validatedJob = job_1.JobDTO.parse(formattedJob);
        res.status(201).json({
            job: validatedJob,
            application: formattedApplication
        });
    }
    catch (error) {
        if (client) {
            yield client.query('ROLLBACK');
        }
        console.error('Error adding job to tracker:', error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to add job to tracker', error: error.message });
    }
    finally {
        if (client)
            client.release();
    }
}));
// =====================================================================
// GET /api/jobs - Fetch job listings with filtering, pagination, and search
// =====================================================================
jobsRouter.get('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Extract query parameters with defaults
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 20, 100); // Max 100 per page
        const offset = (page - 1) * limit;
        // Search parameters
        const search = req.query.search;
        // Filter parameters
        const status = req.query.status;
        const company = req.query.company;
        const location = req.query.location;
        const postedAfter = req.query.posted_after;
        const postedBefore = req.query.posted_before;
        const deadlineAfter = req.query.deadline_after;
        const deadlineBefore = req.query.deadline_before;
        // Build dynamic SQL query
        let baseQuery = 'SELECT * FROM jobs';
        let countQuery = 'SELECT COUNT(*) as total FROM jobs';
        const conditions = [];
        const queryParams = [];
        let paramIndex = 1;
        // Add search functionality (searches across title, company, description, location)
        if (search && search.trim()) {
            conditions.push(`(
        title ILIKE $${paramIndex} OR 
        company ILIKE $${paramIndex} OR 
        description ILIKE $${paramIndex} OR 
        location ILIKE $${paramIndex}
      )`);
            queryParams.push(`%${search.trim()}%`);
            paramIndex++;
        }
        // Add filters
        if (status) {
            conditions.push(`status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }
        if (company) {
            conditions.push(`company ILIKE $${paramIndex}`);
            queryParams.push(`%${company}%`);
            paramIndex++;
        }
        if (location) {
            conditions.push(`location ILIKE $${paramIndex}`);
            queryParams.push(`%${location}%`);
            paramIndex++;
        }
        if (postedAfter) {
            conditions.push(`posted_date >= $${paramIndex}`);
            queryParams.push(postedAfter);
            paramIndex++;
        }
        if (postedBefore) {
            conditions.push(`posted_date <= $${paramIndex}`);
            queryParams.push(postedBefore);
            paramIndex++;
        }
        if (deadlineAfter) {
            conditions.push(`deadline_date >= $${paramIndex}`);
            queryParams.push(deadlineAfter);
            paramIndex++;
        }
        if (deadlineBefore) {
            conditions.push(`deadline_date <= $${paramIndex}`);
            queryParams.push(deadlineBefore);
            paramIndex++;
        }
        // Apply WHERE conditions if any exist
        if (conditions.length > 0) {
            const whereClause = ` WHERE ${conditions.join(' AND ')}`;
            baseQuery += whereClause;
            countQuery += whereClause;
        }
        // Add sorting and pagination
        baseQuery += ` ORDER BY posted_date DESC, created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        queryParams.push(limit, offset);
        // Execute both queries
        const [jobsResult, countResult] = yield Promise.all([
            db_1.db.query(baseQuery, queryParams),
            db_1.db.query(countQuery, queryParams.slice(0, -2)) // Remove limit/offset params for count
        ]);
        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limit);
        const jobs = jobsResult.rows.map(row => (Object.assign(Object.assign({}, row), { posted_date: row.posted_date ? new Date(row.posted_date) : null, deadline_date: row.deadline_date ? new Date(row.deadline_date) : null, created_at: new Date(row.created_at), updated_at: new Date(row.updated_at) })));
        // Validate with Zod
        const validatedJobs = zod_1.z.array(job_1.JobDTO).parse(jobs);
        // Return paginated response with metadata
        res.status(200).json({
            data: validatedJobs,
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
                company: company || null,
                location: location || null,
                posted_after: postedAfter || null,
                posted_before: postedBefore || null,
                deadline_after: deadlineAfter || null,
                deadline_before: deadlineBefore || null
            }
        });
    }
    catch (error) {
        console.error('Error fetching jobs:', error);
        if (error.issues) { // Zod validation error
            return res.status(400).json({ message: "Validation error on retrieved data", errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
    }
}));
// =====================================================================
// GET /api/jobs/:id - View specific job with user's application timeline
// =====================================================================
jobsRouter.get('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const jobId = req.params.id;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Assuming authentication middleware populates req.user
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
    }
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID format. Must be a valid UUID.' });
    }
    let client;
    try {
        client = yield db_1.db.connect();
        // Step 1: Look up the job
        const jobResult = yield client.query(`SELECT * FROM jobs WHERE id = $1`, [jobId]);
        if (jobResult.rows.length === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        const job = jobResult.rows[0];
        // Step 2: Look up user's application for this job (if exists)
        const applicationResult = yield client.query(`SELECT * FROM applications WHERE job_id = $1 AND user_id = $2`, [jobId, userId]);
        const application = applicationResult.rows.length > 0 ? applicationResult.rows[0] : null;
        // Step 3: Format dates for consistent response
        const formattedJob = Object.assign(Object.assign({}, job), { posted_date: job.posted_date ? new Date(job.posted_date) : null, deadline_date: job.deadline_date ? new Date(job.deadline_date) : null, created_at: new Date(job.created_at), updated_at: new Date(job.updated_at) });
        const formattedApplication = application ? Object.assign(Object.assign({}, application), { application_date: application.application_date ? new Date(application.application_date) : null, created_at: new Date(application.created_at), updated_at: new Date(application.updated_at) }) : null;
        // Step 4: Validate with DTOs
        const validatedJob = job_1.JobDTO.parse(formattedJob);
        // Step 5: Prepare enhanced timeline summary and events
        let timelineSummary = null;
        let timeline = [];
        if (application) {
            // Create timeline events from application history
            const events = [];
            // Application created event
            events.push({
                event_type: 'application_created',
                timestamp: formattedApplication.created_at,
                notes: 'Application tracking started',
                status: 'draft'
            });
            // Application date event (if different from created)
            if (formattedApplication.application_date &&
                formattedApplication.application_date.getTime() !== formattedApplication.created_at.getTime()) {
                events.push({
                    event_type: 'application_submitted',
                    timestamp: formattedApplication.application_date,
                    notes: 'Application officially submitted',
                    status: 'submitted'
                });
            }
            // Current status event (if updated)
            if (formattedApplication.updated_at.getTime() !== formattedApplication.created_at.getTime()) {
                events.push({
                    event_type: 'status_updated',
                    timestamp: formattedApplication.updated_at,
                    notes: formattedApplication.notes || `Status updated to ${application.status}`,
                    status: application.status
                });
            }
            // Sort events chronologically
            timeline = events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
            // Enhanced timeline summary
            timelineSummary = {
                current_status: application.status,
                last_updated: formattedApplication.updated_at,
                has_notes: !!application.notes,
                applied_date: formattedApplication.application_date,
                total_events: timeline.length,
                status_progression: timeline.map(event => ({
                    status: event.status,
                    date: event.timestamp
                })),
                next_suggested_action: getNextSuggestedAction(application.status)
            };
        }
        // Step 6: Return enhanced response with timeline data
        res.status(200).json({
            job: validatedJob,
            application: formattedApplication,
            has_application: !!application,
            timeline_summary: timelineSummary,
            timeline: timeline
        });
    }
    catch (error) {
        console.error(`Error fetching job ${jobId}:`, error);
        if (error.issues) { // Zod validation error
            return res.status(400).json({ message: "Validation error on retrieved data", errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to fetch job details', error: error.message });
    }
    finally {
        if (client)
            client.release();
    }
}));
// =====================================================================
// PATCH /api/jobs/:id/status - Update job posting status
// =====================================================================
jobsRouter.patch('/:id/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const jobId = req.params.id;
    const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id; // Assuming authentication middleware populates req.user
    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized: User ID not found.' });
    }
    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
        return res.status(400).json({ message: 'Invalid job ID format. Must be a valid UUID.' });
    }
    let client;
    try {
        // Validate incoming data
        const parsed = job_1.JobStatusUpdateSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: 'Validation error',
                errors: parsed.error.issues
            });
        }
        const { status } = parsed.data;
        client = yield db_1.db.connect();
        // Check if job exists before updating
        const checkResult = yield client.query('SELECT id FROM jobs WHERE id = $1;', [jobId]);
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        // Update job status
        const updateResult = yield client.query(`UPDATE jobs SET 
        status = $1, 
        updated_at = NOW() 
       WHERE id = $2 
       RETURNING id, title, company, status, updated_at`, [status, jobId]);
        const updatedJob = updateResult.rows[0];
        // Format the response
        const formattedJob = Object.assign(Object.assign({}, updatedJob), { updated_at: new Date(updatedJob.updated_at) });
        res.status(200).json({
            message: 'Job status updated successfully',
            job: {
                id: formattedJob.id,
                title: formattedJob.title,
                company: formattedJob.company,
                status: formattedJob.status,
                updated_at: formattedJob.updated_at
            }
        });
    }
    catch (error) {
        console.error(`Error updating job status ${jobId}:`, error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to update job status', error: error.message });
    }
    finally {
        if (client)
            client.release();
    }
}));
// =====================================================================
// POST /api/jobs - Create a new job listing
// =====================================================================
jobsRouter.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    // No explicit userId check needed here as jobs are not user-specific initially,
    // but authentication middleware ensures a user is logged in.
    let client;
    try {
        const newJobData = job_1.JobDTO.parse(req.body);
        client = yield db_1.db.connect();
        // Insert into jobs table
        const insertResult = yield client.query(`INSERT INTO jobs (
        title, company, location, description, url, status, posted_date, deadline_date
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *;`, [
            newJobData.title,
            newJobData.company,
            newJobData.location || null,
            newJobData.description || null,
            newJobData.url || null,
            newJobData.status || 'open', // Default in DTO, but ensure DB default matches
            newJobData.posted_date ? newJobData.posted_date.toISOString() : null,
            newJobData.deadline_date ? newJobData.deadline_date.toISOString() : null,
        ]);
        const createdJob = insertResult.rows[0];
        // Format dates back to Date objects for consistent DTO response
        const formattedJob = Object.assign(Object.assign({}, createdJob), { posted_date: createdJob.posted_date ? new Date(createdJob.posted_date) : null, deadline_date: createdJob.deadline_date ? new Date(createdJob.deadline_date) : null, created_at: new Date(createdJob.created_at), updated_at: new Date(createdJob.updated_at) });
        const validatedCreatedJob = job_1.JobDTO.parse(formattedJob); // Re-validate before sending
        res.status(201).json(validatedCreatedJob); // 201 Created
    }
    catch (error) {
        console.error('Error creating job:', error);
        if (error instanceof zod_1.z.ZodError) { // Zod validation error
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to create job', error: error.message });
    }
    finally {
        if (client)
            client.release();
    }
}));
// =====================================================================
// PUT /api/jobs/:id - Update an existing job listing
// =====================================================================
jobsRouter.put('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobId = req.params.id; // Get ID from URL parameters
    let client;
    try {
        // Check for ID mismatch BEFORE validation
        if (req.body.id && req.body.id !== jobId) {
            return res.status(400).json({ message: 'Mismatched ID in URL and request body.' });
        }
        // Validate incoming data
        const updatedJobData = job_1.JobDTO.parse(req.body);
        client = yield db_1.db.connect();
        // Check if the job exists
        const checkResult = yield client.query('SELECT id FROM jobs WHERE id = $1;', [jobId]);
        if (checkResult.rowCount === 0) {
            return res.status(404).json({ message: 'Job not found.' });
        }
        // Perform the update
        const updateResult = yield client.query(`UPDATE jobs SET
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
       RETURNING *;`, [
            updatedJobData.title,
            updatedJobData.company,
            updatedJobData.location || null,
            updatedJobData.description || null,
            updatedJobData.url || null,
            updatedJobData.status || 'open',
            updatedJobData.posted_date ? updatedJobData.posted_date.toISOString() : null,
            updatedJobData.deadline_date ? updatedJobData.deadline_date.toISOString() : null,
            jobId,
        ]);
        const updatedJob = updateResult.rows[0];
        // Format dates back to Date objects for consistent DTO response
        const formattedJob = Object.assign(Object.assign({}, updatedJob), { posted_date: updatedJob.posted_date ? new Date(updatedJob.posted_date) : null, deadline_date: updatedJob.deadline_date ? new Date(updatedJob.deadline_date) : null, created_at: new Date(updatedJob.created_at), updated_at: new Date(updatedJob.updated_at) });
        const validatedUpdatedJob = job_1.JobDTO.parse(formattedJob); // Re-validate before sending
        res.status(200).json(validatedUpdatedJob);
    }
    catch (error) {
        console.error(`Error updating job ${jobId}:`, error);
        if (error instanceof zod_1.z.ZodError) {
            return res.status(400).json({ message: 'Validation error', errors: error.issues });
        }
        res.status(500).json({ message: 'Failed to update job', error: error.message });
    }
    finally {
        if (client)
            client.release();
    }
}));
// =====================================================================
// DELETE /api/jobs/:id - Delete a job listing
// =====================================================================
jobsRouter.delete('/:id', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const jobId = req.params.id; // Get ID from URL parameters
    let client;
    try {
        client = yield db_1.db.connect();
        // Perform the deletion
        // Due to ON DELETE CASCADE on applications table, applications linked to this job will also be deleted.
        const deleteResult = yield client.query('DELETE FROM jobs WHERE id = $1 RETURNING id;', [jobId]);
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ message: 'Job not found or already deleted.' });
        }
        res.status(204).send(); // 204 No Content for successful deletion
    }
    catch (error) {
        console.error(`Error deleting job ${jobId}:`, error);
        res.status(500).json({ message: 'Failed to delete job', error: error.message });
    }
    finally {
        if (client)
            client.release();
    }
}));
exports.default = jobsRouter;
