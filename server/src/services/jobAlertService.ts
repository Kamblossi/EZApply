import { z } from 'zod';
import { db } from '../db';
import { nanoid } from 'nanoid';
import { MultiPlatformJobDiscoveryService, JobSearchCriteria } from './multiPlatformJobDiscovery';

// =====================================================================
// Job Alert Service
// =====================================================================

export const JobAlertSchema = z.object({
  name: z.string().min(1, 'Alert name is required'),
  searchCriteria: z.object({
    keywords: z.string().min(1),
    location: z.string().optional(),
    radius: z.number().default(25),
    salaryMin: z.number().optional(),
    salaryMax: z.number().optional(),
    platforms: z.array(z.string()).default(['nhs']),
    jobType: z.string().optional(),
    workPattern: z.string().optional()
  }),
  frequency: z.enum(['immediate', 'daily', 'weekly', 'monthly']).default('daily'),
  emailNotifications: z.boolean().default(true),
  isActive: z.boolean().default(true),
  maxResults: z.number().min(1).max(50).default(20)
});

export type JobAlertConfig = z.infer<typeof JobAlertSchema>;

export interface JobAlert {
  id: string;
  userId: string;
  name: string;
  searchCriteria: JobSearchCriteria;
  frequency: string;
  emailNotifications: boolean;
  isActive: boolean;
  maxResults: number;
  lastRunAt?: Date;
  nextRunAt?: Date;
  resultsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertExecution {
  id: string;
  alertId: string;
  executedAt: Date;
  jobsFound: number;
  newJobs: number;
  status: 'success' | 'error';
  errorMessage?: string;
  searchResults?: any;
}

export class JobAlertService {
  
  // =====================================================================
  // Create new job alert
  // =====================================================================
  static async createAlert(userId: string, alertConfig: JobAlertConfig): Promise<JobAlert> {
    const validatedConfig = JobAlertSchema.parse(alertConfig);
    const alertId = nanoid();
    
    const nextRunAt = this.calculateNextRun(validatedConfig.frequency);
    
    const result = await db.query(`
      INSERT INTO saved_job_alerts (
        id, user_id, name, search_criteria, frequency, 
        email_notifications, is_active, max_results, next_run_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [
      alertId,
      userId,
      validatedConfig.name,
      JSON.stringify(validatedConfig.searchCriteria),
      validatedConfig.frequency,
      validatedConfig.emailNotifications,
      validatedConfig.isActive,
      validatedConfig.maxResults,
      nextRunAt
    ]);
    
    return this.mapRowToAlert(result.rows[0]);
  }

  // =====================================================================
  // Get user's job alerts
  // =====================================================================
  static async getUserAlerts(userId: string): Promise<JobAlert[]> {
    const result = await db.query(
      'SELECT * FROM saved_job_alerts WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    
    return result.rows.map(this.mapRowToAlert);
  }

  // =====================================================================
  // Update job alert
  // =====================================================================
  static async updateAlert(alertId: string, userId: string, updates: Partial<JobAlertConfig>): Promise<JobAlert | null> {
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    if (updates.name) {
      setClause.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    
    if (updates.searchCriteria) {
      setClause.push(`search_criteria = $${paramIndex++}`);
      values.push(JSON.stringify(updates.searchCriteria));
    }
    
    if (updates.frequency) {
      setClause.push(`frequency = $${paramIndex++}`);
      values.push(updates.frequency);
      
      // Update next run time when frequency changes
      setClause.push(`next_run_at = $${paramIndex++}`);
      values.push(this.calculateNextRun(updates.frequency));
    }
    
    if (updates.emailNotifications !== undefined) {
      setClause.push(`email_notifications = $${paramIndex++}`);
      values.push(updates.emailNotifications);
    }
    
    if (updates.isActive !== undefined) {
      setClause.push(`is_active = $${paramIndex++}`);
      values.push(updates.isActive);
    }
    
    if (updates.maxResults) {
      setClause.push(`max_results = $${paramIndex++}`);
      values.push(updates.maxResults);
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid updates provided');
    }
    
    setClause.push(`updated_at = NOW()`);
    values.push(alertId, userId);
    
    const result = await db.query(`
      UPDATE saved_job_alerts 
      SET ${setClause.join(', ')}
      WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
      RETURNING *
    `, values);
    
    return result.rows.length > 0 ? this.mapRowToAlert(result.rows[0]) : null;
  }

  // =====================================================================
  // Delete job alert
  // =====================================================================
  static async deleteAlert(alertId: string, userId: string): Promise<boolean> {
    const result = await db.query(
      'DELETE FROM saved_job_alerts WHERE id = $1 AND user_id = $2',
      [alertId, userId]
    );
    
    return (result.rowCount || 0) > 0;
  }

  // =====================================================================
  // Execute job alert
  // =====================================================================
  static async executeAlert(alertId: string): Promise<AlertExecution> {
    const executionId = nanoid();
    const executedAt = new Date();
    
    try {
      // Get alert details
      const alertResult = await db.query(
        'SELECT * FROM saved_job_alerts WHERE id = $1 AND is_active = true',
        [alertId]
      );
      
      if (alertResult.rows.length === 0) {
        throw new Error('Alert not found or inactive');
      }
      
      const alert = this.mapRowToAlert(alertResult.rows[0]);
      
      // Execute search
      const searchResults = await MultiPlatformJobDiscoveryService.searchAllPlatforms(
        alert.searchCriteria
      );
      
      // Get existing job IDs to identify new jobs
      const existingJobsResult = await db.query(`
        SELECT DISTINCT external_id 
        FROM discovered_jobs 
        WHERE platform = ANY($1)
      `, [alert.searchCriteria.platforms || ['nhs']]);
      
      const existingJobIds = new Set(existingJobsResult.rows.map(row => row.external_id));
      
      // Count new jobs
      const allJobs = Object.values(searchResults.platforms)
        .filter(platform => platform.success)
        .flatMap(platform => platform.jobs);
      
      const newJobs = allJobs.filter(job => !existingJobIds.has(job.id));
      
      // Store new jobs in discovered_jobs table
      for (const job of newJobs.slice(0, alert.maxResults)) {
        try {
          await db.query(`
            INSERT INTO discovered_jobs (
              id, search_id, platform, external_id, title, company, location, 
              url, description, requirements, posted_date, discovered_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
            ON CONFLICT (external_id, platform) DO NOTHING
          `, [
            nanoid(),
            searchResults.searchId,
            job.platform,
            job.id,
            job.title,
            job.company,
            job.location,
            job.url,
            job.description,
            job.requirements ? JSON.stringify(job.requirements) : null,
            job.postedDate ? new Date(job.postedDate) : null
          ]);
        } catch (error) {
          console.warn('Failed to store discovered job:', job.id, error);
        }
      }
      
      // Update alert last run time and next run time
      await db.query(`
        UPDATE saved_job_alerts 
        SET last_run_at = $1, next_run_at = $2, results_count = $3
        WHERE id = $4
      `, [
        executedAt,
        this.calculateNextRun(alert.frequency, executedAt),
        newJobs.length,
        alertId
      ]);
      
      // Create execution record
      await db.query(`
        INSERT INTO job_alert_executions (
          id, alert_id, executed_at, jobs_found, new_jobs, status, search_results
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        executionId,
        alertId,
        executedAt,
        allJobs.length,
        newJobs.length,
        'success',
        JSON.stringify(searchResults)
      ]);
      
      return {
        id: executionId,
        alertId,
        executedAt,
        jobsFound: allJobs.length,
        newJobs: newJobs.length,
        status: 'success',
        searchResults
      };
      
    } catch (error: any) {
      console.error('Alert execution failed:', error);
      
      // Create error execution record
      await db.query(`
        INSERT INTO job_alert_executions (
          id, alert_id, executed_at, jobs_found, new_jobs, status, error_message
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `, [
        executionId,
        alertId,
        executedAt,
        0,
        0,
        'error',
        error.message
      ]);
      
      return {
        id: executionId,
        alertId,
        executedAt,
        jobsFound: 0,
        newJobs: 0,
        status: 'error',
        errorMessage: error.message
      };
    }
  }

  // =====================================================================
  // Get pending alerts for execution
  // =====================================================================
  static async getPendingAlerts(): Promise<JobAlert[]> {
    const result = await db.query(`
      SELECT * FROM saved_job_alerts 
      WHERE is_active = true 
        AND (next_run_at IS NULL OR next_run_at <= NOW())
      ORDER BY next_run_at ASC
    `);
    
    return result.rows.map(this.mapRowToAlert);
  }

  // =====================================================================
  // Get alert execution history
  // =====================================================================
  static async getAlertExecutions(alertId: string, limit = 20): Promise<AlertExecution[]> {
    const result = await db.query(`
      SELECT * FROM job_alert_executions 
      WHERE alert_id = $1 
      ORDER BY executed_at DESC 
      LIMIT $2
    `, [alertId, limit]);
    
    return result.rows.map(row => ({
      id: row.id,
      alertId: row.alert_id,
      executedAt: row.executed_at,
      jobsFound: row.jobs_found,
      newJobs: row.new_jobs,
      status: row.status,
      errorMessage: row.error_message,
      searchResults: row.search_results ? JSON.parse(row.search_results) : undefined
    }));
  }

  // =====================================================================
  // Private helper methods
  // =====================================================================
  private static mapRowToAlert(row: any): JobAlert {
    return {
      id: row.id,
      userId: row.user_id,
      name: row.name,
      searchCriteria: JSON.parse(row.search_criteria),
      frequency: row.frequency,
      emailNotifications: row.email_notifications,
      isActive: row.is_active,
      maxResults: row.max_results || 20,
      lastRunAt: row.last_run_at,
      nextRunAt: row.next_run_at,
      resultsCount: row.results_count || 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private static calculateNextRun(frequency: string, fromDate = new Date()): Date {
    const nextRun = new Date(fromDate);
    
    switch (frequency) {
      case 'immediate':
        nextRun.setMinutes(nextRun.getMinutes() + 5);
        break;
      case 'daily':
        nextRun.setDate(nextRun.getDate() + 1);
        nextRun.setHours(9, 0, 0, 0); // 9 AM next day
        break;
      case 'weekly':
        nextRun.setDate(nextRun.getDate() + 7);
        nextRun.setHours(9, 0, 0, 0);
        break;
      case 'monthly':
        nextRun.setMonth(nextRun.getMonth() + 1);
        nextRun.setHours(9, 0, 0, 0);
        break;
      default:
        nextRun.setDate(nextRun.getDate() + 1);
    }
    
    return nextRun;
  }
}
