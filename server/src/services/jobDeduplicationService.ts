import { db } from '../db';
import { JobUrlParserService } from './jobUrlParser';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  duplicateJobs: Array<{
    id: string;
    matchType: 'canonical_url' | 'platform_id' | 'trigram' | 'text_signature';
    similarity?: number;
    details: {
      title: string;
      company: string;
      location?: string;
      createdAt: Date;
    };
  }>;
  suggestions?: Array<{
    id: string;
    similarity: number;
    title: string;
    company: string;
  }>;
}

export interface JobDeduplicationData {
  title: string;
  company: string;
  location?: string;
  url?: string;
  description?: string;
}

export class JobDeduplicationService {
  /**
   * Check for duplicate jobs using multiple strategies
   */
  static async checkForDuplicates(
    jobData: JobDeduplicationData,
    options: {
      strictMode?: boolean;
      similarityThreshold?: number;
      maxAgeDays?: number;
    } = {}
  ): Promise<DuplicateCheckResult> {
    const {
      strictMode = false,
      similarityThreshold = 0.6,
      maxAgeDays = 120
    } = options;

    const duplicateJobs: DuplicateCheckResult['duplicateJobs'] = [];
    const suggestions: DuplicateCheckResult['suggestions'] = [];

    try {
      // 1. URL-based deduplication (most reliable)
      if (jobData.url) {
        const urlDuplicates = await this.findUrlDuplicates(jobData.url);
        duplicateJobs.push(...urlDuplicates);
      }

      // 2. Text signature deduplication (exact text match)
      const textSigDuplicates = await this.findTextSignatureDuplicates(jobData);
      duplicateJobs.push(...textSigDuplicates);

      // 3. Trigram similarity deduplication (fuzzy matching)
      if (!strictMode || duplicateJobs.length === 0) {
        const similarJobs = await this.findSimilarJobs(
          jobData,
          similarityThreshold,
          maxAgeDays
        );
        
        // Separate high-confidence matches from suggestions
        similarJobs.forEach(job => {
          if (job.similarity >= 0.8) {
            duplicateJobs.push(job);
          } else if (job.similarity >= 0.6) {
            suggestions.push({
              id: job.id,
              similarity: job.similarity,
              title: job.details.title,
              company: job.details.company
            });
          }
        });
      }

      return {
        isDuplicate: duplicateJobs.length > 0,
        duplicateJobs: this.removeDuplicateMatches(duplicateJobs),
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };

    } catch (error) {
      console.error('Error checking for duplicates:', error);
      return {
        isDuplicate: false,
        duplicateJobs: []
      };
    }
  }

  /**
   * Find duplicates by canonical URL and platform ID
   */
  private static async findUrlDuplicates(url: string): Promise<DuplicateCheckResult['duplicateJobs']> {
    const { canonicalUrl, platformId } = JobUrlParserService.canonicalizeJobUrl(url);
    
    const query = `
      SELECT 
        id,
        title,
        company,
        location,
        created_at,
        CASE 
          WHEN canonical_url = $1 THEN 'canonical_url'
          WHEN platform_id = $2 THEN 'platform_id'
        END as match_type
      FROM jobs
      WHERE (canonical_url = $1 AND canonical_url IS NOT NULL)
         OR (platform_id = $2 AND platform_id IS NOT NULL)
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [canonicalUrl, platformId]);
    
    return result.rows.map(row => ({
      id: row.id,
      matchType: row.match_type as 'canonical_url' | 'platform_id',
      details: {
        title: row.title,
        company: row.company,
        location: row.location,
        createdAt: row.created_at
      }
    }));
  }

  /**
   * Find duplicates by text signature (exact match)
   */
  private static async findTextSignatureDuplicates(
    jobData: JobDeduplicationData
  ): Promise<DuplicateCheckResult['duplicateJobs']> {
    const textSignature = JobUrlParserService.generateJobSignature(jobData);
    
    const query = `
      SELECT id, title, company, location, created_at
      FROM jobs
      WHERE text_signature = $1
      ORDER BY created_at DESC
    `;

    const result = await db.query(query, [textSignature]);
    
    return result.rows.map(row => ({
      id: row.id,
      matchType: 'text_signature' as const,
      details: {
        title: row.title,
        company: row.company,
        location: row.location,
        createdAt: row.created_at
      }
    }));
  }

  /**
   * Find similar jobs using trigram similarity
   */
  private static async findSimilarJobs(
    jobData: JobDeduplicationData,
    threshold: number,
    maxAgeDays: number
  ): Promise<Array<DuplicateCheckResult['duplicateJobs'][0] & { similarity: number }>> {
    const query = `
      SELECT 
        j.id,
        j.title,
        j.company,
        j.location,
        j.created_at,
        similarity(j.title || ' ' || j.company || ' ' || COALESCE(j.location,''), $1) AS similarity_score
      FROM jobs j
      WHERE j.created_at > NOW() - INTERVAL '%d days'
        AND similarity(j.title || ' ' || j.company || ' ' || COALESCE(j.location,''), $1) > $2
      ORDER BY similarity_score DESC, j.created_at DESC
      LIMIT 10
    `;

    const searchText = [jobData.title, jobData.company, jobData.location]
      .filter(Boolean)
      .join(' ');

    const formattedQuery = query.replace('%d', maxAgeDays.toString());
    const result = await db.query(formattedQuery, [searchText, threshold]);
    
    return result.rows.map(row => ({
      id: row.id,
      matchType: 'trigram' as const,
      similarity: parseFloat(row.similarity_score),
      details: {
        title: row.title,
        company: row.company,
        location: row.location,
        createdAt: row.created_at
      }
    }));
  }

  /**
   * Remove duplicate entries from the matches array
   */
  private static removeDuplicateMatches(
    matches: DuplicateCheckResult['duplicateJobs']
  ): DuplicateCheckResult['duplicateJobs'] {
    const seen = new Set<string>();
    return matches.filter(match => {
      if (seen.has(match.id)) {
        return false;
      }
      seen.add(match.id);
      return true;
    });
  }

  /**
   * Generate analytics about duplicate detection performance
   */
  static async getDuplicationStats(): Promise<{
    totalJobs: number;
    jobsWithUrls: number;
    jobsWithPlatformIds: number;
    potentialDuplicateGroups: number;
    recentDuplicatesFound: number;
  }> {
    const queries = await Promise.all([
      // Total jobs
      db.query('SELECT COUNT(*) as count FROM jobs'),
      
      // Jobs with canonical URLs
      db.query('SELECT COUNT(*) as count FROM jobs WHERE canonical_url IS NOT NULL'),
      
      // Jobs with platform IDs
      db.query('SELECT COUNT(*) as count FROM jobs WHERE platform_id IS NOT NULL'),
      
      // Potential duplicate groups (same text signature)
      db.query(`
        SELECT COUNT(*) as count 
        FROM (
          SELECT text_signature 
          FROM jobs 
          WHERE text_signature IS NOT NULL 
          GROUP BY text_signature 
          HAVING COUNT(*) > 1
        ) duplicate_groups
      `),
      
      // Recent duplicates found (last 7 days)
      db.query(`
        SELECT COUNT(*) as count
        FROM jobs j1
        WHERE j1.created_at > NOW() - INTERVAL '7 days'
          AND EXISTS (
            SELECT 1 FROM jobs j2 
            WHERE j2.id != j1.id 
              AND (
                (j2.canonical_url = j1.canonical_url AND j1.canonical_url IS NOT NULL)
                OR (j2.platform_id = j1.platform_id AND j1.platform_id IS NOT NULL)
                OR (j2.text_signature = j1.text_signature AND j1.text_signature IS NOT NULL)
              )
          )
      `)
    ]);

    return {
      totalJobs: parseInt(queries[0].rows[0].count),
      jobsWithUrls: parseInt(queries[1].rows[0].count),
      jobsWithPlatformIds: parseInt(queries[2].rows[0].count),
      potentialDuplicateGroups: parseInt(queries[3].rows[0].count),
      recentDuplicatesFound: parseInt(queries[4].rows[0].count)
    };
  }

  /**
   * Update job with deduplication metadata
   */
  static async updateJobDeduplicationData(
    jobId: string,
    url?: string,
    title?: string,
    company?: string,
    location?: string
  ): Promise<void> {
    const updates: string[] = [];
    const values: any[] = [jobId];
    let paramCount = 1;

    // Generate canonical URL and platform ID if URL provided
    if (url) {
      const { canonicalUrl, platformId } = JobUrlParserService.canonicalizeJobUrl(url);
      updates.push(`canonical_url = $${++paramCount}`);
      values.push(canonicalUrl);
      
      if (platformId) {
        updates.push(`platform_id = $${++paramCount}`);
        values.push(platformId);
      }
    }

    // Generate text signature if we have the required fields
    if (title && company) {
      const textSignature = JobUrlParserService.generateJobSignature({
        title,
        company,
        location
      });
      updates.push(`text_signature = $${++paramCount}`);
      values.push(textSignature);
    }

    if (updates.length > 0) {
      const query = `
        UPDATE jobs 
        SET ${updates.join(', ')}, updated_at = NOW()
        WHERE id = $1
      `;
      
      await db.query(query, values);
    }
  }
}
