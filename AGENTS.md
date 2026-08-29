# Project Rules

## Mandatory Skills

**ALWAYS load and follow these for every task. No exceptions.**

### 1. karpathy-guidelines — every coding task

For writing, reviewing, or refactoring:

1. Invoke skill: `karpathy-guidelines` (`~/.config/opencode/skills/karpathy-guidelines/SKILL.md:1`, project copy at `.opencode/skills/karpathy-guidelines/SKILL.md:1`)
2. State assumptions explicitly
3. Choose simplest solution (no speculative features)
4. Make surgical changes only (touch only what was asked)
5. Define verifiable success criteria and loop until verified

### 2. unslop — every writing task

For any docs, comments, messages, README, or user-facing text:

1. Invoke skill: `unslop` (`~/.config/opencode/skills/unslop/SKILL.md:1`, project copy at `.opencode/skills/unslop/SKILL.md:1`)
2. Scan for puffery, AI vocab, em dashes, bold-label lists, chatbot phrases per the skill's 31 patterns
3. Rewrite for human voice: vary rhythm, have opinions, use plain words, active voice

If you skip either skill, you are violating project policy.

# Cronio — Execution Layer for Time

Distributed job scheduler (README: cron-first trigger, Postgres is source of truth, at-least-once, scheduler ≠ worker).

## Stack & Layout

- **Runtime:** Go (README badge `1.22+`, `server/go.mod:3` says `1.27.0` — invalid, treat as `1.22`), Postgres `15+` with `pgcrypto`, `chi/v5`, `jackc/pgx/v5/stdlib`, `sqlc`, `golang-migrate/migrate/v4`, `robfig/cron/v3` (5-field only).
- **Module root is `server/`**, not repo root. All `go` commands run from `server/` (`server/go.mod:1` module `github.com/Ayush27pandit/Cronio/server`).
- **Entrypoint:** `server/cmd/api/main.go:20` — `godotenv.Load()` (optional) → `config.LoadConfig()` → `database.New()` → `database.Migrate()` (embed FS) → `server.New()` (chi). Only route is `GET /health` (`server/internal/server/server.go:20`).
- **Empty scaffolding:** `server/internal/jobs/`, `server/internal/schedular/` (typo), `server/cmd/worker/` are empty; `server/internal/scheduler/schedule_te.go:1` is empty and **breaks `go vet`/`go test`** — delete or rename to `schedule_test.go` first.
- **No CI / lint / task runner config** — no Makefile, `golangci-lint`, pre-commit, or `.github/workflows` to respect. `.opencode/` is plugin cache (ignore).

## Commands (run from `server/`)

```bash
go vet ./...          # must pass before test; currently fails on schedule_te.go
go test ./...         # no tests yet; needs live Postgres for DB tests when added
go run ./cmd/api      # requires DB_URL; loads server/.env if present
sqlc generate         # after editing internal/database/queries/*.sql or migrations; output is committed to internal/database/generated/
go fmt ./...
```

Order: `vet -> test -> run`. No `DATABASE_URL` — canonical var is `DB_URL`.

## Config & Env Quirks

- **Required:** `DB_URL` (Postgres DSN, `config/config.go:30`), e.g. `postgres://user:pass@localhost:5432/cronio?sslmode=disable`. Optional: `PORT` (default `8080`, validated `strconv.Atoi` only in `config/config.go:22`), `LOG_LEVEL` (default `info`, not enforced).
- **`server/.env` auto-loaded** via `godotenv.Load()` relative to cwd (`cmd/api/main.go:24`). Run from `server/` so it finds `server/.env`; in prod provide env directly (`.env` gitignored per `.gitignore:2`).
- **DB:** `database/db.go:13` uses `pgx` stdlib wrapper, `5s` ping timeout, no pool tuning. `database/migrate.go:14` embeds `migrations/*.sql` via `iofs` + `pgx` driver and runs `m.Up()` on every startup.
- **Migrations:** `001_create_jobs`, `002_create_executions`, `003_create_attempts` (all `up.sql` create, `down.sql` drop). `jobs.next_run_at` indexed `WHERE enabled=true` (`001_create_jobs.up.sql:42`).
- **Server timeouts:** middleware `Timeout(10s)` (`server.go:18`) + `http.Server` `ReadHeaderTimeout 5s / ReadTimeout 10s / WriteTimeout 30s / IdleTimeout 60s` (`server.go:29-32`). Chain is `RequestID -> Recovery -> Logger -> Timeout`.

## Architecture Notes (non-obvious)

- **Scheduler logic:** `internal/scheduler/schedule.go:16` `NextRun(Schedule{Type,Expression,Timezone}, from)` dispatches `cron` (5-field `MIN HOUR DOM MONTH DOW`, `Timezone` via `time.LoadLocation`, returns UTC), `interval` (Go `time.ParseDuration`, must be `>0`), `once` (`time.RFC3339`, disables if `!next.After(from)`).
- **SQL:** `internal/database/queries/job.sql` + `schedular.sql` (typo — file is `schedular.sql:1`, generated as `schedular.sql.go:1`) via `sqlc.yaml:1` (`engine: postgresql`, `sql_package: database/sql`, `emit_json_tags: true`). Edit queries → `sqlc generate`.
- **Repository:** `internal/database/repository/scheduler.go:24` `ScheduleJob` does `BEGIN; LockDueJob FOR UPDATE; CreateExecution; UpdateJobNextRun; COMMIT` — currently missing `SKIP LOCKED` and hard-codes `Enabled:true`.
- **Middleware:** `server/internal/server/middleware/` — `RequestID` always generates new UUID (ignores incoming `X-Request-ID`), `Recovery` logs via `slog` and returns `500 {"error":"internal server error"}`, `Logger` captures status via wrapped `ResponseWriter`.

## Gotchas

- Fix `schedule_te.go` before any `go` command or CI will fail.
- `schedular` vs `scheduler` typo is load-bearing — rename requires updating `sqlc.yaml`, queries, and `generated/` imports.
- Generated code (`internal/database/generated/`) is committed — don't hand-edit; rerun `sqlc generate`.
- Health check does not ping DB — `ok` even if Postgres down.
- No auth/tenant extraction yet; `jobs.tenant_id` exists but `ListJobs`/`GetJob` have no middleware enforcing it.
- Keep changes surgical — next to `.opencode/skills/karpathy-guidelines/SKILL.md:1` rule, don't reformat adjacent code.
