# Low-level design — Cronio

This is the build guide for Cronio. It explains what each file does, what each query does, and how races are resolved. Read `docs/architecture.md` for the short version. This file is the long version with code locations and query text.

## Goal and non-goals

Goal: one place to create a job, say when it fires, and see what happened. At-least-once, Postgres is the source of truth, scheduler and worker scale separately.

Non-goals for MVP: NATS, dispatcher, SDK workers, separate leases table, heartbeat renewal, `DELETE`, `GET /v1/executions/{id}`, API keys, pagination. They are in `docs/STATE.md:41`.

## Domain language

From `CONTEXT.md:1`:

* Tenant owns jobs, sees only its own rows
* Job is the definition: name, schedule, target
* Schedule is Cron 5-field plus timezone, Interval duration, or Once timestamp
* Target is HTTP url, method, headers, timeout
* Execution is one firing, READY to terminal
* Attempt is one try inside an execution, retries create a new attempt row
* Lease is claim_token plus lease_until, held by a worker
* Retry policy is max attempts and exponential backoff
* Concurrency policy is max CLAIMED or RUNNING per job
* Misfire policy is fire_once for MVP

Code names match these words. No task, cron, workflow, or namespace synonyms.

## System overview

```
               tenant header X-Tenant-ID everywhere
                            |
        +-------------------+-------------------+
        |                                       |
   API  |  Scheduler fleet    Worker fleet      |  Your HTTP targets
   chi  |  ticker 1s          poll 1s            |
        |   GetDueJobs        GetReadyExecutions |
        +-------------------+-------------------+
                            |
                            v
                     Postgres, pgcrypto
                     jobs, executions, attempts
```

For MVP all three run in `server/cmd/api/main.go:22` with the same `*sql.DB` pool. The split to `cmd/scheduler` and `cmd/worker` is a wiring change only.

```mermaid
flowchart TB
    C[Client] -->|POST /v1/jobs with X-Tenant-ID| API[API server/internal/server/server.go]
    API -->|writes jobs next_run_at| PG[(Postgres)]
    ST[Scheduler server/internal/scheduler/ticker.go] -->|every 1s GetDueJobs| PG
    ST -->|BEGIN LockDueJob SKIP LOCKED, CreateExecution READY| PG
    WK[Worker server/internal/worker/service.go] -->|every 1s GetReadyExecutions| PG
    WK -->|TryClaim CLAIMED, MarkRunning, doHTTP| PG
    WK -->|POST| TG[Target URL]
    TG -->|200 or 500| WK
    WK -->|CompleteAttempt, SUCCESS or Reschedule READY| PG
    C -->|GET /v1/jobs by id executions| PG
```

## Modules and file map

Module root is `server/`. Run `go vet ./...` then `go test ./...` from there.

```
server/
  cmd/api/main.go                 wiring, godotenv, migrate on throwaway DB, start ticker and worker
  internal/config/config.go       DB_URL required, PORT, LOG_LEVEL
  internal/database/
    db.go                         pgx stdlib, 5s ping
    migrate.go                    embed migrations, iofs, pgx driver, m.Up()
    migrations/001_create_jobs.up.sql, 002_create_executions.up.sql, 003_create_attempts.up.sql
    queries/job.sql, scheduler.sql, worker.sql
    generated/                    sqlc output, committed, do not hand edit
  internal/job/
    schedule.go                   Schedule value, NewCronSchedule, NewIntervalSchedule, NewOnceSchedule, NextRun pure
    tenant.go                     TenantID distinct type
    service.go                    ScheduleDue with SKIP LOCKED + concurrency
    store.go                      Create, Get, List, Update, ListExecutions, validateTargetURL
  internal/scheduler/ticker.go    Ticker poll GetDueJobs 100 every 1s, calls ScheduleDue per row
  internal/worker/
    backoff.go                    NextDelay pure
    http.go                       doHTTP with timeout and SSRF
    service.go                    Worker Tick and Start, claim and execute
  internal/server/
    server.go                     chi router, thin handlers, Tenant middleware
    middleware/                   RequestID, Recovery, Logger, Timeout
  static/index.html               quick visual, Tailwind CDN, no build step
```

## Database, in detail

### Jobs

From `server/internal/database/migrations/001_create_jobs.up.sql:1`:

* `id uuid PK gen_random_uuid()`
* `tenant_id uuid not null`
* `name text`, `description text`
* `schedule_type text check cron|interval|once`, `schedule_expr text`, `timezone text default UTC`
* `target_type text default http`, `target_url text not null`, `target_method text default POST`, `target_headers jsonb default '{}'`, `target_timeout_seconds int default 30`
* `retry_max_attempts int default 3`, `retry_backoff_type text default exponential`, `retry_initial_delay_seconds int default 60`, `retry_max_delay_seconds int default 3600`
* `concurrency_max_executions int default 1`
* `misfire_policy text default fire_once`
* `enabled bool default true`, `next_run_at timestamptz`, `metadata jsonb default '{}'`, `created_at`, `updated_at`
* Index `idx_jobs_next_run on next_run_at where enabled`

### Executions

From `server/internal/database/migrations/002_create_executions.up.sql:1`:

* `id uuid PK`, `job_id uuid references jobs`, `tenant_id uuid`
* `status text default READY check READY|CLAIMED|RUNNING|SUCCESS|FAILURE|TIMEOUT|CANCELLED|DEAD`
* `scheduled_at timestamptz not null` worker cursor, `claimed_at`, `started_at`, `finished_at`
* `worker_id text`, `claim_token uuid`, `lease_until timestamptz`
* `result_status_code int`, `result_body text`, `result_error text`, `attempt_count int default 0`, `created_at`
* Index `idx_executions_ready on status, scheduled_at where READY`
* Index `idx_executions_lease on lease_until where status in (CLAIMED,RUNNING)`

### Attempts

From `server/internal/database/migrations/003_create_attempts.up.sql:1`:

* `id uuid PK`, `execution_id uuid references executions`, `attempt_number int`, `status check RUNNING|SUCCESS|FAILURE|TIMEOUT`
* `started_at`, `finished_at`, `worker_id`
* `request_method`, `request_url`, `request_headers jsonb`, `request_body text`
* `response_status_code int`, `response_body text`, `response_headers jsonb`, `error_message text`
* Unique `execution_id, attempt_number`, index `idx_attempts_execution`

```mermaid
erDiagram
    jobs ||--o{ executions : "1 job has many executions"
    executions ||--o{ attempts : "1 execution has many attempts"
    jobs {
        uuid id PK
        uuid tenant_id
        text schedule_type
        text schedule_expr
        text timezone
        text target_url
        int target_timeout_seconds
        int retry_max_attempts
        int concurrency_max_executions
        bool enabled
        timestamptz next_run_at
    }
    executions {
        uuid id PK
        uuid job_id FK
        uuid tenant_id
        text status
        timestamptz scheduled_at
        timestamptz lease_until
        uuid claim_token
        int attempt_count
    }
    attempts {
        uuid id PK
        uuid execution_id FK
        int attempt_number
        text status
        int response_status_code
    }
```

## API

Base `http://localhost:8080`. Tenant header required for `/v1`.

```
X-Tenant-ID: 11111111-1111-1111-1111-111111111111
```

Handlers in `server/internal/server/server.go:17` are thin mappers. Validation lives in `server/internal/job/`, not in the handler.

| Method | Path | Code | Notes |
|---|---|---|---|
| GET | /health | 200 | open, no DB ping |
| POST | /v1/jobs | 201 | body name, schedule type/expression/timezone, target url, tenant header |
| GET | /v1/jobs | 200 | list, newest first, tenant scoped |
| GET | /v1/jobs/{id} | 200 or 404 | tenant scoped |
| PATCH | /v1/jobs/{id} | 200 or 400 or 404 | name, description, enabled, schedule, target, any subset |
| GET | /v1/jobs/{id}/executions | 200 | 20 recent, tenant scoped |

Errors are `{"error":{"code":"...","message":"..."}}`. See `docs/api.md:1`.

Schedule validation uses typed constructors at creation, so 400 happens before DB.

## Scheduler, low level

Location `server/internal/scheduler/ticker.go:15`.

```
type Ticker struct { db *sql.DB; svc *job.Service; logger; interval 1s; batch 100 }
func NewTicker(db, svc, logger, interval, batch) *Ticker
func (t *Ticker) Tick(ctx) (claimed, skipped int, err error)
func (t *Ticker) Start(ctx) loop with time.NewTicker
```

`Tick` steps:

1. `tickCtx, cancel := context.WithTimeout(ctx, 5s)` so a stuck DB does not block next tick
2. `q.GetDueJobs(batch)` `SELECT id, tenant_id ... WHERE enabled and next_run_at <= NOW() ORDER BY next_run_at LIMIT $1` `server/internal/database/queries/job.sql:60`
3. For each row, `svc.ScheduleDue(tickCtx, TenantID(row.TenantID), row.ID)` `server/internal/job/service.go:50`

`ScheduleDue` transaction, one DB transaction:

```
BEGIN
  job = LockDueJob FOR UPDATE SKIP LOCKED where id and tenant and enabled and next_run_at <= NOW()
  if ErrNoRows return Nil, nil
  active = CountActiveExecutions where job_id and status in (CLAIMED,RUNNING)
  if active >= job.concurrency_max_executions return ErrConcurrencyLimited
  sched = scheduleFromRow(job.schedule_type, expr, timezone)
  next, enabled = sched.NextRun(job.next_run_at)
  exec = CreateExecution job_id, tenant_id, scheduled_at=job.next_run_at, status READY
  UpdateJobNextRun id, next, enabled
COMMIT
return exec.ID
```

Pure `Schedule.NextRun` `server/internal/job/schedule.go:123` returns UTC. Cron uses `robfig/cron/v3` 5-field and `time.LoadLocation`.

Tests hit `Tick` directly, not `time.Sleep`. See `server/internal/scheduler/ticker_test.go:33`.

## Worker, low level

Location `server/internal/worker/service.go:15`, `http.go:1`, `backoff.go:1`.

```
type Worker struct { db *sql.DB; id string; logger; interval 1s; batch 10 }
func New(db, logger, id, interval, batch) *Worker
func (w *Worker) Tick(ctx) (claimed, succeeded, failed int, err error)
func (w *Worker) Start(ctx) loop
func NextDelay(attempt, initialSec, maxSec) time.Duration
func doHTTP(ctx, method, url, headers, timeoutSec) (int, string, error)
```

Queries in `server/internal/database/queries/worker.sql:1`:

* `GetReadyExecutions` `FROM executions JOIN jobs WHERE status READY and scheduled_at <= NOW() ORDER BY scheduled_at LIMIT $1`
* `TryClaimExecution` `UPDATE executions SET status CLAIMED, claim_token gen_random_uuid(), lease_until NOW()+30s, claimed_at NOW(), worker_id $2 WHERE id $1 and status READY RETURNING`
* `MarkRunning` `UPDATE status RUNNING, started_at NOW(), lease_until +30s WHERE id and claim_token`
* `CreateAttempt` `INSERT attempts execution_id, attempt_number, RUNNING, worker_id, request_method, request_url, NOW() RETURNING id`
* `CompleteAttempt` `UPDATE attempts status, finished_at NOW(), response code/body, error_message WHERE id`
* `CompleteExecutionSuccess` `UPDATE executions SUCCESS, finished_at, result code/body, attempt_count WHERE id and claim_token`
* `RescheduleForRetry` `UPDATE executions READY, clear claim_token, lease_until, scheduled_at $2, attempt_count $3 WHERE id`
* `FailExecution` `UPDATE executions FAILURE, result code/body/error, attempt_count WHERE id and claim_token`
* `ReapExpiredLeases` `UPDATE executions READY, clear claim where status in (CLAIMED,RUNNING) and lease_until < NOW() RETURNING id`

`Tick` steps:

1. `tickCtx, cancel := context.WithTimeout(ctx, 30s)` for DB, HTTP uses outer ctx with its own timeout
2. `ReapExpiredLeases` logs count if any
3. `rows = GetReadyExecutions(batch)` where `scheduled_at <= NOW()`
4. For each row:
   * `claimedRow = TryClaimExecution(id, worker_id)` if `ErrNoRows` another worker got it, continue
   * `MarkRunning(id, claim_token)`
   * `attemptID = CreateAttempt(execution_id, attempt_number = attempt_count+1, worker_id, request_method, request_url)`
   * `code, body, err = doHTTP(ctx, target_method, target_url, target_headers, target_timeout_seconds)` `server/internal/worker/http.go:1` validates url, blocks `169.254.169.254`, uses `http.NewRequestWithContext` and `Client Timeout`
   * If `err != nil`, `isTimeout` checks `DeadlineExceeded` or timeout string, `CompleteAttempt` with `FAILURE` or `TIMEOUT`, then if `attempt_number < retry_max_attempts` `delay = NextDelay(attempt_number, initial, max)` and `RescheduleForRetry` with `scheduled_at = NOW()+delay`, else `FailExecution` terminal
   * If `200 <= code < 300`, `CompleteAttempt SUCCESS` and `CompleteExecutionSuccess`
   * Else non-2xx, same as err but with `response code/body`, retry or `FailExecution`

`NextDelay` `server/internal/worker/backoff.go:6` is pure: `60, 120, 240 ...` capped at `max`.

```mermaid
flowchart TD
    A[Tick start] --> B[ReapExpiredLeases]
    B --> C[GetReadyExecutions 10 where READY and scheduled_at <= NOW]
    C --> D{rows empty?}
    D -- yes --> Z[return]
    D -- no --> E[For each row]
    E --> F[TryClaim WHERE READY]
    F --> G{claimed?}
    G -- no --> E
    G -- yes --> H[MarkRunning]
    H --> I[CreateAttempt RUNNING]
    I --> J[doHTTP]
    J --> K{err?}
    K -- yes --> L[CompleteAttempt FAILURE or TIMEOUT]
    L --> M{retry left?}
    M -- yes --> N[Reschedule READY with scheduled_at + backoff]
    M -- no --> O[FailExecution FAILURE]
    K -- no --> P{code 2xx?}
    P -- yes --> Q[CompleteAttempt SUCCESS, CompleteExecution SUCCESS]
    P -- no --> R[CompleteAttempt FAILURE]
    R --> S{retry left?}
    S -- yes --> N
    S -- no --> T[FailExecution FAILURE]
```

Integration tests in `server/internal/worker/service_test.go:33` use Neon when `DB_URL` is set, isolate by pushing other READY to future with `UPDATE executions SET scheduled_at = NOW()+1 day WHERE READY`, httptest server for success, 500 server for retry, expired `CLAIMED` insert for reap.

## Concurrency and race handling

All races are resolved by Postgres. No in-memory locks.

### Scheduler race: two schedulers, same due job

Same as `docs/architecture.md:156`. `FOR UPDATE SKIP LOCKED` is the lock. Tenant check is in the `WHERE`.

```mermaid
sequenceDiagram
    participant SA as scheduler A
    participant DB as Postgres
    participant SB as scheduler B
    SA->>DB: BEGIN
    SA->>DB: LockDueJob 1 SKIP LOCKED
    DB-->>SA: row locked
    SB->>DB: BEGIN
    SB->>DB: LockDueJob 1 SKIP LOCKED
    DB-->>SB: 0 rows
    SB->>DB: ROLLBACK
    SA->>DB: CountActiveExecutions
    DB-->>SA: 0
    SA->>DB: CreateExecution READY
    SA->>DB: UpdateJobNextRun
    SA->>DB: COMMIT
```

If `concurrency_max_executions` is 1 and an execution is already `CLAIMED`, `CountActive` returns 1 and `ScheduleDue` returns `ErrConcurrencyLimited` `server/internal/job/service.go:21`. Scheduler logs `schedule due failed` and skips.

### Worker race: two workers, same READY

Atomic claim via `UPDATE WHERE status READY`. `GetReadyExecutions` may return the same list to both workers, stale read is harmless because the claim decides.

```mermaid
sequenceDiagram
    participant WA as worker A
    participant DB as Postgres
    participant WB as worker B
    WA->>DB: GetReadyExecutions 10
    DB-->>WA: [42,43]
    WB->>DB: GetReadyExecutions 10
    DB-->>WB: [42,43]
    WA->>DB: TryClaim 42 WHERE READY
    DB-->>WA: CLAIMED, token abc
    WA->>DB: MarkRunning 42 where token abc
    WB->>DB: TryClaim 42 WHERE READY
    DB-->>WB: 0 rows
    WB->>DB: TryClaim 43 WHERE READY
    DB-->>WB: CLAIMED
```

`claim_token` is `uuid.NullUUID` and `lease_until` is 30s. `ReapExpiredLeases` runs every Tick before poll. It resets any `CLAIMED` or `RUNNING` where `lease_until < NOW()` to `READY` with cleared `claim_token`, `lease_until`, `worker_id`.

### Per-job vs global

Scheduler enforces per-job concurrency. Worker does not check it. This keeps scheduler lock short (under 1ms) and worker lease long (seconds). If worker checked per-job, it would hold a lock for seconds and kill throughput.

### Tenant isolation

Every lock and list is tenant scoped: `LockDueJob` checks `tenant_id`, `GetJobForTenant`, `ListJobs` where `tenant_id`, `ListExecutionsForJob` checks `job_id and tenant_id`, worker `GetReadyExecutions` joins through `jobs` but does not filter tenant at poll, tenant check happens on display via `ListExecutions`. A wrong `X-Tenant-ID` returns 404 or empty list, never touches another tenant's row.

### At-least-once

Scheduler and worker are at-least-once. `CreateExecution` and `doHTTP` are not in the same transaction. If worker crashes after `doHTTP 200` but before `CompleteExecutionSuccess`, the lease expires and another worker retries the same execution, the target may receive the POST twice. The execution id in the `attempts` table is the dedupe key the target should store.

## Failure modes

* Scheduler down 2 minutes: `jobs.next_run_at` stays past, when scheduler returns it creates one READY per overdue job, not per missed tick, because it does `NextRun` after the due time once per `ScheduleDue`.
* Worker down holding `CLAIMED`: lease 30s, reaped to `READY`, retried, attempts show gap.
* Target 500 three times: attempts `FAILURE`, `FAILURE`, `FAILURE`, execution `FAILURE` terminal, delays from `NextDelay` with initial 60 and max 3600.
* Timeout: `doHTTP` returns `context deadline exceeded`, attempt `TIMEOUT`, same retry, `result_error` holds the error text.
* SSRF: `validateTargetURL` `server/internal/job/store.go:302` and `server/internal/worker/http.go:1` block `169.254.169.254` and `metadata.google.internal`.
* DB down: `Tick` logs `ticker poll failed` or `worker poll failed` and returns, next Tick retries.

## Scaling and deployment

MVP in-process: one `*sql.DB` pool, `scheduler.NewTicker` and `worker.New` started from `server/cmd/api/main.go:72` with `context.WithCancel`. Signal `SIGINT` cancels both.

Split:

```
go build -o api ./cmd/api
go build -o scheduler ./cmd/scheduler  // same Ticker, own DB pool
go build -o worker ./cmd/worker        // same Worker, own DB pool
```

Any number of replicas, still fleet safe via `SKIP LOCKED` and atomic claim. No leader election.

Indexes to keep: `idx_jobs_next_run`, `idx_executions_ready`, `idx_executions_lease`. All partial, small.

## Config

From `server/internal/config/config.go:15`:

* `DB_URL` required, e.g. `postgres://user:pass@localhost:5432/cronio?sslmode=disable`
* `PORT` default `8080`, validated as int
* `LOG_LEVEL` default `info`, not enforced

`server/.env` loaded via `godotenv` when run from `server/`. In prod set env directly.

Server timeouts `server/internal/server/server.go:17`: `RequestID -> Recovery -> Logger -> Timeout 10s`, `http.Server ReadHeader 5s, Read 10s, Write 30s, Idle 60s`.

## Testing

From `server/`:

```
go vet ./...          # must pass
go test ./...         # job tests in-process, scheduler and worker need DB_URL
DB_URL=... go test ./internal/worker -run TestWorker_Tick -v
sqlc generate         # after editing queries/*.sql or migrations
go fmt ./...
```

Worker tests need `DB_URL` and use `httptest.NewServer` for success and 500, and push other READY to future for isolation.

## Future

From `docs/STATE.md:41`:

* `GET /v1/executions/{id}`, `DELETE` soft disable, `target.timeout`, `retry` and `concurrency` in API JSON, pagination
* `cmd/scheduler` and `cmd/worker` split, `leases` table, Prometheus `scheduler_claimed_total`, heartbeat renewal for long jobs
* NATS JetStream, dispatcher, SDK workers, encrypted `{{secret.*}}`, per-tenant quotas
* Next.js `web/` UI, SAML, audit logs
