-- Create automation_runs table to track Playwright automation executions

CREATE TABLE IF NOT EXISTS automation_runs (
    id VARCHAR(50) PRIMARY KEY, -- nanoid for unique run identification
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'success', 'failed')),
    
    -- Automation execution details
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    screenshots_count INTEGER DEFAULT 0,
    
    -- Automation results
    application_url TEXT, -- URL of the submitted application if successful
    confirmation_number TEXT, -- Any confirmation number received
    
    -- Metadata
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient querying
CREATE INDEX IF NOT EXISTS idx_automation_runs_user_id ON automation_runs(user_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_job_id ON automation_runs(job_id);
CREATE INDEX IF NOT EXISTS idx_automation_runs_status ON automation_runs(status);
CREATE INDEX IF NOT EXISTS idx_automation_runs_created_at ON automation_runs(created_at DESC);

-- Create automation_logs table for streaming logs during execution
CREATE TABLE IF NOT EXISTS automation_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id VARCHAR(50) NOT NULL REFERENCES automation_runs(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    step_type VARCHAR(50) NOT NULL, -- 'navigation', 'form_fill', 'submit', 'validation', 'screenshot', 'error'
    message TEXT NOT NULL,
    screenshot_path TEXT, -- Optional path to screenshot
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient log retrieval
CREATE INDEX IF NOT EXISTS idx_automation_logs_run_id ON automation_logs(run_id, step_number);
CREATE INDEX IF NOT EXISTS idx_automation_logs_timestamp ON automation_logs(timestamp DESC);
