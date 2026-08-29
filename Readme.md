# Cronio

> **The execution layer for time.**
>
> A distributed job scheduling and execution platform built for reliability, observability, and scale.

[![Go Version](https://img.shields.io/badge/go-1.22+-00ADD8?logo=go)](https://go.dev)
[![PostgreSQL](https://img.shields.io/badge/postgres-15+-4169E1?logo=postgresql)](https://postgresql.org)
[![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

Cronio replaces crontabs and one-off schedulers with one place to create a job, say when it fires, and see what happened. If it has a schedule, it belongs in Cronio.

---

## Status

Working, not finished. The deep `Job` seam is done and the API can create and list jobs per tenant. The scheduler ticker and worker fleet are next.

| Area | Done | Next |
|------|------|------|
| Job definition | typed `Schedule` (cron 5-field, interval, once), tenant isolation, `next_run_at` calc | `retry` and `concurrency` fields in the API |
| Storage | Postgres with `pgcrypto`, migrations `jobs`, `executions`, `attempts`, `FOR UPDATE SKIP LOCKED` | separate `leases` table when needed |
| API | `POST /v1/jobs`, `GET /v1/jobs`, `GET /v1/jobs/{id}`, `PATCH /v1/jobs/{id}`, `GET /health`, `X-Tenant-ID` header | `DELETE`, execution endpoints, API keys |
| Scheduler | `job.Service.ScheduleDue` owns the atomic `lock → count → create execution → advance next_run` behind one seam | ticker loop that calls it every second |
| Worker | target URL validation and SSRF guard | claim, heartbeat, HTTP execute, retry |

See `CONTEXT.md` for the domain language and `docs/` for details.

---

## Quick start

**Requirements:** Go 1.22+, Postgres 15+ with `pgcrypto`, `DB_URL`.

```bash
# from server/
cp .env.example .env  # then set DB_URL=postgres://user:pass@localhost:5432/cronio?sslmode=disable
go vet ./...          # must pass
go test ./...         # in-process job tests, no DB needed
go run ./cmd/api      # or go build -o /tmp/cronio ./cmd/api && /tmp/cronio
curl http://localhost:8080/health
# {"status":"ok"}
```

Create a job. Pick any UUID as your tenant and reuse it.

```bash
TENANT=11111111-1111-1111-1111-111111111111

curl -X POST http://localhost:8080/v1/jobs \
  -H "X-Tenant-ID: $TENANT" -H "Content-Type: application/json" \
  -d '{
    "name":"daily report",
    "schedule":{"type":"cron","expression":"0 9 * * *","timezone":"Asia/Kolkata"},
    "target":{"url":"https://example.com/reports"}
  }'

curl -H "X-Tenant-ID: $TENANT" http://localhost:8080/v1/jobs
curl -H "X-Tenant-ID: $TENANT" http://localhost:8080/v1/jobs/{id}
curl -X PATCH http://localhost:8080/v1/jobs/{id} -H "X-Tenant-ID: $TENANT" -H "Content-Type: application/json" -d '{"enabled":false}'
```

No `DATABASE_URL`, only `DB_URL`. `server/.env` is loaded via `godotenv` when you run from `server/`. In prod, set env directly.

More examples: `docs/api.md`.

---

## Why Cronio

| Problem | How Cronio handles it |
|---------|---------------------|
| Cron jobs die with the server | scheduler fleet with `SKIP LOCKED`, any scheduler can pick up a due job |
| No history when something fails | executions and attempts keep request and response bodies |
| One slow job blocks the rest | per-job `max_executions` checked inside the same transaction |
| Every app builds its own scheduler | one API, one SDK, regardless of language |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      CONTROL PLANE                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  API        │  │  Scheduler  │  │  Dispatcher         │  │
│  │  (Go)       │  │  Fleet (Go) │  │  (Go, optional)     │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         └─────────────────┼────────────────────┘             │
│                           ▼                                  │
│                  ┌─────────────────┐                         │
│                  │   PostgreSQL    │                         │
│                  │  Source of Truth│                         │
│                  └─────────────────┘                         │
└─────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATA PLANE                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  Queue      │  │  Worker     │  │  Job Targets        │  │
│  │  (Postgres  │  │  Fleet (Go) │  │  HTTP / SDK Workers │  │
│  │   or NATS)  │  │             │  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

* **Postgres is the source of truth.** The queue moves ids, Postgres decides what is due and who holds the lock.
* **Schedulers do not execute.** They find due jobs and create `READY` executions. Workers do the HTTP call.
* **At-least-once.** Cronio gives you the execution id, your target handles dedupe.
* **Independent scaling.** API, schedulers, and workers scale on their own load.

Current deep module: `server/internal/job/` owns the Job seam. `schedule.go` holds typed `Schedule`, `tenant.go` holds `TenantID`, `service.go` holds `ScheduleDue` with `SKIP LOCKED` and concurrency, `store.go` holds `Create` and `Update`. The old `internal/scheduler/` and `internal/database/repository/` were shallow and are gone.

Details: `docs/architecture.md`.

---

## Docs

* `CONTEXT.md` — the 13 domain terms: Tenant, Job, Schedule, Execution, and so on.
* `docs/architecture.md` — modules, seams, transactions, and the DB schema.
* `docs/api.md` — endpoints, tenant header, request and response shapes, and curl examples.
* `AGENTS.md` — commands that actually work in this repo, quirks, and what `go vet` expects.

---

## Development

Module root is `server/`, not the repo root.

```bash
go vet ./...    # from server/, must pass before test
go test ./...   # job tests are in-process, DB tests need live Postgres
sqlc generate   # after editing queries/*.sql or migrations
go fmt ./...
```

Generated code in `server/internal/database/generated/` is committed. Do not hand edit it.

No Makefile or CI yet. `.opencode/` is plugin cache.

---

## License

MIT. See `LICENSE` if present.
