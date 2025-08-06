import { Worker, Job } from 'bullmq';
import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { redisConnection } from '../queues/automation';
import { db } from '../db';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { Server as SocketIOServer } from 'socket.io';

interface AutomationJobData {
  jobId: string;
  userId: string;
  runId: string;
}

export class AutomationWorker {
  private worker: Worker;
  private browser: Browser | null = null;
  private io?: SocketIOServer;

  constructor(io?: SocketIOServer) {
    this.io = io;
    this.worker = new Worker('automation', this.processJob.bind(this), {
      connection: redisConnection,
      concurrency: 3, // Process up to 3 jobs simultaneously
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on('ready', () => {
      console.log('Automation worker is ready to process jobs');
    });

    this.worker.on('error', (error) => {
      console.error('Worker error:', error);
    });

    this.worker.on('failed', (job, error) => {
      console.error(`Job ${job?.id} failed:`, error);
    });

    this.worker.on('completed', (job) => {
      console.log(`Job ${job.id} completed successfully`);
    });
  }

  private async processJob(job: Job<AutomationJobData>) {
    const { jobId, userId, runId } = job.data;
    console.log(`Processing automation job ${runId} for user ${userId}, job ${jobId}`);

    try {
      // Update run status to 'running'
      await this.updateRunStatus(runId, 'running', { started_at: new Date() });
      
      // Get job details from database
      const jobResult = await db.query(
        'SELECT title, employer, location, url, description FROM jobs WHERE id = $1',
        [jobId]
      );

      if (jobResult.rows.length === 0) {
        throw new Error(`Job ${jobId} not found`);
      }

      const jobDetails = jobResult.rows[0];

      // Get user profile data
      const userResult = await db.query(
        'SELECT * FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error(`User ${userId} not found`);
      }

      const userProfile = userResult.rows[0];

      // Create screenshots directory
      const screenshotsDir = join(process.cwd(), 'uploads', 'screenshots', runId);
      if (!existsSync(screenshotsDir)) {
        mkdirSync(screenshotsDir, { recursive: true });
      }

      // Start Playwright automation
      await this.runPlaywrightAutomation(runId, jobDetails, userProfile, screenshotsDir);

      // Mark as successful
      await this.updateRunStatus(runId, 'success', { 
        completed_at: new Date(),
        application_url: 'https://trac.jobs.nhs.uk/applications' // Placeholder
      });

    } catch (error) {
      console.error(`Automation failed for run ${runId}:`, error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Log the error
      await this.logStep(runId, 99, 'error', `Automation failed: ${errorMessage}`);
      
      // Mark as failed
      await this.updateRunStatus(runId, 'failed', { 
        completed_at: new Date(),
        error_message: errorMessage
      });

      throw error; // Re-throw so BullMQ marks job as failed
    }
  }

  private async runPlaywrightAutomation(
    runId: string, 
    jobDetails: any, 
    userProfile: any, 
    screenshotsDir: string
  ) {
    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    try {
      // Launch browser
      await this.logStep(runId, 1, 'info', 'Launching browser...');
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext({
        viewport: { width: 1920, height: 1080 },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
      });

      page = await context.newPage();

      // Navigate to NHS Trac
      await this.logStep(runId, 2, 'info', 'Navigating to NHS Trac Jobs...');
      await page.goto('https://trac.jobs.nhs.uk/', { waitUntil: 'networkidle' });

      // Take initial screenshot
      const initialScreenshot = join(screenshotsDir, 'initial.png');
      await page.screenshot({ path: initialScreenshot, fullPage: false });
      await this.logStep(runId, 3, 'info', 'Initial screenshot taken');

      // Search for the job
      await this.logStep(runId, 4, 'info', `Searching for job: ${jobDetails.title}`);
      
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
          await page.waitForSelector(selector, { timeout: 2000 });
          searchInput = page.locator(selector);
          break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (searchInput) {
        await searchInput.fill(jobDetails.title);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(3000);
        
        await this.logStep(runId, 5, 'info', 'Job search performed');
      } else {
        await this.logStep(runId, 5, 'warning', 'Could not find search input, proceeding without search');
      }

      // Take progress screenshot
      const searchScreenshot = join(screenshotsDir, 'search.png');
      await page.screenshot({ path: searchScreenshot, fullPage: false });

      // Look for apply button or job link
      await this.logStep(runId, 6, 'info', 'Looking for job application options...');
      
      const applySelectors = [
        'a[href*="apply"]',
        'button[class*="apply"]',
        '.apply-btn',
        '[data-test*="apply"]'
      ];

      let applyButton = null;
      for (const selector of applySelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          applyButton = page.locator(selector).first();
          break;
        } catch (e) {
          // Continue to next selector
        }
      }

      if (applyButton) {
        await applyButton.click();
        await page.waitForTimeout(3000);
        await this.logStep(runId, 7, 'info', 'Clicked apply button');
      } else {
        await this.logStep(runId, 7, 'warning', 'No apply button found, automation may need manual intervention');
      }

      // Check if we need to login
      await this.logStep(runId, 8, 'info', 'Checking authentication status...');
      
      const loginSelectors = [
        'input[type="email"]',
        'input[type="password"]',
        'input[name="username"]',
        '.login-form'
      ];

      let needsLogin = false;
      for (const selector of loginSelectors) {
        if (await page.locator(selector).count() > 0) {
          needsLogin = true;
          break;
        }
      }

      if (needsLogin) {
        await this.logStep(runId, 9, 'info', 'Login required - would need credentials to proceed');
        // In a real implementation, you'd handle login here
      } else {
        await this.logStep(runId, 9, 'info', 'No login required or already authenticated');
      }

      // Take final screenshot
      const finalScreenshot = join(screenshotsDir, 'final.png');
      await page.screenshot({ path: finalScreenshot, fullPage: false });
      await this.logStep(runId, 10, 'success', 'Automation workflow completed');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.logStep(runId, 99, 'error', `Automation error: ${errorMessage}`);
      throw error;
    } finally {
      // Cleanup
      if (page) await page.close();
      if (context) await context.close();
      if (browser) await browser.close();
    }
  }

  private async updateRunStatus(runId: string, status: string, additionalData: any = {}) {
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
    await db.query(query, values);
  }

  private async logStep(runId: string, stepNumber: number, level: string, message: string) {
    await db.query(
      `INSERT INTO automation_logs (run_id, step_number, level, message, created_at) 
       VALUES ($1, $2, $3, $4, NOW())`,
      [runId, stepNumber, level, message]
    );
  }

  async close() {
    await this.worker.close();
    if (this.browser) {
      await this.browser.close();
    }
  }
}

// Create and export a singleton instance
export const automationWorker = new AutomationWorker();
