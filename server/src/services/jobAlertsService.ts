import { Queue, Worker, Job } from 'bullmq';
import { db } from '../db';
import { redisConnection } from '../queues/automation';
import { MultiPlatformJobDiscoveryService, type PlatformSearchResults } from './multiPlatformJobDiscovery';
import { JobDeduplicationService } from './jobDeduplicationService';
import { nanoid } from 'nanoid';
import { z } from 'zod';

// Schema for job alert criteria
export const JobAlertSchema = z.object({
  keywords: z.string().min(1),
  location: z.string().optional(),
  platforms: z.array(z.string()).default(['nhs', 'indeed', 'reed']),
  salaryMin: z.number().optional(),
  salaryMax: z.number().optional(),
  jobType: z.string().optional(),
  radius: z.number().default(25),
  excludeKeywords: z.array(z.string()).default([])
});

export type JobAlertCriteria = z.infer<typeof JobAlertSchema>;

export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  searchCriteria: JobAlertCriteria;
  filters?: Record<string, any>;
  isActive: boolean;
  frequency: 'manual' | 'daily' | 'weekly' | 'monthly';
  lastRunAt?: Date;
  nextRunAt?: Date;
  lastResultsCount: number;
  totalAlertsSent: number;
  emailEnabled: boolean;
  pushEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface JobAlertResult {
  alertId: string;
  newJobsFound: number;
  totalJobsChecked: number;
  newJobs: Array<{
    id: string;
    title: string;
    company: string;
    location?: string;
    url: string;
    platform: string;
    discoveredAt: Date;
    salary?: string;
    isRecommended?: boolean;
    matchScore?: number;
  }>;
}

// Create dedicated queue for job alerts
export const jobAlertsQueue = new Queue('job-alerts', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 20,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
});

export class JobAlertsService {
  private static worker: Worker | null = null;

  /**
   * Initialize the job alerts worker
   */
  static initializeWorker(): void {
    if (this.worker) {
      return; // Already initialized
    }

    this.worker = new Worker(
      'job-alerts',
      async (job: Job) => {
        console.log(`Processing job alert: ${job.name} with data:`, job.data);
        
        switch (job.name) {
          case 'run-alert':
            return await this.processJobAlert(job.data.alertId);
          case 'schedule-recurring-alerts':
            return await this.scheduleRecurringAlerts();
          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
      },
      { 
        connection: redisConnection,
        concurrency: 3 // Process up to 3 alerts concurrently
      }
    );

    this.worker.on('completed', (job) => {
      console.log(`Job alert completed: ${job.id}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`Job alert failed: ${job?.id}`, err);
    });

    // Schedule the recurring alerts scheduler to run every hour
    this.scheduleRecurringAlertsJob();
  }

  /**
   * Create a new job alert
   */
  static async createJobAlert(
    userId: string,
    alertData: {
      name: string;
      searchCriteria: JobAlertCriteria;
      frequency: JobAlert['frequency'];
      emailEnabled?: boolean;
      pushEnabled?: boolean;
    }
  ): Promise<JobAlert> {
    const alertId = nanoid();
    const now = new Date();
    
    // Calculate next run time based on frequency
    const nextRunAt = this.calculateNextRunTime(alertData.frequency, now);

    const query = `
      INSERT INTO enhanced_job_alerts (
        id, user_id, name, search_criteria, is_active, frequency,
        next_run_at, email_enabled, push_enabled, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      alertId,
      userId,
      alertData.name,
      JSON.stringify(alertData.searchCriteria),
      true,
      alertData.frequency,
      nextRunAt,
      alertData.emailEnabled ?? true,
      alertData.pushEnabled ?? false,
      now,
      now
    ];

    const result = await db.query(query, values);
    return this.mapDbRowToJobAlert(result.rows[0]);
  }

  /**
   * Update an existing job alert
   */
  static async updateJobAlert(
    alertId: string,
    userId: string,
    updates: Partial<Omit<JobAlert, 'id' | 'userId' | 'createdAt'>>
  ): Promise<JobAlert | null> {
    const setParts: string[] = [];
    const values: any[] = [alertId, userId];
    let paramCount = 2;

    // Build dynamic update query
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        paramCount++;
        if (key === 'searchCriteria') {
          setParts.push(`search_criteria = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else if (key === 'nextRunAt' && alertId && updates.frequency) {
          // Recalculate next run time if frequency changed
          const nextRun = this.calculateNextRunTime(updates.frequency);
          setParts.push(`next_run_at = $${paramCount}`);
          values.push(nextRun);
        } else {
          const dbField = this.camelToSnakeCase(key);
          setParts.push(`${dbField} = $${paramCount}`);
          values.push(value);
        }
      }
    });

    if (setParts.length === 0) {
      return null;
    }

    setParts.push(`updated_at = NOW()`);

    const query = `
      UPDATE enhanced_job_alerts 
      SET ${setParts.join(', ')}
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await db.query(query, values);
    return result.rows.length > 0 ? this.mapDbRowToJobAlert(result.rows[0]) : null;
  }

  /**
   * Get job alerts for a user
   */
  static async getUserJobAlerts(userId: string): Promise<JobAlert[]> {
    const query = `
      SELECT * FROM enhanced_job_alerts 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [userId]);
    return result.rows.map(this.mapDbRowToJobAlert);
  }

  /**
   * Delete a job alert
   */
  static async deleteJobAlert(alertId: string, userId: string): Promise<boolean> {
    const query = `
      DELETE FROM enhanced_job_alerts 
      WHERE id = $1 AND user_id = $2
    `;

    const result = await db.query(query, [alertId, userId]);
    return (result.rowCount || 0) > 0;
  }

  /**
   * Run a job alert manually
   */
  static async runJobAlertManually(alertId: string, userId: string): Promise<JobAlertResult> {
    // Verify the alert belongs to the user
    const alertQuery = `
      SELECT * FROM enhanced_job_alerts 
      WHERE id = $1 AND user_id = $2 AND is_active = true
    `;
    
    const alertResult = await db.query(alertQuery, [alertId, userId]);
    if (alertResult.rows.length === 0) {
      throw new Error('Job alert not found or inactive');
    }

    // Queue the job alert for immediate processing
    await jobAlertsQueue.add('run-alert', { alertId }, {
      priority: 10, // High priority for manual runs
      delay: 0
    });

    // Process immediately and return results
    return await this.processJobAlert(alertId);
  }

  /**
   * Schedule recurring alerts job
   */
  private static async scheduleRecurringAlertsJob(): Promise<void> {
    // Add a repeating job that runs every hour to check for alerts that need to run
    await jobAlertsQueue.add(
      'schedule-recurring-alerts',
      {},
      {
        repeat: { pattern: '0 * * * *' }, // Every hour at minute 0
        jobId: 'recurring-alerts-scheduler' // Prevent duplicates
      }
    );
  }

  /**
   * Process a job alert and find new jobs
   */
  private static async processJobAlert(alertId: string): Promise<JobAlertResult> {
    console.log(`Processing job alert: ${alertId}`);

    // Get the alert details
    const alertQuery = `
      SELECT eja.*, u.email 
      FROM enhanced_job_alerts eja
      JOIN users u ON eja.user_id = u.id
      WHERE eja.id = $1 AND eja.is_active = true
    `;
    
    const alertResult = await db.query(alertQuery, [alertId]);
    if (alertResult.rows.length === 0) {
      throw new Error(`Active job alert not found: ${alertId}`);
    }

    const alert = alertResult.rows[0];
    const searchCriteria = alert.search_criteria;
    const lastRunAt = alert.last_run_at;

    try {
      // Perform job discovery using the search criteria
      const discoveryResult = await MultiPlatformJobDiscoveryService.searchAllPlatforms(searchCriteria);
      
      let newJobs: JobAlertResult['newJobs'] = [];
      let totalJobsChecked = 0;

      // Process results from each platform
      for (const [platform, results] of Object.entries(discoveryResult.platforms)) {
        const platformResults = results as PlatformSearchResults;
        if (platformResults.success && platformResults.jobs) {
          totalJobsChecked += platformResults.jobs.length;

          for (const job of platformResults.jobs) {
            // Check if this is a new job (discovered after last run)
            const jobDiscoveredAt = new Date(job.postedDate || Date.now());
            const isNewJob = !lastRunAt || jobDiscoveredAt > lastRunAt;
            
            if (isNewJob) {
              // Check for duplicates to avoid sending the same job multiple times
              const duplicateCheck = await JobDeduplicationService.checkForDuplicates({
                title: job.title,
                company: job.company,
                location: job.location,
                url: job.url
              });

              if (!duplicateCheck.isDuplicate) {
                newJobs.push({
                  id: job.id,
                  title: job.title,
                  company: job.company,
                  location: job.location,
                  url: job.url,
                  platform,
                  discoveredAt: jobDiscoveredAt,
                  salary: job.salary,
                  matchScore: job.score
                });
              }
            }
          }
        }
      }

      // Update alert's last run statistics
      await this.updateAlertRunStats(alertId, newJobs.length);

      // Send notifications if there are new jobs and notifications are enabled
      if (newJobs.length > 0) {
        if (alert.email_enabled) {
          await this.sendEmailNotification(alert.user_id, alert.email, alert.name, newJobs);
        }
        
        if (alert.push_enabled) {
          await this.sendPushNotification(alert.user_id, alert.name, newJobs);
        }
      }

      console.log(`Job alert ${alertId} completed: ${newJobs.length} new jobs found`);

      return {
        alertId,
        newJobsFound: newJobs.length,
        totalJobsChecked,
        newJobs
      };

    } catch (error) {
      console.error(`Error processing job alert ${alertId}:`, error);
      throw error;
    }
  }

  /**
   * Schedule recurring alerts that are due to run
   */
  private static async scheduleRecurringAlerts(): Promise<void> {
    const query = `
      SELECT id FROM enhanced_job_alerts 
      WHERE is_active = true 
        AND frequency != 'manual'
        AND (next_run_at IS NULL OR next_run_at <= NOW())
    `;

    const result = await db.query(query);
    
    for (const alert of result.rows) {
      // Queue each alert for processing
      await jobAlertsQueue.add('run-alert', { alertId: alert.id }, {
        delay: Math.random() * 30000 // Spread out over 30 seconds to avoid overload
      });

      // Update next run time
      await this.updateNextRunTime(alert.id);
    }

    console.log(`Scheduled ${result.rows.length} recurring job alerts`);
  }

  /**
   * Update alert statistics after a run
   */
  private static async updateAlertRunStats(alertId: string, newJobsCount: number): Promise<void> {
    const query = `
      UPDATE enhanced_job_alerts 
      SET 
        last_run_at = NOW(),
        last_results_count = $2,
        total_alerts_sent = total_alerts_sent + CASE WHEN $2 > 0 THEN 1 ELSE 0 END
      WHERE id = $1
    `;

    await db.query(query, [alertId, newJobsCount]);
  }

  /**
   * Update the next run time for an alert
   */
  private static async updateNextRunTime(alertId: string): Promise<void> {
    const query = `
      UPDATE enhanced_job_alerts 
      SET next_run_at = $2
      WHERE id = $1
    `;

    // Get current frequency to calculate next run
    const alertQuery = `SELECT frequency FROM enhanced_job_alerts WHERE id = $1`;
    const alertResult = await db.query(alertQuery, [alertId]);
    
    if (alertResult.rows.length > 0) {
      const frequency = alertResult.rows[0].frequency;
      const nextRun = this.calculateNextRunTime(frequency);
      await db.query(query, [alertId, nextRun]);
    }
  }

  /**
   * Calculate next run time based on frequency
   */
  private static calculateNextRunTime(frequency: JobAlert['frequency'], fromDate: Date = new Date()): Date | null {
    if (frequency === 'manual') {
      return null;
    }

    const nextRun = new Date(fromDate);

    switch (frequency) {
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        break;
    }

    return nextRun;
  }

  /**
   * Send email notification for new jobs
   */
  private static async sendEmailNotification(
    userId: string, 
    userEmail: string, 
    alertName: string, 
    newJobs: JobAlertResult['newJobs']
  ): Promise<void> {
    // TODO: Implement email notification
    // This would integrate with your existing email service
    console.log(`Would send email to ${userEmail} about ${newJobs.length} new jobs for alert: ${alertName}`);
  }

  /**
   * Send push notification for new jobs
   */
  private static async sendPushNotification(
    userId: string, 
    alertName: string, 
    newJobs: JobAlertResult['newJobs']
  ): Promise<void> {
    // TODO: Implement push notification
    console.log(`Would send push notification to user ${userId} about ${newJobs.length} new jobs for alert: ${alertName}`);
  }

  /**
   * Convert camelCase to snake_case
   */
  private static camelToSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Map database row to JobAlert object
   */
  private static mapDbRowToJobAlert(row: any): JobAlert {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      searchCriteria: row.search_criteria,
      filters: row.filters,
      isActive: row.is_active,
      frequency: row.frequency,
      lastRunAt: row.last_run_at,
      nextRunAt: row.next_run_at,
      lastResultsCount: row.last_results_count || 0,
      totalAlertsSent: row.total_alerts_sent || 0,
      emailEnabled: row.email_enabled,
      pushEnabled: row.push_enabled,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * Close the worker gracefully
   */
  static async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
      this.worker = null;
    }
  }
}
