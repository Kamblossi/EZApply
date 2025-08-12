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
exports.JobDeduplicationService = void 0;
const db_1 = require("../db");
const jobUrlParser_1 = require("./jobUrlParser");
class JobDeduplicationService {
    /**
     * Check for duplicate jobs using multiple strategies
     */
    static checkForDuplicates(jobData_1) {
        return __awaiter(this, arguments, void 0, function* (jobData, options = {}) {
            const { strictMode = false, similarityThreshold = 0.6, maxAgeDays = 120 } = options;
            const duplicateJobs = [];
            const suggestions = [];
            try {
                // 1. URL-based deduplication (most reliable)
                if (jobData.url) {
                    const urlDuplicates = yield this.findUrlDuplicates(jobData.url);
                    duplicateJobs.push(...urlDuplicates);
                }
                // 2. Text signature deduplication (exact text match)
                const textSigDuplicates = yield this.findTextSignatureDuplicates(jobData);
                duplicateJobs.push(...textSigDuplicates);
                // 3. Trigram similarity deduplication (fuzzy matching)
                if (!strictMode || duplicateJobs.length === 0) {
                    const similarJobs = yield this.findSimilarJobs(jobData, similarityThreshold, maxAgeDays);
                    // Separate high-confidence matches from suggestions
                    similarJobs.forEach(job => {
                        if (job.similarity >= 0.8) {
                            duplicateJobs.push(job);
                        }
                        else if (job.similarity >= 0.6) {
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
            }
            catch (error) {
                console.error('Error checking for duplicates:', error);
                return {
                    isDuplicate: false,
                    duplicateJobs: []
                };
            }
        });
    }
    /**
     * Find duplicates by canonical URL and platform ID
     */
    static findUrlDuplicates(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const { canonicalUrl, platformId } = jobUrlParser_1.JobUrlParserService.canonicalizeJobUrl(url);
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
            const result = yield db_1.db.query(query, [canonicalUrl, platformId]);
            return result.rows.map(row => ({
                id: row.id,
                matchType: row.match_type,
                details: {
                    title: row.title,
                    company: row.company,
                    location: row.location,
                    createdAt: row.created_at
                }
            }));
        });
    }
    /**
     * Find duplicates by text signature (exact match)
     */
    static findTextSignatureDuplicates(jobData) {
        return __awaiter(this, void 0, void 0, function* () {
            const textSignature = jobUrlParser_1.JobUrlParserService.generateJobSignature(jobData);
            const query = `
      SELECT id, title, company, location, created_at
      FROM jobs
      WHERE text_signature = $1
      ORDER BY created_at DESC
    `;
            const result = yield db_1.db.query(query, [textSignature]);
            return result.rows.map(row => ({
                id: row.id,
                matchType: 'text_signature',
                details: {
                    title: row.title,
                    company: row.company,
                    location: row.location,
                    createdAt: row.created_at
                }
            }));
        });
    }
    /**
     * Find similar jobs using trigram similarity
     */
    static findSimilarJobs(jobData, threshold, maxAgeDays) {
        return __awaiter(this, void 0, void 0, function* () {
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
            const result = yield db_1.db.query(formattedQuery, [searchText, threshold]);
            return result.rows.map(row => ({
                id: row.id,
                matchType: 'trigram',
                similarity: parseFloat(row.similarity_score),
                details: {
                    title: row.title,
                    company: row.company,
                    location: row.location,
                    createdAt: row.created_at
                }
            }));
        });
    }
    /**
     * Remove duplicate entries from the matches array
     */
    static removeDuplicateMatches(matches) {
        const seen = new Set();
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
    static getDuplicationStats() {
        return __awaiter(this, void 0, void 0, function* () {
            const queries = yield Promise.all([
                // Total jobs
                db_1.db.query('SELECT COUNT(*) as count FROM jobs'),
                // Jobs with canonical URLs
                db_1.db.query('SELECT COUNT(*) as count FROM jobs WHERE canonical_url IS NOT NULL'),
                // Jobs with platform IDs
                db_1.db.query('SELECT COUNT(*) as count FROM jobs WHERE platform_id IS NOT NULL'),
                // Potential duplicate groups (same text signature)
                db_1.db.query(`
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
                db_1.db.query(`
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
        });
    }
    /**
     * Update job with deduplication metadata
     */
    static updateJobDeduplicationData(jobId, url, title, company, location) {
        return __awaiter(this, void 0, void 0, function* () {
            const updates = [];
            const values = [jobId];
            let paramCount = 1;
            // Generate canonical URL and platform ID if URL provided
            if (url) {
                const { canonicalUrl, platformId } = jobUrlParser_1.JobUrlParserService.canonicalizeJobUrl(url);
                updates.push(`canonical_url = $${++paramCount}`);
                values.push(canonicalUrl);
                if (platformId) {
                    updates.push(`platform_id = $${++paramCount}`);
                    values.push(platformId);
                }
            }
            // Generate text signature if we have the required fields
            if (title && company) {
                const textSignature = jobUrlParser_1.JobUrlParserService.generateJobSignature({
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
                yield db_1.db.query(query, values);
            }
        });
    }
}
exports.JobDeduplicationService = JobDeduplicationService;
