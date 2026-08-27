CREATE TABLE executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    job_id UUID NOT NULL REFERENCES jobs(id),
    tenant_id UUID NOT NULL,

    status TEXT NOT NULL DEFAULT 'READY'
        CHECK (
            status IN (
                'READY',
                'CLAIMED',
                'RUNNING',
                'SUCCESS',
                'FAILURE',
                'TIMEOUT',
                'CANCELLED',
                'DEAD'
            )
        ),

    scheduled_at TIMESTAMPTZ NOT NULL,

    claimed_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,

    worker_id TEXT,
    claim_token UUID,
    lease_until TIMESTAMPTZ,

    result_status_code INT,
    result_body TEXT,
    result_error TEXT,

    attempt_count INT NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_executions_job
    ON executions(job_id, created_at DESC);

CREATE INDEX idx_executions_ready
    ON executions(status, scheduled_at)
    WHERE status = 'READY';

CREATE INDEX idx_executions_lease
    ON executions(lease_until)
    WHERE status IN ('CLAIMED', 'RUNNING');