import { db } from '../db';
import { nanoid } from 'nanoid';

export interface JobRecommendation {
  jobId: string;
  title: string;
  company: string;
  location?: string;
  platform: string;
  matchScore: number;
  matchReasons: string[];
  url: string;
  salary?: string;
  postedDate?: Date;
  isApplied: boolean;
}

export interface RecommendationCriteria {
  userId: string;
  limit?: number;
  minMatchScore?: number;
  excludeApplied?: boolean;
  platforms?: string[];
}

export class JobRecommendationService {
  /**
   * Get personalized job recommendations for a user
   * Uses profile data, search history, and vector similarity
   */
  static async getPersonalizedRecommendations(
    criteria: RecommendationCriteria
  ): Promise<JobRecommendation[]> {
    const {
      userId,
      limit = 20,
      minMatchScore = 0.3,
      excludeApplied = true,
      platforms = ['nhs', 'indeed', 'reed']
    } = criteria;

    try {
      // First try vector-based recommendations if embeddings are available
      const vectorRecommendations = await this.getVectorBasedRecommendations(
        userId,
        limit,
        minMatchScore,
        excludeApplied,
        platforms
      );

      if (vectorRecommendations.length > 0) {
        return vectorRecommendations;
      }

      // Fall back to criteria-based recommendations
      return await this.getCriteriaBasedRecommendations(
        userId,
        limit,
        minMatchScore,
        excludeApplied,
        platforms
      );

    } catch (error) {
      console.error('Error getting personalized recommendations:', error);
      return [];
    }
  }

  /**
   * Get recommendations using vector similarity (pgvector)
   */
  private static async getVectorBasedRecommendations(
    userId: string,
    limit: number,
    minMatchScore: number,
    excludeApplied: boolean,
    platforms: string[]
  ): Promise<JobRecommendation[]> {
    const query = `
      WITH user_profile AS (
        SELECT embedding 
        FROM user_profiles 
        WHERE user_id = $1 AND embedding IS NOT NULL
      ),
      job_matches AS (
        SELECT 
          dj.external_id as job_id,
          dj.title,
          dj.company,
          dj.location,
          dj.platform,
          dj.url,
          dj.salary_min,
          dj.salary_max,
          dj.posted_date,
          1 - (up.embedding <=> dj.embedding) AS match_score,
          dj.is_applied,
          ROW_NUMBER() OVER (ORDER BY up.embedding <=> dj.embedding ASC) as rank
        FROM discovered_jobs dj
        CROSS JOIN user_profile up
        WHERE dj.embedding IS NOT NULL
          AND dj.platform = ANY($2)
          AND dj.discovered_at > NOW() - INTERVAL '90 days'
          ${excludeApplied ? 'AND dj.is_applied = false' : ''}
          AND (1 - (up.embedding <=> dj.embedding)) >= $3
      )
      SELECT 
        job_id,
        title,
        company,
        location,
        platform,
        url,
        CASE 
          WHEN salary_min IS NOT NULL AND salary_max IS NOT NULL 
          THEN salary_min || ' - ' || salary_max
          WHEN salary_min IS NOT NULL 
          THEN 'From ' || salary_min
          ELSE NULL 
        END as salary,
        posted_date,
        match_score,
        is_applied
      FROM job_matches
      WHERE rank <= $4
      ORDER BY match_score DESC
    `;

    const result = await db.query(query, [userId, platforms, minMatchScore, limit]);
    
    return result.rows.map(row => ({
      jobId: row.job_id,
      title: row.title,
      company: row.company,
      location: row.location,
      platform: row.platform,
      matchScore: parseFloat(row.match_score),
      matchReasons: ['Profile similarity'], // Would be enhanced with actual analysis
      url: row.url,
      salary: row.salary,
      postedDate: row.posted_date,
      isApplied: row.is_applied
    }));
  }

  /**
   * Get recommendations based on user profile criteria and search history
   */
  private static async getCriteriaBasedRecommendations(
    userId: string,
    limit: number,
    minMatchScore: number,
    excludeApplied: boolean,
    platforms: string[]
  ): Promise<JobRecommendation[]> {
    // Get user's profile preferences
    const profileQuery = `
      SELECT 
        preferred_job_titles,
        preferred_locations,
        salary_expectations,
        skills
      FROM user_profiles 
      WHERE user_id = $1
    `;
    
    const profileResult = await db.query(profileQuery, [userId]);
    
    if (profileResult.rows.length === 0) {
      return await this.getPopularRecommendations(limit, platforms, excludeApplied);
    }

    const profile = profileResult.rows[0];
    
    // Get recent search history for additional context
    const searchHistoryQuery = `
      SELECT search_criteria
      FROM job_searches 
      WHERE user_id = $1 
      ORDER BY created_at DESC 
      LIMIT 5
    `;
    
    const searchHistory = await db.query(searchHistoryQuery, [userId]);
    
    // Extract keywords from profile and search history
    const keywords = this.extractKeywords(profile, searchHistory.rows);
    
    // Find matching jobs using full-text search and trigram similarity
    const jobsQuery = `
      WITH scored_jobs AS (
        SELECT 
          dj.external_id as job_id,
          dj.title,
          dj.company,
          dj.location,
          dj.platform,
          dj.url,
          dj.salary_min,
          dj.salary_max,
          dj.posted_date,
          dj.is_applied,
          -- FTS score
          COALESCE(ts_rank(dj.fts, plainto_tsquery('english', $1)), 0) * 0.4 as fts_score,
          -- Title similarity score
          COALESCE(similarity(dj.title, $2), 0) * 0.3 as title_score,
          -- Location match score
          CASE 
            WHEN $3 IS NOT NULL AND dj.location IS NOT NULL 
            THEN similarity(dj.location, $3) * 0.2
            ELSE 0.1
          END as location_score,
          -- Recency score (newer jobs get higher score)
          CASE 
            WHEN dj.posted_date > NOW() - INTERVAL '7 days' THEN 0.1
            WHEN dj.posted_date > NOW() - INTERVAL '30 days' THEN 0.05
            ELSE 0
          END as recency_score
        FROM discovered_jobs dj
        WHERE dj.platform = ANY($4)
          AND dj.discovered_at > NOW() - INTERVAL '60 days'
          ${excludeApplied ? 'AND dj.is_applied = false' : ''}
          AND (
            dj.fts @@ plainto_tsquery('english', $1)
            OR similarity(dj.title, $2) > 0.3
            OR ($3 IS NOT NULL AND similarity(dj.location, $3) > 0.5)
          )
      )
      SELECT 
        job_id,
        title,
        company,
        location,
        platform,
        url,
        CASE 
          WHEN salary_min IS NOT NULL AND salary_max IS NOT NULL 
          THEN salary_min || ' - ' || salary_max
          WHEN salary_min IS NOT NULL 
          THEN 'From ' || salary_min
          ELSE NULL 
        END as salary,
        posted_date,
        (fts_score + title_score + location_score + recency_score) as match_score,
        is_applied
      FROM scored_jobs
      WHERE (fts_score + title_score + location_score + recency_score) >= $5
      ORDER BY match_score DESC
      LIMIT $6
    `;

    const preferredLocation = profile.preferred_locations?.[0] || null;
    const titleKeywords = keywords.titles.join(' ');
    const allKeywords = keywords.all.join(' ');

    const result = await db.query(jobsQuery, [
      allKeywords,
      titleKeywords,
      preferredLocation,
      platforms,
      minMatchScore,
      limit
    ]);

    return result.rows.map(row => ({
      jobId: row.job_id,
      title: row.title,
      company: row.company,
      location: row.location,
      platform: row.platform,
      matchScore: parseFloat(row.match_score),
      matchReasons: this.generateMatchReasons(row, keywords),
      url: row.url,
      salary: row.salary,
      postedDate: row.posted_date,
      isApplied: row.is_applied
    }));
  }

  /**
   * Get popular/trending job recommendations when no profile data is available
   */
  private static async getPopularRecommendations(
    limit: number,
    platforms: string[],
    excludeApplied: boolean
  ): Promise<JobRecommendation[]> {
    const query = `
      SELECT 
        dj.external_id as job_id,
        dj.title,
        dj.company,
        dj.location,
        dj.platform,
        dj.url,
        CASE 
          WHEN dj.salary_min IS NOT NULL AND dj.salary_max IS NOT NULL 
          THEN dj.salary_min || ' - ' || dj.salary_max
          WHEN dj.salary_min IS NOT NULL 
          THEN 'From ' || dj.salary_min
          ELSE NULL 
        END as salary,
        dj.posted_date,
        dj.is_applied,
        -- Simple popularity score based on how recent and how many similar jobs exist
        (
          CASE 
            WHEN dj.posted_date > NOW() - INTERVAL '7 days' THEN 0.5
            WHEN dj.posted_date > NOW() - INTERVAL '30 days' THEN 0.3
            ELSE 0.1
          END +
          (SELECT COUNT(*)::float / 100 FROM discovered_jobs dj2 
           WHERE similarity(dj2.title, dj.title) > 0.6 
             AND dj2.platform = dj.platform
             AND dj2.discovered_at > NOW() - INTERVAL '30 days')
        ) as popularity_score
      FROM discovered_jobs dj
      WHERE dj.platform = ANY($1)
        AND dj.discovered_at > NOW() - INTERVAL '30 days'
        ${excludeApplied ? 'AND dj.is_applied = false' : ''}
      ORDER BY popularity_score DESC, dj.posted_date DESC
      LIMIT $2
    `;

    const result = await db.query(query, [platforms, limit]);

    return result.rows.map(row => ({
      jobId: row.job_id,
      title: row.title,
      company: row.company,
      location: row.location,
      platform: row.platform,
      matchScore: parseFloat(row.popularity_score),
      matchReasons: ['Popular job', 'Recent posting'],
      url: row.url,
      salary: row.salary,
      postedDate: row.posted_date,
      isApplied: row.is_applied
    }));
  }

  /**
   * Extract keywords from user profile and search history
   */
  private static extractKeywords(profile: any, searchHistory: any[]): {
    titles: string[];
    skills: string[];
    all: string[];
  } {
    const titles = profile.preferred_job_titles || [];
    const skills = profile.skills || [];
    
    // Extract keywords from search history
    const searchKeywords: string[] = [];
    searchHistory.forEach(search => {
      if (search.search_criteria?.keywords) {
        searchKeywords.push(search.search_criteria.keywords);
      }
    });

    return {
      titles,
      skills,
      all: [...titles, ...skills, ...searchKeywords]
    };
  }

  /**
   * Generate match reasons based on what matched
   */
  private static generateMatchReasons(job: any, keywords: any): string[] {
    const reasons: string[] = [];
    
    // Check title matches
    const titleLower = job.title.toLowerCase();
    keywords.titles.forEach((title: string) => {
      if (titleLower.includes(title.toLowerCase())) {
        reasons.push(`Matches your preferred job title: ${title}`);
      }
    });

    // Check skill matches
    keywords.skills.forEach((skill: string) => {
      if (titleLower.includes(skill.toLowerCase())) {
        reasons.push(`Requires your skill: ${skill}`);
      }
    });

    // Add default reasons if none found
    if (reasons.length === 0) {
      reasons.push('Matches your search criteria');
    }

    return reasons.slice(0, 3); // Limit to 3 reasons
  }

  /**
   * Record user feedback on recommendations (for ML training)
   */
  static async recordRecommendationFeedback(
    userId: string,
    jobId: string,
    platform: string,
    feedback: -1 | 0 | 1, // -1: not interested, 0: neutral, 1: interested
    matchScore?: number
  ): Promise<void> {
    const query = `
      INSERT INTO recommendation_feedback (
        id, user_id, job_id, platform, feedback, match_score, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (user_id, job_id, platform) 
      DO UPDATE SET 
        feedback = EXCLUDED.feedback,
        match_score = EXCLUDED.match_score,
        updated_at = NOW()
    `;

    await db.query(query, [
      nanoid(),
      userId,
      jobId,
      platform,
      feedback,
      matchScore
    ]);
  }

  /**
   * Get recommendation performance analytics
   */
  static async getRecommendationAnalytics(userId: string): Promise<{
    totalRecommendations: number;
    clickedRecommendations: number;
    averageMatchScore: number;
    topMatchReasons: string[];
  }> {
    const analyticsQuery = `
      WITH user_recommendations AS (
        -- This would be from a recommendations log table in a full implementation
        SELECT 1 as total_recs, 0.75 as avg_score
      )
      SELECT 
        total_recs as total_recommendations,
        0 as clicked_recommendations, -- Would come from actual tracking
        avg_score as average_match_score
      FROM user_recommendations
    `;

    const result = await db.query(analyticsQuery, [userId]);
    
    return {
      totalRecommendations: result.rows[0]?.total_recommendations || 0,
      clickedRecommendations: result.rows[0]?.clicked_recommendations || 0,
      averageMatchScore: result.rows[0]?.average_match_score || 0,
      topMatchReasons: ['Profile similarity', 'Skill match', 'Location preference']
    };
  }
}
