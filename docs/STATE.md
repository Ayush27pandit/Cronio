# Cronio — current state for future sessions

This is the source of truth for where the product stands. `AGENTS.md` and `CONTEXT.md` are local-only and ignored by git. This file is tracked so any clone can pick up the work.

## What is built and working

**Domain:** `CONTEXT.md` locally defines Tenant, Job, Schedule (Cron 5-field, Interval, Once), Target (http), Execution, Attempt, Lease, Retry/Concurrency/Misfire policies. The code matches those names.

**Deep Job seam:** `server/internal/job/` owns the seam.
* `schedule.go` — typed `Schedule` with `NewCronSchedule`, `NewIntervalSchedule`, `NewOnceSchedule`, `NextRun` pure and UTC.
* `tenant.go` — distinct `TenantID` type, explicit param.
* `service.go` — `ScheduleDue` does `BEGIN; LockDueJob FOR UPDATE SKIP LOCKED tenant-scoped; CountActiveExecutions; typed Schedule rebuild; NextRun after due time; CreateExecution READY; UpdateJobNextRun` atomically.
* `store.go` — `Create`, `Update`, `Get`, `List`, `GetExecution` with `GetExecution` join and `ListAttempts`, `DeleteJob` soft delete with `SoftDeleteJob` `UPDATE enabled false` tenant scoped keeps executions, `validateCreateInput` helper, SSRF guard. `Create` and `Update` now handle `target_timeout_seconds` 5 to 300 default 30, `retry_max_attempts` 1 to 10 default 3, `concurrency_max_executions` 1 to 10 default 1.

**API:** `server/internal/server/server.go` with `chi`, `X-Tenant-ID` header middleware, `GET /health`, `POST /v1/jobs`, `GET /v1/jobs`, `GET /v1/jobs/{id}`, `PATCH /v1/jobs/{id}`, `DELETE /v1/jobs/{id}` soft delete `enabled false` keeps executions, `GET /v1/jobs/{id}/executions` (20 recent, tenant-scoped via `job.Service.ListExecutions`), `GET /v1/executions/{id}` with attempts and `job_name` and `target.url` tenant scoped via `job.Service.GetExecution`. `POST` and `PATCH` now accept `target.timeout_seconds` 5 to 300, `retry.max_attempts` 1 to 10, `concurrency.max_executions` 1 to 10 with defaults 30, 3, 1. All schedule validation reuses the typed constructors, so 400s happen before the DB. Static UI at `GET /` serves `server/static/index.html`.

**Scheduler ticker:** `server/internal/scheduler/ticker.go` polls `GetDueJobs 100` every second with a 5s per-tick timeout, then calls `ScheduleDue` per row. Fleet safe via `SKIP LOCKED`. Lives inside `server/cmd/api` for MVP, easy to split to `cmd/scheduler` later. Integration tests use a real Neon DB when `DB_URL` is set.

**Worker fleet:** `server/internal/worker/` owns the claim and execute seam. `service.go` polls `GetReadyExecutions 10` every second with 30s per-tick timeout, `TryClaimExecution` with `gen_random_uuid()` and `lease_until NOW()+30s`, `MarkRunning`, `CreateAttempt RUNNING`, `doHTTP` with `target_timeout_seconds` default 30 and SSRF guard, `CompleteAttempt` and `CompleteExecutionSuccess` on 2xx or `RescheduleForRetry` with exponential backoff (`NextDelay` pure, `retry_initial_delay_seconds` 60, cap `retry_max_delay_seconds` 3600) or `FailExecution` terminal. Also `ReapExpiredLeases` resets stuck `CLAIMED/RUNNING` to `READY`. Lives inside `server/cmd/api` for MVP, will split to `cmd/worker` for independent scaling. Integration tests use Neon DB and `httptest` server.

**DB:** Postgres 15 on Neon, `pgcrypto`, migrations `jobs`, `executions`, `attempts`, partial index `idx_jobs_next_run where enabled`, `idx_executions_ready where status READY` and `idx_executions_lease where status IN (CLAIMED,RUNNING)`, `worker.sql` for claim and execution queries, `execution.sql` for `GetExecution` and `SoftDeleteJob`, `job.sql` now has `target_timeout_seconds`, `retry_max_attempts`, `concurrency_max_executions` in `CreateJob` and `UpdateJob`, `scheduler.sql` fixed from `schedular.sql`, generated code in `server/internal/database/generated/` is committed.

**Ops fix:** `server/internal/database/migrate.go` no longer calls `m.Close()` that closed the main pool. `server/cmd/api/main.go` migrates on a throwaway `mdb` then pings the main `db` to confirm it stayed open. Verified with `go build -o /tmp/cronio && /tmp/cronio` — `POST /v1/jobs` now returns `201`.

**Docs:** `Readme.md` reflects what is done vs next, `docs/architecture.md` explains deep modules and the DB, `docs/api.md` lists every endpoint with curl, `docs/STATE.md` here keeps future sessions in sync. `server/.env` holds `DB_URL` with `sslmode=require&channel_binding=require` and is loaded via `godotenv` when run from `server/`.

**Frontend:** quick visual at `http://localhost:8080/` served from `server/static/index.html`. Tailwind via CDN, vanilla JS, tenant input, create form, jobs list, detail with `GET /v1/jobs/{id}/executions` (10 recent). Auto-refreshes every 2s. No build step, just `go run`.

## How to run

```bash
# from server/
go vet ./... && go test ./...   # job tests in-process, scheduler tests need DB_URL
go build -o /tmp/cronio ./cmd/api && /tmp/cronio
# or go run ./cmd/api (build is more reliable for background)

TENANT=11111111-1111-1111-1111-111111111111
curl -X POST http://localhost:8080/v1/jobs -H "X-Tenant-ID: $TENANT" -H "Content-Type: application/json" -d '{"name":"daily report","schedule":{"type":"cron","expression":"0 9 * * *","timezone":"Asia/Kolkata"},"target":{"url":"https://example.com/reports"}}'
```

No `DATABASE_URL`, only `DB_URL`. `lsof -ti :8080 | xargs kill -9` before a rebuild.

## What is not built yet

* Pagination and filtering, `retry` `initial_delay` and `max_delay` and `misfire` not exposed yet. `retry max_attempts`, `concurrency max_executions`, and `target timeout_seconds` are now exposed via `POST` and `PATCH`, `DELETE` is soft delete now that keeps history.
* API keys per tenant. Today it is a header you pick.
* Scheduler and worker as `cmd/scheduler` and `cmd/worker` for independent scaling, `leases` table separate from `executions`, Prometheus metrics.
* Full Next.js UI in `web/`. Quick visual is done at `http://localhost:8080/`.

## Future plans

**Next slice, soft delete and retry fields are done.** Detail endpoint unblocks the UI, soft delete keeps history, retry and concurrency are now tunable via API.

**Roadmap from the product plan:**

* Phase 1 MVP remainder — pagination, `retry` `initial_delay` and `max_delay` and `misfire`, Prometheus `scheduler_claimed_total` and `lease` expiry, per-tenant isolation in every query.
* Phase 1.5 — outbox plus NATS JetStream, dispatcher, SDK workers in Go, Python, Node, encrypted `{{secret.*}}`, per-tenant and per-worker concurrency, calendar exceptions.
* Phase 2 — event triggers, DAGs with fan-out, SAML, RBAC, audit logs, OpenTelemetry tracing, PagerDuty and Slack, multi-region.

## For the next agent

* Read this file plus `Readme.md`, `docs/architecture.md`, `docs/api.md` before touching code.
* The deep seam is `server/internal/job/`. Do not leak `sql.NullTime` or raw cron strings past it.
* `server/internal/scheduler/ticker.go` `Tick` is the test surface. Tests hit `Tick` directly, not `time.Sleep`.
* Keep history clean. One commit per phase, `go vet` must stay green. `AGENTS.md` and `CONTEXT.md` are local-only, do not re-add them to git.
* If you add a field, add it to the typed `Schedule` or `CreateInput` first, then to the `queries/job.sql` and `sqlc generate`, then to the handler.
