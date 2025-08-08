-- Migration: Create job discovery tables
-- Created: 2024-12-28
-- Purpose: Support automated job discovery features

-- =====================================================================
-- Table: job_searches
-- Purpose: Track user search history and criteria
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_searches (
    id VARCHAR(21) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    search_criteria JSONB NOT NULL,
    results_count INTEGER DEFAULT 0,
    platform VARCHAR(50) NOT NULL DEFAULT 'NHS',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job_searches
CREATE INDEX IF NOT EXISTS idx_job_searches_user_id ON job_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_job_searches_platform ON job_searches(platform);
CREATE INDEX IF NOT EXISTS idx_job_searches_created_at ON job_searches(created_at DESC);

-- =====================================================================
-- Table: discovered_jobs  
-- Purpose: Cache discovered jobs from various platforms
-- =====================================================================
CREATE TABLE IF NOT EXISTS discovered_jobs (
    id VARCHAR(21) PRIMARY KEY DEFAULT '',
    search_id VARCHAR(21) NOT NULL REFERENCES job_searches(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    title VARCHAR(500) NOT NULL,
    company VARCHAR(255) NOT NULL,
    location VARCHAR(255),
    url TEXT NOT NULL,
    salary_min INTEGER,
    salary_max INTEGER,
    description TEXT,
    requirements JSONB,
    posted_date DATE,
    deadline_date DATE,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_applied BOOLEAN DEFAULT FALSE,
    
    -- Ensure uniqueness per platform
    UNIQUE(external_id, platform)
);

-- Create indexes for discovered_jobs
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_search_id ON discovered_jobs(search_id);
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_platform ON discovered_jobs(platform);
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_external_id ON discovered_jobs(external_id);
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_discovered_at ON discovered_jobs(discovered_at DESC);
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_is_applied ON discovered_jobs(is_applied);
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_title ON discovered_jobs USING gin(to_tsvector('english', title));
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_company ON discovered_jobs USING gin(to_tsvector('english', company));
CREATE INDEX IF NOT EXISTS idx_discovered_jobs_location ON discovered_jobs USING gin(to_tsvector('english', location));

-- =====================================================================
-- Table: job_discovery_preferences
-- Purpose: Store user preferences for job discovery
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_discovery_preferences (
    id VARCHAR(21) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_keywords TEXT[],
    preferred_locations TEXT[],
    salary_min INTEGER,
    salary_max INTEGER,
    job_types TEXT[], -- full-time, part-time, contract, etc.
    platforms TEXT[], -- NHS, Indeed, LinkedIn, etc.
    auto_search_enabled BOOLEAN DEFAULT FALSE,
    search_frequency VARCHAR(20) DEFAULT 'manual', -- manual, daily, weekly
    email_notifications BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One preference set per user
    UNIQUE(user_id)
);

-- Create indexes for job_discovery_preferences
CREATE INDEX IF NOT EXISTS idx_job_discovery_preferences_user_id ON job_discovery_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_job_discovery_preferences_auto_search ON job_discovery_preferences(auto_search_enabled);

-- =====================================================================
-- Table: saved_job_alerts
-- Purpose: Store job alerts that match specific criteria
-- =====================================================================
CREATE TABLE IF NOT EXISTS saved_job_alerts (
    id VARCHAR(21) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    search_criteria JSONB NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    last_run_at TIMESTAMP WITH TIME ZONE,
    next_run_at TIMESTAMP WITH TIME ZONE,
    frequency VARCHAR(20) DEFAULT 'daily', -- daily, weekly, monthly
    email_notifications BOOLEAN DEFAULT TRUE,
    results_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for saved_job_alerts
CREATE INDEX IF NOT EXISTS idx_saved_job_alerts_user_id ON saved_job_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_job_alerts_is_active ON saved_job_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_saved_job_alerts_next_run ON saved_job_alerts(next_run_at) WHERE is_active = TRUE;

-- =====================================================================
-- View: user_job_discovery_stats
-- Purpose: Provide aggregate statistics for job discovery
-- =====================================================================
CREATE OR REPLACE VIEW user_job_discovery_stats AS
SELECT 
    u.id as user_id,
    u.email,
    COUNT(DISTINCT js.id) as total_searches,
    COUNT(DISTINCT dj.id) as total_discovered_jobs,
    COUNT(DISTINCT CASE WHEN dj.is_applied = TRUE THEN dj.id END) as applied_jobs,
    MAX(js.created_at) as last_search_date,
    COUNT(DISTINCT sja.id) as active_alerts
FROM users u
LEFT JOIN job_searches js ON u.id = js.user_id
LEFT JOIN discovered_jobs dj ON js.id = dj.search_id
LEFT JOIN saved_job_alerts sja ON u.id = sja.user_id AND sja.is_active = TRUE
GROUP BY u.id, u.email;

-- =====================================================================
-- Trigger: Update timestamps
-- =====================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply timestamp triggers
CREATE TRIGGER update_job_searches_updated_at 
    BEFORE UPDATE ON job_searches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_discovery_preferences_updated_at 
    BEFORE UPDATE ON job_discovery_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_job_alerts_updated_at 
    BEFORE UPDATE ON saved_job_alerts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- Sample Data (for development/testing)
-- =====================================================================
-- Insert default job discovery preferences for existing users
INSERT INTO job_discovery_preferences (id, user_id, preferred_keywords, preferred_locations, platforms)
SELECT 
    'pref_' || u.id,
    u.id,
    ARRAY['nurse', 'healthcare'],
    ARRAY['London', 'Manchester'],
    ARRAY['NHS']
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM job_discovery_preferences jdp WHERE jdp.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Grant necessary permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON job_searches TO ezapply_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON discovered_jobs TO ezapply_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON job_discovery_preferences TO ezapply_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON saved_job_alerts TO ezapply_user;
-- GRANT SELECT ON user_job_discovery_stats TO ezapply_user;
