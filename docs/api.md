# API

Base URL is `http://localhost:8080`. All job routes live under `/v1` and need a tenant.

## Tenant

Every request to `/v1` must send

```
X-Tenant-ID: 11111111-1111-1111-1111-111111111111
```

Any valid UUID works. Keep the same one for all calls to see only your jobs. Send a different one and the list is empty. In local dev just pick `111...` and reuse it. The service validates it with `job.NewTenantID` and the `SKIP LOCKED` query checks `where tenant_id = $2`, so a wrong tenant never touches another tenant's row.

Health is open:

```
GET /health → 200 {"status":"ok"}
```

## Errors

All errors are JSON:

```json
{"error":{"code":"missing_tenant","message":"X-Tenant-ID header is required"}}
```

Codes you will see: `missing_tenant`, `invalid_tenant`, `invalid_json`, `invalid_request`, `invalid_schedule`, `invalid_target`, `invalid_id`, `not_found`, `internal_error`. Validation is `400`, not found is `404`.

## Create a job

```
POST /v1/jobs
Content-Type: application/json
X-Tenant-ID: 11111111-1111-1111-1111-111111111111
```

Body:

```json
{
  "name": "daily report",
  "description": "optional",
  "schedule": {
    "type": "cron",
    "expression": "0 9 * * *",
    "timezone": "Asia/Kolkata"
  },
  "target": {
    "url": "https://example.com/reports"
  }
}
```

* `name` required, max 200, trimmed.
* `schedule.type` is `cron`, `interval`, or `once`.
  * `cron` needs 5-field `expression` like `0 9 * * *` and optional `timezone` like `Asia/Kolkata`. Empty timezone defaults to `UTC`. Validation uses `robfig/cron` and `time.LoadLocation` at creation.
  * `interval` needs Go duration like `15m`, `1h`, must be greater than zero.
  * `once` needs RFC3339 like `2026-09-01T09:00:00Z`. If it is already past, the job is created disabled with no `next_run_at`.
* `target.url` required, must be `http` or `https`, host present, `169.254.169.254` is blocked for SSRF in MVP.

`next_run_at` is computed from the typed `Schedule` with `NextRun(time.Now().UTC())` inside `job.Service.Create` and stored as UTC.

Example with interval:

```json
{
  "name": "health check",
  "schedule": {"type": "interval", "expression": "15m"},
  "target": {"url": "https://example.com/ping"}
}
```

Example with once:

```json
{
  "name": "one off",
  "schedule": {"type": "once", "expression": "2026-09-01T09:00:00Z"},
  "target": {"url": "https://example.com/once"}
}
```

Response is `201`:

```json
{
  "id": "2e3212e2-65fb-4b1c-9440-fc8eb356fbb5",
  "tenant_id": "11111111-1111-1111-1111-111111111111",
  "name": "daily report",
  "schedule": {"type": "cron", "expression": "0 9 * * *", "timezone": "Asia/Kolkata"},
  "target": {"url": "https://example.com/reports"},
  "next_run_at": "2026-08-30T09:00:00+05:30",
  "enabled": true,
  "created_at": "2026-08-30T00:40:46+05:30"
}
```

For a past Once, `enabled` is `false` and `next_run_at` is `null`.

Curl:

```bash
TENANT=11111111-1111-1111-1111-111111111111
curl -X POST http://localhost:8080/v1/jobs \
  -H "X-Tenant-ID: $TENANT" -H "Content-Type: application/json" \
  -d '{"name":"daily report","schedule":{"type":"cron","expression":"0 9 * * *","timezone":"Asia/Kolkata"},"target":{"url":"https://example.com/reports"}}'
```

## List jobs

```
GET /v1/jobs
X-Tenant-ID: 11111111-1111-1111-1111-111111111111
```

`200`:

```json
{"jobs":[
  {"id":"...","name":"daily report","schedule":{"type":"cron",...},"target":{"url":"..."},"next_run_at":"...","enabled":true}
]}
```

Sorted newest first. Tenant scoped, no pagination yet.

```bash
curl -H "X-Tenant-ID: $TENANT" http://localhost:8080/v1/jobs
```

## Get one job

```
GET /v1/jobs/{id}
```

`200` with the same shape as create, or `404` if the id does not belong to the tenant.

```bash
curl -H "X-Tenant-ID: $TENANT" http://localhost:8080/v1/jobs/2e3212e2-65fb-4b1c-9440-fc8eb356fbb5
```

## Patch a job

```
PATCH /v1/jobs/{id}
Content-Type: application/json
X-Tenant-ID: 11111111-1111-1111-1111-111111111111
```

Body may contain any of `name`, `description`, `enabled`, `schedule`, `target`. Omitted fields are left alone.

```json
{"enabled": false}
{"name": "daily report v2"}
{"schedule": {"type": "interval", "expression": "30m"}}
{"target": {"url": "https://example.com/v2"}}
```

If `schedule` changes, `next_run_at` and `enabled` are recomputed via `NextRun`. Disabling sets `next_run_at` to `null`. Re-enabling a job that had no `next_run_at` recomputes it from the current schedule.

`description` is a pointer: `null` or missing leaves it alone, `""` clears it.

Response is `200` with the updated row, `400` for validation, `404` for wrong tenant or id.

```bash
# pause
curl -X PATCH http://localhost:8080/v1/jobs/$ID -H "X-Tenant-ID: $TENANT" -H "Content-Type: application/json" -d '{"enabled":false}'

# resume and retarget
curl -X PATCH http://localhost:8080/v1/jobs/$ID -H "X-Tenant-ID: $TENANT" -H "Content-Type: application/json" -d '{"enabled":true,"target":{"url":"https://example.com/v2"}}'
```

## What is not there yet

* `DELETE` is a soft disable via `PATCH {"enabled":false}`. Hard delete is planned.
* `retry_policy`, `concurrency`, `misfire` are columns but not exposed in the JSON yet.
* Execution endpoints `GET /v1/jobs/{id}/executions` and `GET /v1/executions/{id}` are tables only, no handlers.
* Auth is header only. API keys per tenant are planned.
* Pagination and filtering are not there.

For the Go side, handlers are thin mappers in `server/internal/server/server.go`. All `Schedule` parsing lives in `server/internal/job/`.
