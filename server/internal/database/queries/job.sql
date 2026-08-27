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