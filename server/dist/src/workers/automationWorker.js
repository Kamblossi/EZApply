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
exports.automationWorker = exports.AutomationWorker = void 0;
const bullmq_1 = require("bullmq");
const playwright_1 = require("playwright");
const automation_1 = require("../queues/automation");
const db_1 = require("../db");
const path_1 = require("path");
const fs_1 = require("fs");
class AutomationWorker {
    constructor(io) {
        this.browser = null;
        this.io = io;
        this.worker = new bullmq_1.Worker('automation', this.processJob.bind(this), {
            connection: automation_1.redisConnection,
            concurrency: 3, // Process up to 3 jobs simultaneously
        });
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.worker.on('ready', () => {
            console.log('Automation worker is ready to process jobs');
        });
        this.worker.on('error', (error) => {
            console.error('Worker error:', error);
        });
        this.worker.on('failed', (job, error) => {
            console.error(`Job ${job === null || job === void 0 ? void 0 : job.id} failed:`, error);
        });
        this.worker.on('completed', (job) => {
            console.log(`Job ${job.id} completed successfully`);
        });
    }
    processJob(job) {
        return __awaiter(this, void 0, void 0, function* () {
            const { jobId, userId, runId } = job.data;
            console.log(`Processing automation job ${runId} for user ${userId}, job ${jobId}`);
            try {
                // Update run status to 'running'
                yield this.updateRunStatus(runId, 'running', { started_at: new Date() });
                // Get job details from database
                const jobResult = yield db_1.db.query('SELECT title, employer, location, url, description FROM jobs WHERE id = $1', [jobId]);
                if (jobResult.rows.length === 0) {
                    throw new Error(`Job ${jobId} not found`);
                }
                const jobDetails = jobResult.rows[0];
                // Get user profile data
                const userResult = yield db_1.db.query('SELECT * FROM users WHERE id = $1', [userId]);
                if (userResult.rows.length === 0) {
                    throw new Error(`User ${userId} not found`);
                }
                const userProfile = userResult.rows[0];
                // Create screenshots directory
                const screenshotsDir = (0, path_1.join)(process.cwd(), 'uploads', 'screenshots', runId);
                if (!(0, fs_1.existsSync)(screenshotsDir)) {
                    (0, fs_1.mkdirSync)(screenshotsDir, { recursive: true });
                }
                // Start Playwright automation
                yield this.runPlaywrightAutomation(runId, jobDetails, userProfile, screenshotsDir);
                // Mark as successful
                yield this.updateRunStatus(runId, 'success', {
                    completed_at: new Date(),
                    application_url: 'https://trac.jobs.nhs.uk/applications' // Placeholder
                });
            }
            catch (error) {
                console.error(`Automation failed for run ${runId}:`, error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                // Log the error
                yield this.logStep(runId, 99, 'error', `Automation failed: ${errorMessage}`);
                // Mark as failed
                yield this.updateRunStatus(runId, 'failed', {
                    completed_at: new Date(),
                    error_message: errorMessage
                });
                throw error; // Re-throw so BullMQ marks job as failed
            }
        });
    }
    runPlaywrightAutomation(runId, jobDetails, userProfile, screenshotsDir) {
        return __awaiter(this, void 0, void 0, function* () {
            let browser = null;
            let context = null;
            let page = null;
            try {
                // Launch browser
                yield this.logStep(runId, 1, 'info', 'Launching browser...');
                browser = yield playwright_1.chromium.launch({ headless: true });
                context = yield browser.newContext({
                    viewport: { width: 1920, height: 1080 },
                    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
                });
                page = yield context.newPage();
                // Navigate to NHS Trac
                yield this.logStep(runId, 2, 'info', 'Navigating to NHS Trac Jobs...');
                yield page.goto('https://trac.jobs.nhs.uk/', { waitUntil: 'networkidle' });
                // Take initial screenshot
                const initialScreenshot = (0, path_1.join)(screenshotsDir, 'initial.png');
                yield page.screenshot({ path: initialScreenshot, fullPage: false });
                yield this.logStep(runId, 3, 'info', 'Initial screenshot taken');
                // Search for the job
                yield this.logStep(runId, 4, 'info', `Searching for job: ${jobDetails.title}`);
                // Try to find search input
                const searchSelectors = [
                    'input[name="keywords"]',
                    'input[id*="search"]',
                    'input[placeholder*="search"]',
                    '.search-input input'
                ];
                let searchInput = null;
                for (const selector of searchSelectors) {
                    try {
                        yield page.waitForSelector(selector, { timeout: 2000 });
                        searchInput = page.locator(selector);
                        break;
                    }
                    catch (e) {
                        // Continue to next selector
                    }
                }
                if (searchInput) {
                    yield searchInput.fill(jobDetails.title);
                    yield page.keyboard.press('Enter');
                    yield page.waitForTimeout(3000);
                    yield this.logStep(runId, 5, 'info', 'Job search performed');
                }
                else {
                    yield this.logStep(runId, 5, 'warning', 'Could not find search input, proceeding without search');
                }
                // Take progress screenshot
                const searchScreenshot = (0, path_1.join)(screenshotsDir, 'search.png');
                yield page.screenshot({ path: searchScreenshot, fullPage: false });
                // Look for apply button or job link
                yield this.logStep(runId, 6, 'info', 'Looking for job application options...');
                const applySelectors = [
                    'a[href*="apply"]',
                    'button[class*="apply"]',
                    '.apply-btn',
                    '[data-test*="apply"]'
                ];
                let applyButton = null;
                for (const selector of applySelectors) {
                    try {
                        yield page.waitForSelector(selector, { timeout: 2000 });
                        applyButton = page.locator(selector).first();
                        break;
                    }
                    catch (e) {
                        // Continue to next selector
                    }
                }
                if (applyButton) {
                    yield applyButton.click();
                    yield page.waitForTimeout(3000);
                    yield this.logStep(runId, 7, 'info', 'Clicked apply button');
                }
                else {
                    yield this.logStep(runId, 7, 'warning', 'No apply button found, automation may need manual intervention');
                }
                // Check if we need to login
                yield this.logStep(runId, 8, 'info', 'Checking authentication status...');
                const loginSelectors = [
                    'input[type="email"]',
                    'input[type="password"]',
                    'input[name="username"]',
                    '.login-form'
                ];
                let needsLogin = false;
                for (const selector of loginSelectors) {
                    if ((yield page.locator(selector).count()) > 0) {
                        needsLogin = true;
                        break;
                    }
                }
                if (needsLogin) {
                    yield this.logStep(runId, 9, 'info', 'Login required - would need credentials to proceed');
                    // In a real implementation, you'd handle login here
                }
                else {
                    yield this.logStep(runId, 9, 'info', 'No login required or already authenticated');
                }
                // Take final screenshot
                const finalScreenshot = (0, path_1.join)(screenshotsDir, 'final.png');
                yield page.screenshot({ path: finalScreenshot, fullPage: false });
                yield this.logStep(runId, 10, 'success', 'Automation workflow completed');
            }
            catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                yield this.logStep(runId, 99, 'error', `Automation error: ${errorMessage}`);
                throw error;
            }
            finally {
                // Cleanup
                if (page)
                    yield page.close();
                if (context)
                    yield context.close();
                if (browser)
                    yield browser.close();
            }
        });
    }
    updateRunStatus(runId_1, status_1) {
        return __awaiter(this, arguments, void 0, function* (runId, status, additionalData = {}) {
            const fields = ['status'];
            const values = [status];
            const placeholders = ['$1'];
            let paramIndex = 2;
            Object.keys(additionalData).forEach(key => {
                fields.push(key);
                values.push(additionalData[key]);
                placeholders.push(`$${paramIndex++}`);
            });
            const query = `
      UPDATE automation_runs 
      SET ${fields.map((field, index) => `${field} = ${placeholders[index]}`).join(', ')}
      WHERE id = $${paramIndex}
    `;
            values.push(runId);
            yield db_1.db.query(query, values);
        });
    }
    logStep(runId, stepNumber, level, message) {
        return __awaiter(this, void 0, void 0, function* () {
            yield db_1.db.query(`INSERT INTO automation_logs (run_id, step_number, level, message, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`, [runId, stepNumber, level, message]);
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.worker.close();
            if (this.browser) {
                yield this.browser.close();
            }
        });
    }
}
exports.AutomationWorker = AutomationWorker;
// Create and export a singleton instance
exports.automationWorker = new AutomationWorker();
