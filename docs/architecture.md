# Architecture

Cronio keeps the database as the source of truth. Schedulers find due jobs and create executions. Workers claim executions and call your HTTP endpoint. The API creates jobs. Each part scales on its own.

## Modules and seams

We use deep modules: a small interface that hides a lot of behavior. One interface, many call sites. Bugs and changes stay behind the seam.

### The deep Job module

Location: `server/internal/job/`

It owns the Job seam and everything behind it. Callers learn three constructors and a few methods. They never import `database/sql` or `cron`.

* `schedule.go` — `Schedule`. Build it with `NewCronSchedule`, `NewIntervalSchedule`, `NewOnceSchedule`. Validation happens at construction, not on every tick. `NextRun(from)` is pure and returns UTC. Cron is 5-field plus `time.LoadLocation`, interval is `time.ParseDuration` greater than zero, once is `time.RFC3339` that disables when past.
* `tenant.go` — `TenantID uuid.UUID` as a distinct type. It forces callers to pass a tenant and prevents swapping `jobID` and `tenantID`.
* `service.go` — `ScheduleDue(ctx, TenantID, jobID)`. One transaction: `LockDueJob FOR UPDATE SKIP LOCKED` tenant-scoped, `CountActiveExecutions` for `concurrency_max_executions`, typed `Schedule` rebuild and `NextRun` after the due time, `CreateExecution` with `scheduled_at` equal to the due time, `UpdateJobNextRun` with `enabled=false` for a finished Once. Fleet safe, at-least-once, no caller glue.
* `store.go` — `Create` and `Update` and `Get` and `List`. They validate `name`, `target_url`, and presence of a schedule, compute `next_run_at` from `Schedule.NextRun(time.Now())`, and hide `sql.NullTime` and `sql.NullString`.

The old shallow cluster `internal/scheduler/`, `internal/database/repository/`, `internal/jobs/`, `internal/schedular/` existed to make testing easy but pushed bugs to callers. Deleting them made locality better.

### HTTP plane

Location: `server/internal/server/` and `server/internal/server/middleware/`

Chi router with four middlewares in order `RequestID → Recovery → Logger → Timeout(10s)` plus `server` timeouts `ReadHeader 5s/Read 10s/Write 30s`. `GET /health` is open. `/v1` is protected by `Tenant` middleware that reads `X-Tenant-ID` and validates UUID. Handlers in `server.go` are thin mappers: JSON → typed `Schedule` → `job.Service` → JSON and status codes. All schedule parsing lives in the Job module, not in the handler.

### Config and wiring

`server/internal/config/config.go` reads `DB_URL` required and `PORT` and `LOG_LEVEL` with defaults. `server/cmd/api/main.go` loads `server/.env` via `godotenv` when run from `server/`, connects with `database.New` which pings with 5 seconds, runs migrations from the embedded `migrations/*.sql` via `golang-migrate` on a throwaway connection so the main pool stays open, then creates `job.New(db)` and `server.New(port, logger, db)`.

### Database

Postgres 15+ with `pgcrypto` for `gen_random_uuid()`.

* `jobs` — the card on the wall: `tenant_id`, `name`, `schedule_type` check `cron|interval|once`, `schedule_expr`, `timezone default UTC`, `target_*`, `retry_*`, `concurrency_max_executions default 1`, `misfire_policy default fire_once`, `enabled`, `next_run_at timestamptz` with partial index `idx_jobs_next_run where enabled=true`, `metadata jsonb`.
* `executions` — one chit per firing: `job_id → jobs`, `tenant_id`, `status` `READY|CLAIMED|RUNNING|SUCCESS|FAILURE|TIMEOUT|CANCELLED|DEAD`, `scheduled_at`, `claimed_at`, `lease_until`, `claim_token`. Indexes on `status = READY` and `lease_until where status in (CLAIMED,RUNNING)`.
* `attempts` — one try within an execution: `execution_id → executions`, `attempt_number`, `status` `RUNNING|SUCCESS|FAILURE|TIMEOUT`, request and response bodies and headers.

Generated code in `server/internal/database/generated/` is committed. Edit `queries/*.sql` then `sqlc generate`. Do not hand edit. The typo `schedular.sql` was fixed to `scheduler.sql` and handling now uses `SKIP LOCKED`.

### Transactions

`ScheduleDue` is the only place that writes both `executions` and `jobs.next_run_at` together. It holds the row lock for less than a millisecond, then releases. Workers hold the lease for seconds. That split is why schedulers and workers scale separately.

### Scaling and failure

Run one API and two schedulers. Both poll `GetDueJobs` every second, but `SKIP LOCKED` means they take different rows. Kill one scheduler, the other picks up within a tick. Kill a worker holding a `CLAIMED` execution, its lease expires after 30 seconds and another worker claims it. Retries use exponential backoff inside the worker, not in the Job module.

### What is not built yet

The ticker loop that calls `ScheduleDue` for every due job, the worker fleet that does the HTTP call and heartbeat, the dispatcher and NATS outbox, and the UI. The API today is `POST /v1/jobs`, `GET /v1/jobs`, `GET /v1/jobs/{id}`, `PATCH /v1/jobs/{id}`. Execution endpoints, API keys, and per-tenant quotas are planned.
