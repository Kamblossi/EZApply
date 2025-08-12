-- Migration: Enable pg_trgm and enhance deduplication
-- Created: 2025-01-11
-- Purpose: Add trigram indexing and deduplication features for jobs

-- =====================================================================
-- Enable pg_trgm extension
-- =====================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================================
-- Add deduplication fields to jobs table
-- =====================================================================
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS platform_id TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS text_signature TEXT;

-- =====================================================================
-- Add deduplication fields to discovered_jobs table
-- =====================================================================
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS canonical_url TEXT;
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS text_signature TEXT;

-- =====================================================================
-- Create trigram indexes for similarity search
-- =====================================================================

-- Index for jobs table text similarity (title + company + location)
CREATE INDEX IF NOT EXISTS idx_jobs_text_trgm
ON jobs USING GIN ((title || ' ' || company || ' ' || COALESCE(location,'')) gin_trgm_ops);

-- Index for discovered_jobs table text similarity
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_text_trgm
ON discovered_jobs USING GIN ((title || ' ' || company || ' ' || COALESCE(location,'')) gin_trgm_ops);

-- Indexes for canonical URLs and platform IDs
CREATE INDEX IF NOT EXISTS idx_jobs_canonical_url ON jobs(canonical_url) WHERE canonical_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_jobs_platform_id ON jobs(platform_id) WHERE platform_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_canonical_url ON discovered_jobs(canonical_url) WHERE canonical_url IS NOT NULL;

-- Indexes for text signatures
CREATE INDEX IF NOT EXISTS idx_jobs_text_signature ON jobs(text_signature) WHERE text_signature IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_text_signature ON discovered_jobs(text_signature) WHERE text_signature IS NOT NULL;

-- =====================================================================
-- Add full-text search indexes for job content
-- =====================================================================

-- Full-text search index for jobs
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) STORED;

CREATE INDEX IF NOT EXISTS idx_jobs_fts ON jobs USING GIN (fts);

-- Full-text search index for discovered_jobs
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(description,''))) STORED;

CREATE INDEX IF NOT EXISTS idx_discovered_jobs_fts ON discovered_jobs USING GIN (fts);

-- =====================================================================
-- Create deduplication functions
-- =====================================================================

-- Function to find potential duplicate jobs using trigram similarity
CREATE OR REPLACE FUNCTION find_similar_jobs(
  job_title TEXT,
  job_company TEXT,
  job_location TEXT DEFAULT NULL,
  similarity_threshold REAL DEFAULT 0.6,
  max_age_days INTEGER DEFAULT 120
) RETURNS TABLE (
  job_id UUID,
  similarity_score REAL,
  match_type TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    j.id,
    similarity(j.title || ' ' || j.company || ' ' || COALESCE(j.location, ''), 
               job_title || ' ' || job_company || ' ' || COALESCE(job_location, '')) AS sim_score,
    'trigram'::TEXT AS match_type
  FROM jobs j
  WHERE j.created_at > NOW() - (max_age_days || ' days')::INTERVAL
    AND similarity(j.title || ' ' || j.company || ' ' || COALESCE(j.location, ''), 
                   job_title || ' ' || job_company || ' ' || COALESCE(job_location, '')) > similarity_threshold
  ORDER BY sim_score DESC
  LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to find duplicate jobs by URL or platform ID
CREATE OR REPLACE FUNCTION find_duplicate_jobs(
  canonical_url_param TEXT DEFAULT NULL,
  platform_id_param TEXT DEFAULT NULL
) RETURNS TABLE (
  job_id UUID,
  match_type TEXT
) AS $$
BEGIN
  -- Check by canonical URL first
  IF canonical_url_param IS NOT NULL THEN
    RETURN QUERY
    SELECT j.id, 'canonical_url'::TEXT
    FROM jobs j
    WHERE j.canonical_url = canonical_url_param;
  END IF;
  
  -- Check by platform ID if no URL match
  IF platform_id_param IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM jobs WHERE canonical_url = canonical_url_param
  ) THEN
    RETURN QUERY
    SELECT j.id, 'platform_id'::TEXT
    FROM jobs j
    WHERE j.platform_id = platform_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- Create search history enhancement table
-- =====================================================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id VARCHAR(21) PRIMARY KEY DEFAULT '',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_query TEXT NOT NULL,
    search_type VARCHAR(50) DEFAULT 'keyword', -- keyword, fts, similarity
    results_count INTEGER DEFAULT 0,
    clicked_jobs TEXT[], -- Array of job IDs that were clicked
    search_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    session_id VARCHAR(255),
    
    -- Index for fast lookups
    CONSTRAINT search_analytics_user_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for search analytics
CREATE INDEX IF NOT EXISTS idx_search_analytics_user_id ON search_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_search_analytics_timestamp ON search_analytics(search_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_search_analytics_query ON search_analytics USING gin(to_tsvector('english', search_query));

-- =====================================================================
-- Job recommendations table with vector similarity
-- =====================================================================
-- Note: Assumes pgvector is already enabled from previous migrations

-- Add embedding column to jobs for ML-based recommendations
-- TODO: Enable when pgvector extension is available
-- ALTER TABLE jobs ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Add embedding column to discovered_jobs
-- TODO: Enable when pgvector extension is available
-- ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Create indexes for vector similarity (when embeddings are populated)
-- These will be created later when we have embeddings
-- CREATE INDEX IF NOT EXISTS idx_jobs_embedding ON jobs USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX IF NOT EXISTS idx_discovered_jobs_embedding ON discovered_jobs USING ivfflat (embedding vector_cosine_ops);

-- =====================================================================
-- Enhanced job alerts table
-- =====================================================================
CREATE TABLE IF NOT EXISTS enhanced_job_alerts (
    id VARCHAR(21) PRIMARY KEY DEFAULT '',
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_criteria JSONB NOT NULL,
    filters JSONB, -- Additional filters (salary, location radius, etc.)
    is_active BOOLEAN DEFAULT TRUE,
    frequency VARCHAR(20) DEFAULT 'daily', -- manual, daily, weekly, monthly
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    last_results_count INTEGER DEFAULT 0,
    total_alerts_sent INTEGER DEFAULT 0,
    email_enabled BOOLEAN DEFAULT TRUE,
    push_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT enhanced_job_alerts_user_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for enhanced job alerts
CREATE INDEX IF NOT EXISTS idx_enhanced_job_alerts_user_id ON enhanced_job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_enhanced_job_alerts_active ON enhanced_job_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_enhanced_job_alerts_next_run ON enhanced_job_alerts(next_run_at) WHERE is_active = TRUE;

-- =====================================================================
-- Update existing job_searches table for better analytics
-- =====================================================================
ALTER TABLE job_searches ADD COLUMN IF NOT EXISTS filters_applied JSONB;
ALTER TABLE job_searches ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE job_searches ADD COLUMN IF NOT EXISTS ip_address INET;

-- =====================================================================
-- Create trigger for updating timestamps
-- =====================================================================
DROP TRIGGER IF EXISTS update_enhanced_job_alerts_updated_at ON enhanced_job_alerts;
CREATE TRIGGER update_enhanced_job_alerts_updated_at 
    BEFORE UPDATE ON enhanced_job_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- Create views for analytics and reporting
-- =====================================================================

-- Popular search terms view
CREATE OR REPLACE VIEW popular_search_terms AS
SELECT 
    search_query,
    COUNT(*) as search_count,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(results_count) as avg_results,
    MAX(search_timestamp) as last_searched
FROM search_analytics
WHERE search_timestamp > NOW() - INTERVAL '30 days'
GROUP BY search_query
HAVING COUNT(*) > 1
ORDER BY search_count DESC;

-- User search behavior view
CREATE OR REPLACE VIEW user_search_behavior AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(sa.id) as total_searches,
    COUNT(DISTINCT DATE(sa.search_timestamp)) as active_days,
    AVG(sa.results_count) as avg_results_per_search,
    MAX(sa.search_timestamp) as last_search,
    COUNT(CASE WHEN array_length(sa.clicked_jobs, 1) > 0 THEN 1 END) as searches_with_clicks
FROM users u
LEFT JOIN search_analytics sa ON u.id = sa.user_id
WHERE sa.search_timestamp > NOW() - INTERVAL '90 days' OR sa.search_timestamp IS NULL
GROUP BY u.id, u.email;

-- =====================================================================
-- Sample data and performance notes
-- =====================================================================

-- Grant permissions (uncomment in production)
-- GRANT USAGE ON SCHEMA public TO ezapply_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ezapply_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ezapply_user;

-- Performance notes:
-- 1. Trigram indexes work best with similarity threshold >= 0.3
-- 2. For large datasets, consider partitioning search_analytics by month
-- 3. Vector indexes (ivfflat) should be created after populating embeddings
-- 4. Monitor pg_trgm.similarity_threshold setting (default 0.3)

COMMENT ON EXTENSION pg_trgm IS 'Trigram similarity for fuzzy string matching';
COMMENT ON FUNCTION find_similar_jobs IS 'Find potentially duplicate jobs using trigram similarity';
COMMENT ON FUNCTION find_duplicate_jobs IS 'Find exact duplicate jobs by URL or platform ID';
