-- name: GetExecution :one
SELECT
    e.id,
    e.job_id,
    e.tenant_id,
    e.status,
    e.scheduled_at,
    e.claimed_at,
    e.started_at,
    e.finished_at,
    e.worker_id,
    e.claim_token,
    e.lease_until,
    e.result_status_code,
    e.result_body,
    e.result_error,
    e.attempt_count,
    e.created_at,
    j.name AS job_name,
    j.target_url
FROM executions e
JOIN jobs j ON j.id = e.job_id
WHERE e.id = $1 AND e.tenant_id = $2;

-- name: ListAttemptsForExecution :many
SELECT
    id,
    execution_id,
    attempt_number,
    status,
    started_at,
    finished_at,
    worker_id,
    request_method,
    request_url,
    response_status_code,
    response_body,
    error_message,
    created_at
FROM attempts
WHERE execution_id = $1
ORDER BY attempt_number ASC;

-- name: DeleteAttemptsForJob :exec
DELETE FROM attempts
WHERE execution_id IN (
    SELECT id FROM executions WHERE job_id = $1
);

-- name: DeleteExecutionsForJob :exec
DELETE FROM executions
WHERE job_id = $1;

-- name: HardDeleteJob :one
DELETE FROM jobs
WHERE id = $1 AND tenant_id = $2
RETURNING id;
