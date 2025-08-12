-- Enable pg_trgm extension for trigram matching and similarity
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Create a simple nanoid-like function for generating IDs
CREATE OR REPLACE FUNCTION nanoid(size int DEFAULT 21)
RETURNS text AS $$
DECLARE
    alphabet text := '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    idBuilder text := '';
    i int := 0;
    bytes bytea;
    alphabetIndex int;
    mask int;
BEGIN
    mask := (1 << 6) - 1;
    bytes := gen_random_bytes(size);
    
    WHILE i < size LOOP
        alphabetIndex := (get_byte(bytes, i % length(bytes)) & mask) + 1;
        IF alphabetIndex <= length(alphabet) THEN
            idBuilder := idBuilder || substr(alphabet, alphabetIndex, 1);
            i := i + 1;
        END IF;
    END LOOP;
    
    RETURN idBuilder;
END
$$ LANGUAGE plpgsql;

-- Add trigram indexes to existing jobs table for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_jobs_title_trgm ON jobs USING gin (title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_company_trgm ON jobs USING gin (company gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_description_trgm ON jobs USING gin (description gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_jobs_location_trgm ON jobs USING gin (location gin_trgm_ops);

-- Add canonical_url and job_signature columns to jobs table for deduplication
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS canonical_url TEXT,
ADD COLUMN IF NOT EXISTS job_signature TEXT,
ADD COLUMN IF NOT EXISTS embedding_vector TEXT; -- Store as TEXT for now since pgvector not available

-- Create unique index on canonical_url for URL-based deduplication
CREATE UNIQUE INDEX IF NOT EXISTS idx_jobs_canonical_url ON jobs (canonical_url) WHERE canonical_url IS NOT NULL;

-- Create index on job_signature for signature-based deduplication
CREATE INDEX IF NOT EXISTS idx_jobs_signature ON jobs (job_signature) WHERE job_signature IS NOT NULL;

-- Create enhanced_job_alerts table first
CREATE TABLE IF NOT EXISTS enhanced_job_alerts (
    id TEXT PRIMARY KEY DEFAULT nanoid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    search_criteria JSONB NOT NULL,
    filters JSONB,
    is_active BOOLEAN DEFAULT true,
    frequency TEXT DEFAULT 'daily' CHECK (frequency IN ('manual', 'daily', 'weekly', 'monthly')),
    last_run_at TIMESTAMP,
    next_run_at TIMESTAMP,
    last_results_count INTEGER DEFAULT 0,
    total_alerts_sent INTEGER DEFAULT 0,
    email_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add search tracking table for analytics
CREATE TABLE IF NOT EXISTS job_search_history (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    search_query JSONB NOT NULL,
    search_filters JSONB,
    results_count INTEGER DEFAULT 0,
    clicked_jobs INTEGER[] DEFAULT '{}',
    search_timestamp TIMESTAMP DEFAULT NOW(),
    session_id TEXT,
    source_platform TEXT
);

-- Create indexes for search history
CREATE INDEX IF NOT EXISTS idx_search_history_user ON job_search_history (user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_timestamp ON job_search_history (search_timestamp);
CREATE INDEX IF NOT EXISTS idx_search_history_session ON job_search_history (session_id);

-- Add GIN index for JSONB search queries
CREATE INDEX IF NOT EXISTS idx_search_history_query_gin ON job_search_history USING gin (search_query);

-- Create job alert results tracking table
CREATE TABLE IF NOT EXISTS job_alert_results (
    id SERIAL PRIMARY KEY,
    alert_id TEXT REFERENCES enhanced_job_alerts(id) ON DELETE CASCADE,
    run_timestamp TIMESTAMP DEFAULT NOW(),
    jobs_found INTEGER DEFAULT 0,
    new_jobs_count INTEGER DEFAULT 0,
    jobs_sent INTEGER DEFAULT 0,
    execution_time_ms INTEGER,
    status TEXT DEFAULT 'completed', -- completed, failed, partial
    error_message TEXT,
    jobs_data JSONB -- Store job details for this alert run
);

-- Create indexes for alert results
CREATE INDEX IF NOT EXISTS idx_alert_results_alert_id ON job_alert_results (alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_results_timestamp ON job_alert_results (run_timestamp);
CREATE INDEX IF NOT EXISTS idx_alert_results_status ON job_alert_results (status);

-- Update enhanced_job_alerts to ensure compatibility with new service (table should exist now)
-- Note: Table was created above, so these columns should already exist

-- Create function to calculate job similarity using trigrams
CREATE OR REPLACE FUNCTION calculate_job_similarity(
    title1 TEXT, 
    company1 TEXT, 
    location1 TEXT,
    title2 TEXT, 
    company2 TEXT, 
    location2 TEXT
) RETURNS FLOAT AS $$
BEGIN
    RETURN (
        GREATEST(similarity(title1, title2), 0) * 0.5 +
        GREATEST(similarity(company1, company2), 0) * 0.3 +
        GREATEST(similarity(COALESCE(location1, ''), COALESCE(location2, '')), 0) * 0.2
    );
END;
$$ LANGUAGE plpgsql;

-- Create function to find similar jobs using trigrams
DROP FUNCTION IF EXISTS find_similar_jobs;
CREATE OR REPLACE FUNCTION find_similar_jobs(
    p_title TEXT,
    p_company TEXT,
    p_location TEXT DEFAULT NULL,
    p_threshold FLOAT DEFAULT 0.6,
    p_limit INTEGER DEFAULT 10
) RETURNS TABLE (
    job_id INTEGER,
    similarity_score FLOAT,
    title TEXT,
    company TEXT,
    location TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        j.id,
        calculate_job_similarity(p_title, p_company, p_location, j.title, j.company, j.location) as sim_score,
        j.title,
        j.company,
        j.location
    FROM jobs j
    WHERE calculate_job_similarity(p_title, p_company, p_location, j.title, j.company, j.location) >= p_threshold
    ORDER BY sim_score DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Add full-text search to jobs table
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION update_job_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(NEW.company, '')), 'B') ||
                        setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'C') ||
                        setweight(to_tsvector('english', COALESCE(NEW.location, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update search vector
DROP TRIGGER IF EXISTS update_jobs_search_vector ON jobs;
CREATE TRIGGER update_jobs_search_vector
    BEFORE INSERT OR UPDATE ON jobs
    FOR EACH ROW EXECUTE FUNCTION update_job_search_vector();

-- Create GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_jobs_search_vector ON jobs USING gin (search_vector);

-- Update existing jobs to populate search vector
UPDATE jobs SET search_vector = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(company, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(description, '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(location, '')), 'D')
WHERE search_vector IS NULL;

-- Create analytics view for job alert performance
CREATE OR REPLACE VIEW job_alert_analytics AS
SELECT 
    ea.id as alert_id,
    ea.name as alert_name,
    ea.user_id,
    ea.frequency,
    ea.is_active,
    ea.created_at,
    COUNT(ar.id) as total_runs,
    SUM(ar.jobs_found) as total_jobs_found,
    SUM(ar.new_jobs_count) as total_new_jobs,
    AVG(ar.execution_time_ms) as avg_execution_time,
    MAX(ar.run_timestamp) as last_run,
    COUNT(CASE WHEN ar.status = 'failed' THEN 1 END) as failed_runs
FROM enhanced_job_alerts ea
LEFT JOIN job_alert_results ar ON ea.id = ar.alert_id
GROUP BY ea.id, ea.name, ea.user_id, ea.frequency, ea.is_active, ea.created_at;

-- Create index on jobs URL for deduplication
CREATE INDEX IF NOT EXISTS idx_jobs_url ON jobs (url);

-- Add comments for documentation
COMMENT ON TABLE job_search_history IS 'Tracks user search queries and behavior for analytics';
COMMENT ON TABLE job_alert_results IS 'Stores results and performance metrics for job alert executions';
COMMENT ON FUNCTION calculate_job_similarity IS 'Calculates similarity score between two jobs using trigram matching';
COMMENT ON FUNCTION find_similar_jobs IS 'Finds jobs similar to given criteria using trigram similarity';
