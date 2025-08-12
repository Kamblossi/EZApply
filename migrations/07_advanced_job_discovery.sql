-- Migration: Advanced Job Discovery Features (Phase 3)
-- Created: 2024-12-28
-- Purpose: Support multi-platform discovery, job alerts, and matching

-- =====================================================================
-- Table: job_alert_executions
-- Purpose: Track job alert execution history and results
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_alert_executions (
    id VARCHAR(50) PRIMARY KEY,
    alert_id VARCHAR(50) NOT NULL REFERENCES saved_job_alerts(id) ON DELETE CASCADE,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    jobs_found INTEGER DEFAULT 0,
    new_jobs INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'success', -- success, error
    error_message TEXT,
    search_results JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job_alert_executions
CREATE INDEX IF NOT EXISTS idx_job_alert_executions_alert_id ON job_alert_executions(alert_id);
CREATE INDEX IF NOT EXISTS idx_job_alert_executions_executed_at ON job_alert_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_alert_executions_status ON job_alert_executions(status);

-- =====================================================================
-- Table: job_matching_profiles
-- Purpose: Store user preferences for intelligent job matching
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_matching_profiles (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    preferred_job_titles TEXT[],
    skills TEXT[],
    experience_level VARCHAR(20), -- entry, mid, senior, executive
    preferred_locations TEXT[],
    max_commute_distance INTEGER DEFAULT 25,
    salary_expectations JSONB, -- {min: number, max: number, currency: string}
    work_preferences JSONB, -- {remote: boolean, hybrid: boolean, office: boolean}
    industry_preferences TEXT[],
    company_size_preference VARCHAR(20), -- startup, small, medium, large, enterprise
    benefits_priorities TEXT[],
    career_goals TEXT,
    availability_date DATE,
    notice_period INTEGER, -- weeks
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One profile per user
    UNIQUE(user_id)
);

-- Create indexes for job_matching_profiles
CREATE INDEX IF NOT EXISTS idx_job_matching_profiles_user_id ON job_matching_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matching_profiles_experience_level ON job_matching_profiles(experience_level);
CREATE INDEX IF NOT EXISTS idx_job_matching_profiles_is_active ON job_matching_profiles(is_active);

-- =====================================================================
-- Table: job_applications_tracking
-- Purpose: Enhanced application tracking with external platform sync
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_applications_tracking (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id), -- Changed to UUID to match jobs table
    external_job_id VARCHAR(255), -- For tracking jobs from external platforms
    platform VARCHAR(50), -- nhs, indeed, reed, etc.
    application_status VARCHAR(50) DEFAULT 'interested', 
    applied_date TIMESTAMP WITH TIME ZONE,
    response_date TIMESTAMP WITH TIME ZONE,
    interview_dates JSONB, -- Array of interview schedules
    feedback TEXT,
    next_action VARCHAR(255),
    next_action_date DATE,
    automated BOOLEAN DEFAULT FALSE,
    success_probability DECIMAL(3,2), -- 0.00 to 1.00
    notes TEXT,
    documents_submitted JSONB, -- Array of submitted documents
    contact_person JSONB, -- {name, email, phone, role}
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for job_applications_tracking
CREATE INDEX IF NOT EXISTS idx_job_applications_tracking_user_id ON job_applications_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_tracking_status ON job_applications_tracking(application_status);
CREATE INDEX IF NOT EXISTS idx_job_applications_tracking_platform ON job_applications_tracking(platform);
CREATE INDEX IF NOT EXISTS idx_job_applications_tracking_applied_date ON job_applications_tracking(applied_date DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_tracking_next_action_date ON job_applications_tracking(next_action_date);

-- =====================================================================
-- Table: job_matching_scores
-- Purpose: Store calculated job matching scores for recommendations
-- =====================================================================
CREATE TABLE IF NOT EXISTS job_matching_scores (
    id VARCHAR(50) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_external_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    matching_score DECIMAL(5,2) NOT NULL, -- 0.00 to 100.00
    score_breakdown JSONB, -- Detailed scoring factors
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_recommended BOOLEAN DEFAULT FALSE,
    user_feedback INTEGER, -- -1 (thumbs down), 0 (no feedback), 1 (thumbs up)
    feedback_date TIMESTAMP WITH TIME ZONE,
    
    -- Ensure one score per user-job combination
    UNIQUE(user_id, job_external_id, platform)
);

-- Create indexes for job_matching_scores
CREATE INDEX IF NOT EXISTS idx_job_matching_scores_user_id ON job_matching_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_job_matching_scores_score ON job_matching_scores(matching_score DESC);
CREATE INDEX IF NOT EXISTS idx_job_matching_scores_platform ON job_matching_scores(platform);
CREATE INDEX IF NOT EXISTS idx_job_matching_scores_recommended ON job_matching_scores(is_recommended);
CREATE INDEX IF NOT EXISTS idx_job_matching_scores_calculated_at ON job_matching_scores(calculated_at DESC);

-- =====================================================================
-- Table: platform_sync_status
-- Purpose: Track synchronization status with external job platforms
-- =====================================================================
CREATE TABLE IF NOT EXISTS platform_sync_status (
    id VARCHAR(50) PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    sync_status VARCHAR(20) DEFAULT 'idle', -- idle, running, success, error
    sync_type VARCHAR(30), -- full_sync, incremental, alert_check
    jobs_processed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    error_details JSONB,
    next_sync_at TIMESTAMP WITH TIME ZONE,
    configuration JSONB, -- Platform-specific settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- One record per platform
    UNIQUE(platform)
);

-- Create indexes for platform_sync_status
CREATE INDEX IF NOT EXISTS idx_platform_sync_status_platform ON platform_sync_status(platform);
CREATE INDEX IF NOT EXISTS idx_platform_sync_status_last_sync ON platform_sync_status(last_sync_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_sync_status_next_sync ON platform_sync_status(next_sync_at);

-- =====================================================================
-- Add new columns to existing tables
-- =====================================================================

-- Enhance saved_job_alerts table
ALTER TABLE saved_job_alerts ADD COLUMN IF NOT EXISTS max_results INTEGER DEFAULT 20;
ALTER TABLE saved_job_alerts ADD COLUMN IF NOT EXISTS success_rate DECIMAL(3,2) DEFAULT 0.00;
ALTER TABLE saved_job_alerts ADD COLUMN IF NOT EXISTS total_executions INTEGER DEFAULT 0;

-- Enhance discovered_jobs table
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS job_type VARCHAR(50);
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS work_pattern VARCHAR(50);
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS experience_level VARCHAR(20);
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS sector VARCHAR(100);
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS benefits JSONB;
ALTER TABLE discovered_jobs ADD COLUMN IF NOT EXISTS matching_score DECIMAL(5,2);

-- =====================================================================
-- Enhanced Views for Analytics
-- =====================================================================

-- Create view for user job discovery analytics
CREATE OR REPLACE VIEW user_job_discovery_analytics AS
SELECT 
    u.id as user_id,
    u.email,
    -- Search Statistics
    COUNT(DISTINCT js.id) as total_searches,
    COUNT(DISTINCT CASE WHEN js.created_at >= NOW() - INTERVAL '30 days' THEN js.id END) as searches_last_30_days,
    AVG(js.results_count) as avg_results_per_search,
    -- Job Discovery Statistics
    COUNT(DISTINCT dj.id) as total_discovered_jobs,
    COUNT(DISTINCT CASE WHEN dj.discovered_at >= NOW() - INTERVAL '30 days' THEN dj.id END) as discovered_last_30_days,
    COUNT(DISTINCT CASE WHEN dj.is_applied = TRUE THEN dj.id END) as applied_jobs,
    -- Alert Statistics
    COUNT(DISTINCT sja.id) as total_alerts,
    COUNT(DISTINCT CASE WHEN sja.is_active = TRUE THEN sja.id END) as active_alerts,
    AVG(sja.results_count) as avg_alert_results,
    -- Application Statistics
    COUNT(DISTINCT jat.id) as total_applications,
    COUNT(DISTINCT CASE WHEN jat.application_status = 'interview' THEN jat.id END) as interviews,
    COUNT(DISTINCT CASE WHEN jat.application_status = 'offer' THEN jat.id END) as offers,
    -- Matching Statistics
    AVG(jms.matching_score) as avg_matching_score,
    COUNT(DISTINCT CASE WHEN jms.user_feedback = 1 THEN jms.id END) as positive_feedback,
    -- Dates
    MAX(js.created_at) as last_search_date,
    MAX(dj.discovered_at) as last_discovery_date
FROM users u
LEFT JOIN job_searches js ON u.id = js.user_id
LEFT JOIN discovered_jobs dj ON js.id = dj.search_id
LEFT JOIN saved_job_alerts sja ON u.id = sja.user_id
LEFT JOIN job_applications_tracking jat ON u.id = jat.user_id
LEFT JOIN job_matching_scores jms ON u.id = jms.user_id
GROUP BY u.id, u.email;

-- Create view for platform performance analytics
CREATE OR REPLACE VIEW platform_performance_analytics AS
SELECT 
    platform,
    COUNT(DISTINCT search_id) as total_searches,
    COUNT(*) as total_jobs_found,
    COUNT(CASE WHEN is_applied = TRUE THEN 1 END) as applied_jobs,
    AVG(matching_score) as avg_matching_score,
    COUNT(CASE WHEN discovered_at >= NOW() - INTERVAL '7 days' THEN 1 END) as jobs_last_7_days,
    COUNT(CASE WHEN discovered_at >= NOW() - INTERVAL '30 days' THEN 1 END) as jobs_last_30_days,
    MIN(discovered_at) as first_job_date,
    MAX(discovered_at) as latest_job_date
FROM discovered_jobs
GROUP BY platform
ORDER BY total_jobs_found DESC;

-- =====================================================================
-- Update existing triggers for new tables
-- =====================================================================
CREATE TRIGGER update_job_matching_profiles_updated_at 
    BEFORE UPDATE ON job_matching_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_job_applications_tracking_updated_at 
    BEFORE UPDATE ON job_applications_tracking 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_sync_status_updated_at 
    BEFORE UPDATE ON platform_sync_status 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================================
-- Insert default platform sync configurations
-- =====================================================================
INSERT INTO platform_sync_status (id, platform, configuration, next_sync_at)
VALUES 
    ('sync_nhs', 'nhs', '{"enabled": true, "sync_interval_hours": 6, "max_results": 100}', NOW() + INTERVAL '1 hour'),
    ('sync_indeed', 'indeed', '{"enabled": true, "sync_interval_hours": 12, "max_results": 50}', NOW() + INTERVAL '2 hours'),
    ('sync_reed', 'reed', '{"enabled": true, "sync_interval_hours": 12, "max_results": 50}', NOW() + INTERVAL '3 hours')
ON CONFLICT (platform) DO NOTHING;

-- =====================================================================
-- Sample job matching profile for existing users
-- =====================================================================
INSERT INTO job_matching_profiles (
    id, user_id, preferred_job_titles, skills, experience_level, 
    preferred_locations, salary_expectations, work_preferences
)
SELECT 
    'profile_' || u.id::text,
    u.id,
    ARRAY['nurse', 'healthcare assistant'],
    ARRAY['patient care', 'medical knowledge', 'communication'],
    'mid',
    ARRAY['London', 'Manchester'],
    '{"min": 25000, "max": 40000, "currency": "GBP"}'::jsonb,
    '{"remote": false, "hybrid": true, "office": true}'::jsonb
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM job_matching_profiles jmp WHERE jmp.user_id = u.id
)
ON CONFLICT (user_id) DO NOTHING;
