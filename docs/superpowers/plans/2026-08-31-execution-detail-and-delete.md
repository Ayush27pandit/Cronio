# Execution detail and delete implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /v1/executions/{id}` that returns one execution with its attempts and `DELETE /v1/jobs/{id}` that hard deletes a job, both tenant scoped.

**Architecture:** Deep `server/internal/job/` stays the seam. New queries in `execution.sql` are tenant scoped via `executions.tenant_id` and `jobs` join for job name. Handlers in `server/internal/server/server.go` stay thin mappers. `job.Service` adds `GetExecution` and `DeleteJob` that hide `sql.NullTime`. No new table, no new index, reuse `idx_executions_job` and `idx_attempts_execution`. Delete is hard now to keep history clean for MVP; future will soft disable and keep history per docs/STATE.md.

**Tech Stack:** Go 1.22, Postgres 15 pgcrypto, chi, pgx stdlib, sqlc `database/sql`, `httptest`

## Global constraints

- Module root is `server/`, run `go vet ./...` then `go test ./...` from there
- Generated code in `server/internal/database/generated/` is committed, run `sqlc generate` after `queries/*.sql`
- Tenant check is `WHERE id = $1 AND tenant_id = $2`, never trust a list without tenant
- One commit per task or squash per phase, `go vet` green

---

### Task 1: execution queries

**Files:**
- Create: `server/internal/database/queries/execution.sql`
- Modify: `server/internal/database/generated/execution.sql.go`, `db.go` via sqlc

**Interfaces:**
- Consumes: `executions` and `attempts` tables from `migrations/002` `003`
- Produces: `GetExecution`, `ListAttemptsForExecution`, `DeleteAttemptsForJob`, `DeleteExecutionsForJob`, `HardDeleteJob` for Task 2

- [ ] **Step 1: Write queries**

```sql
-- name: GetExecution :one
SELECT e.id, e.job_id, e.tenant_id, e.status, e.scheduled_at, e.claimed_at, e.started_at, e.finished_at, e.worker_id, e.claim_token, e.lease_until, e.result_status_code, e.result_body, e.result_error, e.attempt_count, e.created_at, j.name as job_name, j.target_url
FROM executions e
JOIN jobs j ON j.id = e.job_id
WHERE e.id = $1 AND e.tenant_id = $2;

-- name: ListAttemptsForExecution :many
SELECT id, execution_id, attempt_number, status, started_at, finished_at, worker_id, request_method, request_url, response_status_code, response_body, error_message, created_at
FROM attempts
WHERE execution_id = $1
ORDER BY attempt_number ASC;

-- name: DeleteAttemptsForJob :exec
DELETE FROM attempts WHERE execution_id IN (SELECT id FROM executions WHERE job_id = $1);

-- name: DeleteExecutionsForJob :exec
DELETE FROM executions WHERE job_id = $1;

-- name: HardDeleteJob :one
DELETE FROM jobs WHERE id = $1 AND tenant_id = $2 RETURNING id;
```

Hard delete is current choice. Future soft will be `UPDATE jobs SET enabled=false, next_run_at=NULL`. Note in docs.

- [ ] **Step 2: Run `sqlc generate` from `server/`**

Run: `sqlc generate`
Expected: `server/internal/database/generated/execution.sql.go` created

- [ ] **Step 3: Verify `go vet ./...` passes**

Run: `go vet ./...` from `server/`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add server/internal/database/queries/execution.sql server/internal/database/generated/
git commit -m "feat(db): add execution detail and hard delete queries"
```

---

### Task 2: job service methods

**Files:**
- Modify: `server/internal/job/store.go`

**Interfaces:**
- Consumes: generated `GetExecution`, `ListAttemptsForExecution`, `HardDeleteJob`
- Produces: `func (s *Service) GetExecution(ctx, TenantID, executionID) (ExecutionDetail, error)` and `func (s *Service) DeleteJob(ctx, TenantID, jobID) error` for handlers

```go
type ExecutionDetail struct {
  Execution db.GetExecutionRow
  Attempts  []db.ListAttemptsForExecutionRow
}
```

- [ ] **Step 1: Write failing test `server/internal/job/execution_test.go` without DB**

```go
func TestGetExecution_ZeroTenant(t *testing.T) {
  svc := job.New(&sql.DB{})
  _, err := svc.GetExecution(context.Background(), job.TenantID(uuid.Nil), uuid.New())
  if err == nil { t.Fatal("expected tenant required") }
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `go test ./internal/job -run TestGetExecution_ZeroTenant -v`
Expected: FAIL undefined

- [ ] **Step 3: Implement `GetExecution`**

```go
func (s *Service) GetExecution(ctx context.Context, tenantID TenantID, execID uuid.UUID) (ExecutionDetail, error) {
  if tenantID.IsZero() { return ExecutionDetail{}, fmt.Errorf("tenant_id is required") }
  q := db.New(s.db)
  row, err := q.GetExecution(ctx, db.GetExecutionParams{ID: execID, TenantID: tenantID.UUID()})
  if err != nil { return ExecutionDetail{}, err }
  atts, err := q.ListAttemptsForExecution(ctx, execID)
  if err != nil { return ExecutionDetail{}, err }
  return ExecutionDetail{Execution: row, Attempts: atts}, nil
}
```

- [ ] **Step 4: Implement `DeleteJob` hard delete in transaction**

```go
func (s *Service) DeleteJob(ctx context.Context, tenantID TenantID, jobID uuid.UUID) error {
  if tenantID.IsZero() { return fmt.Errorf("tenant_id is required") }
  tx, err := s.db.BeginTx(ctx, nil)
  if err != nil { return err }
  defer func() { _ = tx.Rollback() }()
  q := db.New(s.db).WithTx(tx)
  // tenant check via HardDeleteJob returning row, but need to delete children first
  if err := q.DeleteAttemptsForJob(ctx, jobID); err != nil { return err }
  if err := q.DeleteExecutionsForJob(ctx, jobID); err != nil { return err }
  id, err := q.HardDeleteJob(ctx, db.HardDeleteJobParams{ID: jobID, TenantID: tenantID.UUID()})
  if err != nil { return err }
  if id == uuid.Nil { return sql.ErrNoRows }
  return tx.Commit()
}
```

Alternative simpler: `DELETE FROM jobs` without deleting children will fail due to FK, so delete children first. Tenant check is on the final delete, so wrong tenant returns ErrNoRows.

- [ ] **Step 5: Verify `go vet ./...`**

- [ ] **Step 6: Commit**

```bash
git add server/internal/job/store.go server/internal/job/execution_test.go
git commit -m "feat(job): add GetExecution and hard DeleteJob"
```

---

### Task 3: handlers and routes

**Files:**
- Modify: `server/internal/server/server.go`

**Interfaces:**
- Consumes: `job.Service.GetExecution`, `DeleteJob`
- Produces: HTTP `GET /v1/executions/{id}` and `DELETE /v1/jobs/{id}`

- [ ] **Step 1: Write failing handler tests `server/internal/server/server_test.go`**

```go
func TestGetExecution_MissingTenant(t *testing.T) {
  srv := New("8080", slog.Default(), &sql.DB{})
  req := httptest.NewRequest("GET", "/v1/executions/"+uuid.NewString(), nil)
  rec := httptest.NewRecorder()
  srv.Handler.ServeHTTP(rec, req)
  if rec.Code != 400 { t.Fatalf(...) }
}
func TestDeleteJob_MissingTenant(t *testing.T) { ... }
```

- [ ] **Step 2: Implement handlers**

`handleGetExecution` parses `chi.URLParam("id")` as UUID, gets TenantID from `middleware.GetTenantID`, calls `svc.GetExecution`, on `sql.ErrNoRows` writes 404 `not_found`, else writes 200:

```json
{"id":"...","job_id":"...","job_name":"...","target_url":"...","tenant_id":"...","status":"SUCCESS","scheduled_at":"RFC3339","attempt_count":2,"created_at":"...","lease_until":null,"attempts":[{"attempt_number":1,"status":"FAILURE"}]}
```

`handleDeleteJob` parses job id, calls `svc.DeleteJob`, on `ErrNoRows` 404, else 204 or 200 with `{deleted: id}`. Use 204 No Content for hard delete.

Register inside `Route("/v1", ...)`:

```go
r.Get("/executions/{id}", handleGetExecution(jsvc, logger))
r.Delete("/jobs/{id}", handleDeleteJob(jsvc, logger))
```

- [ ] **Step 3: Verify `go vet ./...` and `go test ./internal/server -run TestGetExecution -v`**

- [ ] **Step 4: Commit**

```bash
git add server/internal/server/server.go server/internal/server/server_test.go
git commit -m "feat(api): add GET executions by id and DELETE jobs hard delete"
```

---

### Task 4: integration and docs

**Files:**
- Create or modify `server/internal/job/integration_execution_test.go` or extend existing
- Modify `docs/api.md`, `docs/STATE.md`, `docs/architecture.md`, `docs/LLD.md`

**Interfaces:**
- Consumes: all previous tasks
- Produces: verified end-to-end and documented API

- [ ] **Step 1: Integration test with real DB**

Create tenant, interval job to httptest 200, scheduler Tick to create READY, worker Tick to SUCCESS, then call `GetExecution` via service and verify attempts 1 and status SUCCESS and job_name included. Test wrong tenant returns ErrNoRows. Test DeleteJob hard delete removes job and executions, then Get returns 404.

Isolate with `UPDATE executions SET scheduled_at = NOW()+1 day WHERE READY` before each test.

- [ ] **Step 2: Update `docs/api.md`** add sections for `GET /v1/executions/{id}` and `DELETE /v1/jobs/{id}` with curl and response shapes, note hard delete now, soft in future.

- [ ] **Step 3: Update `docs/STATE.md`** move those endpoints from not built to built, note hard delete now, soft later.

- [ ] **Step 4: Verify `go vet ./... && go test ./...`**

- [ ] **Step 5: Commit**

```bash
git add docs/api.md docs/STATE.md docs/architecture.md docs/LLD.md server/internal/job/integration_execution_test.go
git commit -m "docs: document execution detail and hard delete, note future soft"
```

