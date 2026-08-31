# Worker fleet implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a worker fleet that claims READY executions, POSTs to target_url, writes attempts, and handles retries with exponential backoff.

**Architecture:** Deep `server/internal/worker/` module owns the claim and execute seam. Scheduler creates READY, worker claims with `FOR UPDATE SKIP LOCKED` and `claim_token/lease_until`, runs HTTP with `target_timeout_seconds`, records `attempts`, and either completes SUCCESS or re-queues READY with backoff. Runs in `cmd/api` for MVP, documented to split to `cmd/worker` later. Queries live in `worker.sql`, generated code is committed after `sqlc generate`.

**Tech Stack:** Go 1.22, Postgres 15 pgcrypto, chi, pgx stdlib, sqlc, robfig/cron not needed in worker, net/http

## Global constraints

- Module root is `server/`, all go commands run from `server/`
- `go vet ./...` must pass before `go test ./...`
- Generated code in `server/internal/database/generated/` is committed, do not hand edit, run `sqlc generate` after query edits
- Deep module rule, do not leak `sql.NullTime` or raw status strings past seam
- Scheduler and worker stay in `cmd/api` for MVP, note future split in docs

---

### Task 1: backoff pure unit

**Files:**
- Create: `server/internal/worker/backoff.go`
- Test: `server/internal/worker/backoff_test.go`

**Interfaces:**
- Consumes: none
- Produces: `func NextDelay(attempt int32, initialSec int32, maxSec int32) time.Duration` used by Task 4

- [ ] **Step 1: Write the failing test**

```go
package worker

import "testing"
import "time"

func TestNextDelay(t *testing.T) {
    if NextDelay(1, 60, 3600) != 60*time.Second { t.Fatalf("attempt 1") }
    if NextDelay(2, 60, 3600) != 120*time.Second { t.Fatalf("attempt 2") }
    if NextDelay(3, 60, 3600) != 240*time.Second { t.Fatalf("attempt 3") }
    if NextDelay(10, 60, 3600) != 3600*time.Second { t.Fatalf("cap") }
    if NextDelay(1, 0, 3600) != 0 { t.Fatalf("zero initial") }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/worker -run TestNextDelay -v` from `server/`
Expected: FAIL with "undefined: NextDelay"

- [ ] **Step 3: Write minimal implementation**

```go
package worker
import "time"
func NextDelay(attempt int32, initialSec int32, maxSec int32) time.Duration {
    if initialSec <= 0 { return 0 }
    d := time.Duration(initialSec) * time.Second
    for i := int32(1); i < attempt; i++ {
        d *= 2
        if d > time.Duration(maxSec)*time.Second { return time.Duration(maxSec) * time.Second }
    }
    if d > time.Duration(maxSec)*time.Second { return time.Duration(maxSec) * time.Second }
    return d
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `go test ./internal/worker -run TestNextDelay -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/internal/worker/backoff.go server/internal/worker/backoff_test.go
git commit -m "feat(worker): add exponential backoff helper"
```

---

### Task 2: worker SQL queries + sqlc generate

**Files:**
- Create: `server/internal/database/queries/worker.sql`
- Modify: `server/internal/database/generated/worker.sql.go` via sqlc
- Modify: `server/internal/database/generated/db.go` via sqlc

**Interfaces:**
- Consumes: executions and jobs tables, existing migrations
- Produces: `GetReadyExecutions`, `TryClaimExecution`, `MarkRunning`, `CreateAttempt`, `UpdateAttemptResult`, `CompleteExecutionSuccess`, `RescheduleForRetry`, `ReapExpiredLeases` queries for Task 4

- [ ] **Step 1: Write worker.sql**

```sql
-- name: GetReadyExecutions :many
SELECT e.id, e.job_id, e.tenant_id, e.scheduled_at, e.attempt_count,
       j.target_url, j.target_method, j.target_headers, j.target_timeout_seconds,
       j.retry_max_attempts, j.retry_initial_delay_seconds, j.retry_max_delay_seconds
FROM executions e
JOIN jobs j ON j.id = e.job_id
WHERE e.status = 'READY'
ORDER BY e.scheduled_at ASC
LIMIT $1;

-- name: TryClaimExecution :one
UPDATE executions
SET status = 'CLAIMED', claim_token = gen_random_uuid(), lease_until = NOW() + INTERVAL '30 seconds', claimed_at = NOW(), worker_id = $2
WHERE id = $1 AND status = 'READY'
RETURNING id, job_id, tenant_id, status, claim_token, lease_until;

-- name: MarkRunning :exec
UPDATE executions SET status = 'RUNNING', started_at = NOW(), lease_until = NOW() + INTERVAL '30 seconds' WHERE id = $1 AND claim_token = $2;

-- name: CreateAttempt :one
INSERT INTO attempts (execution_id, attempt_number, status, worker_id, request_method, request_url, started_at)
VALUES ($1, $2, 'RUNNING', $3, $4, $5, NOW())
RETURNING id;

-- name: CompleteAttempt :exec
UPDATE attempts SET status = $2, finished_at = NOW(), response_status_code = $3, response_body = $4, error_message = $5 WHERE id = $1;

-- name: CompleteExecutionSuccess :exec
UPDATE executions SET status = 'SUCCESS', finished_at = NOW(), result_status_code = $2, result_body = $3, attempt_count = $4 WHERE id = $1 AND claim_token = $2;

-- name: RescheduleForRetry :exec
UPDATE executions SET status = 'READY', claim_token = NULL, lease_until = NULL, claimed_at = NULL, worker_id = NULL, scheduled_at = NOW() + $2::interval, attempt_count = $3 WHERE id = $1;

-- name: FailExecution :exec
UPDATE executions SET status = 'FAILURE', finished_at = NOW(), result_status_code = $2, result_body = $3, result_error = $4, attempt_count = $5 WHERE id = $1 AND claim_token = $6;

-- name: ReapExpiredLeases :many
UPDATE executions SET status = 'READY', claim_token = NULL, lease_until = NULL, claimed_at = NULL, worker_id = NULL WHERE status IN ('CLAIMED','RUNNING') AND lease_until < NOW() RETURNING id;
```

Refine types to match sqlc expectations, ensure intervals work.

- [ ] **Step 2: Run sqlc generate**

Run: `sqlc generate` from `server/`
Expected: `server/internal/database/generated/worker.sql.go` created

- [ ] **Step 3: Verify**

Run: `go vet ./...` from `server/`
Expected: passes

- [ ] **Step 4: Commit**

```bash
git add server/internal/database/queries/worker.sql server/internal/database/generated/
git commit -m "feat(db): add worker claim and execution queries"
```

---

### Task 3: HTTP executor

**Files:**
- Create: `server/internal/worker/http.go`
- Test: `server/internal/worker/http_test.go`

**Interfaces:**
- Consumes: `job.ValidateTargetURL` helper or local copy
- Produces: `func doHTTP(ctx, method, url, headers, timeoutSec) (int, string, error)` for Task 4

- [ ] **Step 1: Write failing test with httptest**

```go
func TestDoHTTP_Success(t *testing.T) {
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){ w.Write([]byte("ok")) }))
    defer srv.Close()
    code, body, err := doHTTP(context.Background(), "POST", srv.URL, nil, 5)
    if err != nil || code != 200 || body != "ok" { t.Fatalf("%v %d %s", err, code, body) }
}
func TestDoHTTP_Timeout(t *testing.T) {
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request){ time.Sleep(200*time.Millisecond); w.Write([]byte("ok")) }))
    defer srv.Close()
    _, _, err := doHTTP(context.Background(), "POST", srv.URL, nil, 0) // use default
    // test short timeout via context
}
```

- [ ] **Step 2: Run fails**

Run: `go test ./internal/worker -run TestDoHTTP -v`
Expected: undefined doHTTP

- [ ] **Step 3: Implement with SSRF guard, timeout, context**

Use `http.NewRequestWithContext`, `http.Client{Timeout: dur}`, copy headers from json.RawMessage, validate URL via `validateTargetURL` local.

- [ ] **Step 4: Pass + vet**

Run: `go test ./internal/worker -run TestDoHTTP -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add server/internal/worker/http.go server/internal/worker/http_test.go
git commit -m "feat(worker): add HTTP executor with timeout and SSRF guard"
```

---

### Task 4: worker Tick and claim

**Files:**
- Create: `server/internal/worker/service.go`
- Test: `server/internal/worker/service_test.go` and `integration_test.go`

**Interfaces:**
- Consumes: `NextDelay`, `doHTTP`, generated queries
- Produces: `type Worker struct`, `func New(db, logger, id) *Worker`, `func (w *Worker) Tick(ctx) (claimed, succeeded, failed int, err error)`, `func (w *Worker) Start(ctx)`

- [ ] **Step 1: Failing test no DB**

Mock or use sqlmock, expect Tick returns 0 when no READY.

- [ ] **Step 2: Implement Tick**

Pseudocode:

```go
func (w *Worker) Tick(ctx context.Context) (claimed, succeeded, failed int, err error) {
    tickCtx, cancel := context.WithTimeout(ctx, 5*time.Second); defer cancel()
    q := db.New(w.db)
    if _, err := q.ReapExpiredLeases(tickCtx); err != nil { log }
    rows, err := q.GetReadyExecutions(tickCtx, w.batch)
    for _, r := range rows {
        claimedRow, err := q.TryClaimExecution(tickCtx, db.TryClaimExecutionParams{ID: r.ID, WorkerID: w.id})
        if err != nil { continue }
        q.MarkRunning(tickCtx, ...)
        attID, _ := q.CreateAttempt(tickCtx, ...)
        code, body, execErr := doHTTP(tickCtx, r.TargetMethod, r.TargetUrl, r.TargetHeaders, r.TargetTimeoutSeconds)
        if execErr != nil { // timeout
            q.CompleteAttempt(tickCtx, attID, "TIMEOUT", ...)
            // retry or fail
        } else if code >=200 && code <300 {
            q.CompleteAttempt(tickCtx, attID, "SUCCESS", code, body)
            q.CompleteExecutionSuccess(tickCtx, id, code, body, attemptCount)
            succeeded++
        } else {
            q.CompleteAttempt(tickCtx, attID, "FAILURE", code, body)
            if r.AttemptCount+1 < r.RetryMaxAttempts {
                delay := NextDelay(r.AttemptCount+1, r.RetryInitialDelaySeconds, r.RetryMaxDelaySeconds)
                q.RescheduleForRetry(tickCtx, id, delay, attemptCount)
            } else {
                q.FailExecution(tickCtx, id, code, body, err, attemptCount)
            }
            failed++
        }
        claimed++
    }
    return
}
```

Ensure `db.WithTx` not needed because each query is atomic via WHERE status.

- [ ] **Step 3: Integration test with DB_URL**

Create job interval 1h, make due, Tick scheduler to create READY, then Tick worker against httptest server, verify SUCCESS and attempt stored.

- [ ] **Step 4: Vet + test**

Run: `go vet ./... && go test ./...`
Expected: pass

- [ ] **Step 5: Commit**

```bash
git add server/internal/worker/service.go server/internal/worker/*.go
git commit -m "feat(worker): implement Tick claim and execute"
```

---

### Task 5: wire worker into cmd/api/main.go

**Files:**
- Modify: `server/cmd/api/main.go:72`
- Modify: `server/internal/config/config.go` if needed (no env change for MVP)

**Interfaces:**
- Consumes: `worker.New`
- Produces: running worker ticker

- [ ] **Step 1: Wire**

After `ticker.Start`, add:

```go
wWorker := worker.New(db, logger, "worker-1")
wCtx, wCancel := context.WithCancel(context.Background())
defer wCancel()
go wWorker.Start(wCtx)
```

Add to shutdown.

- [ ] **Step 2: Build and manual verify**

Run: `go build -o /tmp/cronio ./cmd/api && /tmp/cronio 2>&1 | head`
Curl create job to https://httpbin.org/post, then `curl GET /v1/jobs/{id}/executions` shows READY then SUCCESS.

- [ ] **Step 3: Commit**

```bash
git add server/cmd/api/main.go
git commit -m "feat(api): wire worker fleet alongside scheduler"
```

---

### Task 6: docs update

**Files:**
- Modify: `docs/STATE.md`, `docs/architecture.md`, `Readme.md`

**Interfaces:**
- Consumes: tasks 1-5 done

- [ ] **Step 1: Update STATE.md What is built, What is not built, How to run**

Note worker is built, runs in cmd/api, will split to cmd/worker for scaling.

- [ ] **Step 2: Update architecture.md Transactions and Scaling**

Add worker section, lease, heartbeat future.

- [ ] **Step 3: Update Readme status table**

Worker row done.

- [ ] **Step 4: Commit**

```bash
git add docs/STATE.md docs/architecture.md Readme.md
git commit -m "docs: mark worker fleet done, note future cmd/worker split"
```

