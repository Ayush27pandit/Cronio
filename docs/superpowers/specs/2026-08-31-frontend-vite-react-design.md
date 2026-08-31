# Frontend Vite React design — Cronio

This spec covers the separate `web/` that will replace `server/static/index.html` but keep `server` serving API only. It builds the full parity UI you asked for with separate deploys and live polling.

## Goal

Deploy `web` on 3000 and `api` on 8080 separately. Stop using curl for jobs. Create, list, view, delete soft, and view execution detail with attempts, plus the new `target.timeout_seconds`, `retry.max_attempts`, `concurrency.max_executions` controls. Poll executions every 2s. Keep tenant input as `X-Tenant-ID` for MVP, add 3rd party auth later behind the same fetch layer.

## Non-goals

No SSR, no Next.js, no `cmd/worker` split in this spec. No `retry` `initial_delay` or `misfire` fields, no pagination, no API keys. Those stay in `docs/STATE.md:43`.

## Assumptions

* `server/` stays Go, `web/` is Vite React TypeScript, both run locally `npm run dev` and `go run ./cmd/api` with `VITE_API_URL=http://localhost:8080`.
* CORS is `*` for MVP or `http://localhost:3000` allow header `X-Tenant-ID`.
* Tenant is a text input stored in `localStorage` for MVP, later swapped to Clerk JWT without changing TanStack code.
* `server/internal/server/server.go:40` endpoints are stable: `POST /v1/jobs`, `GET /v1/jobs`, `GET /v1/jobs/{id}`, `PATCH /v1/jobs/{id}`, `DELETE /v1/jobs/{id}` soft, `GET /v1/jobs/{id}/executions`, `GET /v1/executions/{id}`.

## Architecture

```
browser web/ Vite React
  React Router  /jobs  /jobs/:id  /executions/:id
  TanStack Query useQuery GET /v1/jobs, executions, execution detail with refetchInterval 2000
  fetch layer adds X-Tenant-ID from localStorage, parses JSON, maps to 400/404 error
      |
      |  VITE_API_URL http://localhost:8080
      v
Go API server/cmd/api 8080
  chi, Tenant middleware, job.Service
      |
      v
  Postgres jobs, executions, attempts
```

`web/` is static. `server/static/index.html` stays but `server` no longer serves `web` files, only `api` and quick visual. Deploy `web/dist` to S3 or Vercel static, `server` to your VM or Fly.

## Components and pages

`web/src/`:

* `main.tsx` mounts `App` with `QueryClientProvider` and `BrowserRouter`.
* `lib/api.ts` fetch helpers: `createJob`, `listJobs`, `getJob`, `patchJob`, `deleteJob`, `listExecutions`, `getExecution`. Each takes `tenantId` and adds `X-Tenant-ID` header, throws `ApiError` with `code` from `docs/api.md:28`.
* `lib/tenant.ts` reads `localStorage tenant`, validates UUID via `job.NewTenantID` style, provides `TenantInput` component.
* `routes/jobs.tsx` list page: `useQuery listJobs`, table with name, schedule, target url, timeout, retry, concurrency, enabled badge, next_run_at, delete soft button, create link.
* `routes/jobs.$id.tsx` detail: `useQuery getJob` and `useQuery listExecutions`, tabs for executions, `GET /v1/executions/{id}` detail drawer for attempts.
* `components/JobForm.tsx` create and edit: `react-hook-form` plus `zod` schema for name max 200, schedule type and expression, target url http/https and timeout 5 to 300, retry 1 to 10, concurrency 1 to 10, same ranges as `server/internal/job/store.go:74`. Submits to `createJob` or `patchJob`.
* `components/ExecutionsTable.tsx` and `ExecutionDetail.tsx` for `GET /v1/executions/{id}` attempts: attempt_number, status, response_status_code, response_body truncated, error_message, started_at.
* `components/DeleteJob.tsx` calls `DELETE /v1/jobs/{id}` soft, then invalidates `listJobs`.

All components are small, one clear purpose, props are the row types from `lib/api.ts` not raw fetch.

## Data flow and polling

* List jobs: `useQuery(["jobs", tenant], listJobs)` no poll, refetch on focus and after create, patch, delete invalidations.
* Executions per job: `useQuery(["executions", jobId], listExecutions, {refetchInterval: 2000})` only when detail is open.
* Execution detail: `useQuery(["execution", execId], getExecution, {refetchInterval: 2000})` for the drawer.

TanStack handles dedupe and retry, no manual `setInterval` like `static/index.html:236`.

## Error handling

* 400 `missing_tenant`, `invalid_tenant`, `invalid_schedule`, `invalid_target` shows inline under the field, not a toast, using `ApiError.code`.
* 404 `not_found` for wrong tenant shows empty state with tenant input, consistent with `GET /v1/jobs` returning empty for a different tenant.
* 405, 500, timeout from `GET /v1/executions` shows `result_error` and `attempts` table, worker retry history stays visible because `DELETE` is soft.

## Auth migration

MVP keeps `TenantInput` text as `static/index.html:23` does. Later add `ClerkProvider` in `main.tsx`:

```
<ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
```

Replace `lib/tenant.ts` read from `localStorage` with `useAuth().getToken()` and derive `tenantId` from the JWT claim. No change to `lib/api.ts` signature, just the tenant source. No server change until you want httpOnly, at that point `web` would move to Next.js and the tenant read moves to `cookies` server side.

## Testing

* `web/src/lib/api.test.ts` with `msw` mock for 201, 400, 404 for create and getExecution, tenant header check.
* `web/src/components/JobForm.test.tsx` with `vitest` for validation: name required, timeout 5 to 300, retry 1 to 10.
* `go vet ./...` still from `server/` unaffected.

## Build and deploy

```
# web/
npm create vite@latest web -- --template react-ts
npm install @tanstack/react-query react-router-dom tailwindcss
VITE_API_URL=http://localhost:8080 npm run dev   # 3000
VITE_API_URL=https://api.cronio.example.com npm run build  # dist
```

`server` CORS: allow `http://localhost:3000` and `https://cronio.example.com` with `X-Tenant-ID`.

## Scale and future

* No change to `server` scaling, `web` is static and scales on CDN.
* Next step is Next.js only if you need httpOnly session server side for customers. The React components move as is to `web/app`.

## Success criteria

* From `web` you can create a job with `timeout_seconds`, `retry.max_attempts`, `concurrency.max_executions`, see it in list with those fields, patch them, see executions poll every 2s, open an execution and see attempts, delete soft and still see the job with `enabled false` and executions history.
* No `curl` needed for those flows.
