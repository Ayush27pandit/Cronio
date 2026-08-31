-- name: GetReadyExecutions :many
SELECT
    e.id,
    e.job_id,
    e.tenant_id,
    e.scheduled_at,
    e.attempt_count,
    j.target_url,
    j.target_method,
    j.target_headers,
    j.target_timeout_seconds,
    j.retry_max_attempts,
    j.retry_initial_delay_seconds,
    j.retry_max_delay_seconds
FROM executions e
JOIN jobs j ON j.id = e.job_id
WHERE e.status = 'READY'
  AND e.scheduled_at <= NOW()
ORDER BY e.scheduled_at ASC
LIMIT $1;

-- name: TryClaimExecution :one
UPDATE executions
SET
    status = 'CLAIMED',
    claim_token = gen_random_uuid(),
    lease_until = NOW() + INTERVAL '30 seconds',
    claimed_at = NOW(),
    worker_id = $2
WHERE id = $1 AND status = 'READY'
RETURNING id, job_id, tenant_id, status, claim_token, lease_until;

-- name: MarkRunning :exec
UPDATE executions
SET
    status = 'RUNNING',
    started_at = NOW(),
    lease_until = NOW() + INTERVAL '30 seconds'
WHERE id = $1 AND claim_token = $2;

-- name: CreateAttempt :one
INSERT INTO attempts (
    execution_id,
    attempt_number,
    status,
    worker_id,
    request_method,
    request_url,
    started_at
) VALUES (
    $1,
    $2,
    'RUNNING',
    $3,
    $4,
    $5,
    NOW()
) RETURNING id;

-- name: CompleteAttempt :exec
UPDATE attempts
SET
    status = $2,
    finished_at = NOW(),
    response_status_code = $3,
    response_body = $4,
    error_message = $5
WHERE id = $1;

-- name: CompleteExecutionSuccess :exec
UPDATE executions
SET
    status = 'SUCCESS',
    finished_at = NOW(),
    result_status_code = $2,
    result_body = $3,
    attempt_count = $4
WHERE id = $1 AND claim_token = $5;

-- name: RescheduleForRetry :exec
UPDATE executions
SET
    status = 'READY',
    claim_token = NULL,
    lease_until = NULL,
    claimed_at = NULL,
    worker_id = NULL,
    started_at = NULL,
    scheduled_at = $2,
    attempt_count = $3
WHERE id = $1;

-- name: FailExecution :exec
UPDATE executions
SET
    status = 'FAILURE',
    finished_at = NOW(),
    result_status_code = $2,
    result_body = $3,
    result_error = $4,
    attempt_count = $5
WHERE id = $1 AND claim_token = $6;

-- name: ReapExpiredLeases :many
UPDATE executions
SET
    status = 'READY',
    claim_token = NULL,
    lease_until = NULL,
    claimed_at = NULL,
    worker_id = NULL,
    started_at = NULL
WHERE status IN ('CLAIMED', 'RUNNING')
  AND lease_until < NOW()
RETURNING id;
