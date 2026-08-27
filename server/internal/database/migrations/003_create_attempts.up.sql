CREATE TABLE attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    execution_id UUID NOT NULL REFERENCES executions(id),
    attempt_number INT NOT NULL,

    status TEXT NOT NULL
        CHECK (
            status IN (
                'RUNNING',
                'SUCCESS',
                'FAILURE',
                'TIMEOUT'
            )
        ),

    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ,

    worker_id TEXT,

    request_method TEXT,
    request_url TEXT,
    request_headers JSONB,
    request_body TEXT,

    response_status_code INT,
    response_body TEXT,
    response_headers JSONB,

    error_message TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(execution_id, attempt_number)
);

CREATE INDEX idx_attempts_execution
    ON attempts(execution_id, attempt_number);
