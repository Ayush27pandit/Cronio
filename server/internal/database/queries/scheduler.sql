-- name: LockDueJob :one
SELECT
    id,
    tenant_id,
    schedule_type,
    schedule_expr,
    timezone,
    next_run_at
FROM jobs
WHERE id = $1
  AND enabled = true
  AND next_run_at <= NOW()
FOR UPDATE;


-- name: CreateExecution :one
INSERT INTO executions (
    job_id,
    tenant_id,
    status,
    scheduled_at
)
VALUES (
    $1,
    $2,
    'READY',
    $3
)
RETURNING
    id,
    job_id,
    tenant_id,
    status,
    scheduled_at,
    created_at;


-- name: UpdateJobNextRun :exec
UPDATE jobs
SET
    next_run_at = $2,
    enabled = $3,
    updated_at = NOW()
WHERE id = $1;