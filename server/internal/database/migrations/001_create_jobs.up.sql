CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    name TEXT NOT NULL,
    description TEXT,

    schedule_type TEXT NOT NULL
        CHECK (schedule_type IN ('cron', 'interval', 'once')),
    schedule_expr TEXT NOT NULL,
    timezone TEXT NOT NULL DEFAULT 'UTC',

    target_type TEXT NOT NULL DEFAULT 'http',
    target_url TEXT NOT NULL,
    target_method TEXT NOT NULL DEFAULT 'POST',
    target_headers JSONB NOT NULL DEFAULT '{}',
    target_timeout_seconds INT NOT NULL DEFAULT 30,

    retry_max_attempts INT NOT NULL DEFAULT 3,
    retry_backoff_type TEXT NOT NULL DEFAULT 'exponential',
    retry_initial_delay_seconds INT NOT NULL DEFAULT 60,
    retry_max_delay_seconds INT NOT NULL DEFAULT 3600,

    concurrency_max_executions INT NOT NULL DEFAULT 1,

    misfire_policy TEXT NOT NULL DEFAULT 'fire_once',

    enabled BOOLEAN NOT NULL DEFAULT true,
    next_run_at TIMESTAMPTZ,

    metadata JSONB NOT NULL DEFAULT '{}',

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jobs_tenant
    ON jobs(tenant_id);

CREATE INDEX idx_jobs_next_run
    ON jobs(next_run_at)
    WHERE enabled = true;