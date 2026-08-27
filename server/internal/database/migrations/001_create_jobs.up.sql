CREATE TABLE IF NOT EXISTS jobs (
    id              VARCHAR(100) PRIMARY KEY,
    tenant_id       VARCHAR(100) NOT NULL,

    name            VARCHAR(255) NOT NULL,
    description     TEXT,

    schedule        JSONB NOT NULL,
    target          JSONB NOT NULL,
    retry_policy    JSONB NOT NULL,
    concurrency_policy JSONB NOT NULL,

    misfire_policy  VARCHAR(50) NOT NULL,

    metadata        JSONB DEFAULT '{}'::jsonb,

    enabled         BOOLEAN NOT NULL DEFAULT TRUE,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);