-- name: GetJob :one
SELECT
    id,
    tenant_id,
    name,
    description,
    schedule_type,
    schedule_expr,
    timezone,
    target_type,
    target_url,
    target_method,
    target_headers,
    target_timeout_seconds,
    retry_max_attempts,
    retry_backoff_type,
    retry_initial_delay_seconds,
    retry_max_delay_seconds,
    concurrency_max_executions,
    misfire_policy,
    enabled,
    next_run_at,
    metadata,
    created_at,
    updated_at
FROM jobs
WHERE id = $1;


-- name: ListJobs :many
SELECT
    id,
    tenant_id,
    name,
    description,
    schedule_type,
    schedule_expr,
    timezone,
    target_type,
    target_url,
    target_method,
    target_headers,
    target_timeout_seconds,
    retry_max_attempts,
    retry_backoff_type,
    retry_initial_delay_seconds,
    retry_max_delay_seconds,
    concurrency_max_executions,
    misfire_policy,
    enabled,
    next_run_at,
    metadata,
    created_at,
    updated_at
FROM jobs
WHERE tenant_id = $1
ORDER BY created_at DESC;


-- name: GetDueJobs :many
SELECT
    id,
    tenant_id,
    schedule_type,
    schedule_expr,
    timezone,
    next_run_at
FROM jobs
WHERE enabled = true
  AND next_run_at <= NOW()
ORDER BY next_run_at ASC
LIMIT $1;

-- name: CreateJob :one
INSERT INTO jobs (
    tenant_id,
    name,
    description,
    schedule_type,
    schedule_expr,
    timezone,
    target_url,
    target_timeout_seconds,
    retry_max_attempts,
    concurrency_max_executions,
    next_run_at,
    enabled
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
) RETURNING
    id,
    tenant_id,
    name,
    description,
    schedule_type,
    schedule_expr,
    timezone,
    target_url,
    target_timeout_seconds,
    retry_max_attempts,
    concurrency_max_executions,
    next_run_at,
    enabled,
    created_at,
    updated_at;

-- name: GetJobForTenant :one
SELECT
    id,
    tenant_id,
    name,
    description,
    schedule_type,
    schedule_expr,
    timezone,
    target_type,
    target_url,
    target_method,
    target_headers,
    target_timeout_seconds,
    retry_max_attempts,
    retry_backoff_type,
    retry_initial_delay_seconds,
    retry_max_delay_seconds,
    concurrency_max_executions,
    misfire_policy,
    enabled,
    next_run_at,
    metadata,
    created_at,
    updated_at
FROM jobs
WHERE id = $1 AND tenant_id = $2;

-- name: UpdateJob :one
UPDATE jobs SET
    name = $3,
    description = $4,
    schedule_type = $5,
    schedule_expr = $6,
    timezone = $7,
    target_url = $8,
    target_timeout_seconds = $9,
    retry_max_attempts = $10,
    concurrency_max_executions = $11,
    next_run_at = $12,
    enabled = $13,
    updated_at = NOW()
WHERE id = $1 AND tenant_id = $2
RETURNING
    id,
    tenant_id,
    name,
    description,
    schedule_type,
    schedule_expr,
    timezone,
    target_url,
    target_timeout_seconds,
    retry_max_attempts,
    concurrency_max_executions,
    next_run_at,
    enabled,
    created_at,
    updated_at;

-- name: ListExecutionsForJob :many
SELECT
    id,
    job_id,
    tenant_id,
    status,
    scheduled_at,
    created_at
FROM executions
WHERE job_id = $1 AND tenant_id = $2
ORDER BY created_at DESC
LIMIT $3;

-- name: SoftDeleteJob :one
UPDATE jobs SET
    enabled = false,
    next_run_at = NULL,
    updated_at = NOW()
WHERE id = $1 AND tenant_id = $2
RETURNING
    id,
    tenant_id,
    name,
    schedule_type,
    schedule_expr,
    timezone,
    target_url,
    next_run_at,
    enabled,
    created_at,
    updated_at;