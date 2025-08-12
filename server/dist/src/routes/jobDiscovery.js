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
const nhsJobSearch_1 = require("../services/nhsJobSearch");
const db_1 = require("../db");
const nanoid_1 = require("nanoid");
const router = (0, express_1.Router)();
// =====================================================================
// POST /api/jobs/discover - Search for jobs across multiple platforms
// =====================================================================
router.post('/discover', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Validate search criteria
        const searchCriteria = nhsJobSearch_1.NHSJobSearchSchema.parse(req.body);
        // Perform NHS Trac search
        const nhsResults = yield nhsJobSearch_1.NHSJobSearchService.searchJobs(searchCriteria);
        // Store search history in database
        yield db_1.db.query(`INSERT INTO job_searches (id, user_id, search_criteria, results_count, platform)
       VALUES ($1, $2, $3, $4, $5)`, [
            (0, nanoid_1.nanoid)(),
            userId,
            JSON.stringify(searchCriteria),
            nhsResults.totalFound,
            'NHS'
        ]);
        // Cache discovered jobs for this search
        if (nhsResults.success && nhsResults.jobs.length > 0) {
            for (const job of nhsResults.jobs) {
                try {
                    yield db_1.db.query(`INSERT INTO discovered_jobs (
              id, search_id, platform, external_id, title, company, location, 
              url, salary_min, salary_max, description, requirements, 
              posted_date, deadline_date, discovered_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
            ON CONFLICT (external_id, platform) DO UPDATE SET
              discovered_at = NOW(),
              search_id = $2`, [
                        (0, nanoid_1.nanoid)(),
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
                    ]);
                }
                catch (jobError) {
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
    }
    catch (error) {
        console.error('Job discovery error:', error);
        if (error instanceof zod_1.z.ZodError) {
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
}));
// =====================================================================
// GET /api/jobs/discover/results/:searchId - Get cached search results
// =====================================================================
router.get('/discover/results/:searchId', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { searchId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Get search metadata
        const searchResult = yield db_1.db.query(`SELECT * FROM job_searches WHERE id = $1 AND user_id = $2`, [searchId, userId]);
        if (searchResult.rows.length === 0) {
            return res.status(404).json({ error: 'Search not found' });
        }
        const search = searchResult.rows[0];
        // Get cached job results
        const jobsResult = yield db_1.db.query(`SELECT * FROM discovered_jobs 
       WHERE search_id = $1 
       ORDER BY discovered_at DESC`, [searchId]);
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
            searchCriteria: search === null || search === void 0 ? void 0 : search.search_criteria,
            platform: search === null || search === void 0 ? void 0 : search.platform,
            totalFound: search === null || search === void 0 ? void 0 : search.results_count,
            jobs,
            searchDate: search === null || search === void 0 ? void 0 : search.created_at
        });
    }
    catch (error) {
        console.error('Error fetching search results:', error);
        res.status(500).json({ error: 'Failed to fetch search results' });
    }
}));
// =====================================================================
// GET /api/jobs/discover/history - Get user's search history
// =====================================================================
router.get('/discover/history', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        const result = yield db_1.db.query(`SELECT id, search_criteria, results_count, platform, created_at
       FROM job_searches 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT 20`, [userId]);
        const searches = result.rows.map(row => ({
            searchId: row.id,
            criteria: row.search_criteria,
            resultsCount: row.results_count,
            platform: row.platform,
            searchDate: row.created_at
        }));
        res.status(200).json({ searches });
    }
    catch (error) {
        console.error('Error fetching search history:', error);
        res.status(500).json({ error: 'Failed to fetch search history' });
    }
}));
// =====================================================================
// POST /api/jobs/discover/save - Save discovered job to user's job list
// =====================================================================
router.post('/discover/save', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { externalId, platform, createApplication = false } = req.body;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Get discovered job details
        const discoveredJobResult = yield db_1.db.query(`SELECT * FROM discovered_jobs 
       WHERE external_id = $1 AND platform = $2`, [externalId, platform]);
        if (discoveredJobResult.rows.length === 0) {
            return res.status(404).json({ error: 'Discovered job not found' });
        }
        const discoveredJob = discoveredJobResult.rows[0];
        // Check if job already exists in jobs table
        let jobId;
        const existingJobResult = yield db_1.db.query(`SELECT id FROM jobs WHERE url = $1`, [discoveredJob.url]);
        if (existingJobResult.rows.length > 0) {
            jobId = existingJobResult.rows[0].id;
        }
        else {
            // Create new job entry
            const newJobResult = yield db_1.db.query(`INSERT INTO jobs (
          title, company, location, description, url, status, 
          posted_date, deadline_date
        ) VALUES ($1, $2, $3, $4, $5, 'open', $6, $7)
        RETURNING id`, [
                discoveredJob.title,
                discoveredJob.company,
                discoveredJob.location,
                discoveredJob.description,
                discoveredJob.url,
                discoveredJob.posted_date,
                discoveredJob.deadline_date
            ]);
            jobId = newJobResult.rows[0].id;
        }
        // Optionally create application
        let applicationId = null;
        if (createApplication) {
            const applicationResult = yield db_1.db.query(`INSERT INTO applications (user_id, job_id, status)
         VALUES ($1, $2, 'interested')
         ON CONFLICT (user_id, job_id) DO UPDATE SET updated_at = NOW()
         RETURNING id`, [userId, jobId]);
            applicationId = applicationResult.rows[0].id;
        }
        // Mark discovered job as applied
        yield db_1.db.query(`UPDATE discovered_jobs 
       SET is_applied = true 
       WHERE external_id = $1 AND platform = $2`, [externalId, platform]);
        res.status(201).json({
            success: true,
            jobId,
            applicationId,
            message: createApplication ? 'Job saved and application created' : 'Job saved successfully'
        });
    }
    catch (error) {
        console.error('Error saving discovered job:', error);
        res.status(500).json({ error: 'Failed to save job' });
    }
}));
// =====================================================================
// GET /api/jobs/discover/suggestions - Get search suggestions
// =====================================================================
router.get('/discover/suggestions', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { type, query } = req.query;
        let suggestions = [];
        switch (type) {
            case 'keywords':
                suggestions = nhsJobSearch_1.NHSJobSearchService.getSearchSuggestions(query || '');
                break;
            case 'locations':
                suggestions = nhsJobSearch_1.NHSJobSearchService.getLocationSuggestions(query || '');
                break;
            default:
                return res.status(400).json({ error: 'Invalid suggestion type' });
        }
        res.status(200).json({ suggestions });
    }
    catch (error) {
        console.error('Error getting suggestions:', error);
        res.status(500).json({ error: 'Failed to get suggestions' });
    }
}));
// =====================================================================
// DELETE /api/jobs/discover/:searchId - Delete search and cached results
// =====================================================================
router.delete('/discover/:searchId', auth_1.requireAuth, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        const { searchId } = req.params;
        if (!userId) {
            return res.status(401).json({ error: 'User not authenticated' });
        }
        // Delete cached jobs first
        yield db_1.db.query(`DELETE FROM discovered_jobs WHERE search_id = $1`, [searchId]);
        // Delete search record
        const deleteResult = yield db_1.db.query(`DELETE FROM job_searches 
       WHERE id = $1 AND user_id = $2 
       RETURNING id`, [searchId, userId]);
        if (deleteResult.rows.length === 0) {
            return res.status(404).json({ error: 'Search not found' });
        }
        res.status(204).send();
    }
    catch (error) {
        console.error('Error deleting search:', error);
        res.status(500).json({ error: 'Failed to delete search' });
    }
}));
// Helper functions
function extractSalaryMin(salaryText) {
    const matches = salaryText.match(/£?(\d+(?:,\d+)?)/);
    return matches ? parseInt(matches[1].replace(/,/g, '')) : null;
}
function extractSalaryMax(salaryText) {
    const matches = salaryText.match(/£?\d+(?:,\d+)?\s*[-–]\s*£?(\d+(?:,\d+)?)/);
    return matches ? parseInt(matches[1].replace(/,/g, '')) : null;
}
function formatSalaryRange(min, max) {
    if (!min && !max)
        return undefined;
    if (min && max)
        return `£${min.toLocaleString()} - £${max.toLocaleString()}`;
    if (min)
        return `£${min.toLocaleString()}+`;
    if (max)
        return `Up to £${max.toLocaleString()}`;
    return undefined;
}
exports.default = router;
