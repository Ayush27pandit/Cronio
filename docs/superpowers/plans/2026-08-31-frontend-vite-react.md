# Frontend Vite React implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build separate `web/` Vite React TypeScript app that does full parity jobs CRUD, execution detail with attempts, soft delete, and live polling every 2s, deployed separately from Go API.

**Architecture:** `web/` on 3000 proxies to `api` on 8080 via `VITE_API_URL`. React Router for `/jobs` and `/jobs/:id` and `/executions/:id`, TanStack Query for `GET /v1/jobs` and `GET /v1/jobs/:id/executions` and `GET /v1/executions/:id` with `refetchInterval 2000`, `lib/api.ts` adds `X-Tenant-ID` from `localStorage`, `JobForm` validates `target.timeout_seconds` 5 to 300, `retry.max_attempts` 1 to 10, `concurrency.max_executions` 1 to 10 same as server.

**Tech Stack:** Vite 5, React 18, TypeScript 5, React Router 6, TanStack Query 5, Tailwind 3, React Hook Form, Zod, Vitest, MSW

## Global constraints

- Go API stays at `http://localhost:8080` with `X-Tenant-ID` header, tenant input for MVP, later Clerk migration keeps `lib/api.ts` signature
- API contracts from `docs/api.md:31` with `POST /v1/jobs`, `GET /v1/jobs`, `GET /v1/jobs/:id`, `PATCH`, `DELETE` soft, `GET /v1/jobs/:id/executions`, `GET /v1/executions/:id`
- Node 20+, `web/` is separate deploy, `server/` stays Go, `go vet ./...` still from `server/`
- Tailwind via `tailwind.config.js`, no `server/static/index.html` change in this plan, keep quick visual
- YAGNI: no SSR, no pagination, no API keys in this plan, keep to `web/src` only

---

### Task 1: scaffold Vite React TS with Tailwind Router Query

**Files:**
- Create: `web/package.json`
- Create: `web/vite.config.ts`
- Create: `web/tsconfig.json`
- Create: `web/tailwind.config.js`
- Create: `web/postcss.config.js`
- Create: `web/index.html`
- Create: `web/src/main.tsx`
- Create: `web/src/App.tsx`
- Create: `web/src/index.css`

**Interfaces:**
- Consumes: none
- Produces: `web` dev server on 3000, `VITE_API_URL` env, `App` with `QueryClientProvider` and `BrowserRouter`

- [ ] **Step 1: Create web/package.json**

```json
{
  "name": "cronio-web",
  "type": "module",
  "scripts": {
    "dev": "vite --port 3000",
    "build": "tsc && vite build",
    "test": "vitest run",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.23.0",
    "@tanstack/react-query": "^5.50.0",
    "react-hook-form": "^7.51.0",
    "zod": "^3.23.0",
    "@hookform/resolvers": "^3.4.0"
  },
  "devDependencies": {
    "typescript": "^5.4.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "vite": "^5.2.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^3.4.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "vitest": "^1.5.0",
    "msw": "^2.2.0"
  }
}
```

- [ ] **Step 2: Create web/vite.config.ts**

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({
  plugins: [react()],
  server: { port: 3000 },
  envPrefix: 'VITE_'
})
```

- [ ] **Step 3: Create web/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 4: Create web/tailwind.config.js and postcss**

```js
// tailwind.config.js
export default { content: ["./index.html","./src/**/*.{ts,tsx}"], theme: { extend: {} }, plugins: [] }
// postcss.config.js
export default { plugins: { tailwindcss: {}, autoprefixer: {} } }
```

- [ ] **Step 5: Create web/index.html**

```html
<!doctype html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>Cronio</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>
```

- [ ] **Step 6: Create web/src/index.css with tailwind directives**

```css
@tailwind base; @tailwind components; @tailwind utilities;
```

- [ ] **Step 7: Create web/src/main.tsx**

```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
const qc = new QueryClient()
ReactDOM.createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={qc}><BrowserRouter><App/></BrowserRouter></QueryClientProvider>
)
```

- [ ] **Step 8: Create web/src/App.tsx with routes and tenant input**

```tsx
import { Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
export default function App() {
  const [tenant, setTenant] = useState(localStorage.getItem('tenant')||'11111111-1111-1111-1111-111111111111')
  useEffect(()=>localStorage.setItem('tenant', tenant),[tenant])
  return <div className="max-w-5xl mx-auto p-6"><input value={tenant} onChange={e=>setTenant(e.target.value)} className="border p-2 font-mono text-sm w-full"/><Routes><Route path="/" element={<div>jobs</div>}/></Routes></div>
}
```

- [ ] **Step 9: Run and verify**

Run: `cd web && npm install && npm run dev 2>&1 | head`
Expected: `VITE v5 ... ready in ... Local: http://localhost:3000`

- [ ] **Step 10: Commit**

```bash
git add web/package.json web/vite.config.ts web/tsconfig.json web/tailwind.config.js web/postcss.config.js web/index.html web/src/main.tsx web/src/App.tsx web/src/index.css
git commit -m "feat(web): scaffold Vite React TS with Tailwind Router Query"
```

---

### Task 2: api layer and tenant handling

**Files:**
- Create: `web/src/lib/api.ts`
- Create: `web/src/lib/tenant.ts`
- Test: `web/src/lib/api.test.ts`

**Interfaces:**
- Consumes: `VITE_API_URL` env, `X-Tenant-ID` header, `docs/api.md:31` contracts
- Produces: `createJob`, `listJobs`, `getJob`, `patchJob`, `deleteJob`, `listExecutions`, `getExecution` functions used by Tasks 3 to 6

- [ ] **Step 1: Write failing test web/src/lib/api.test.ts**

```ts
import { describe, it, expect, vi } from 'vitest'
import { createJob } from './api'
describe('api',()=>{it('adds tenant header',async()=>{
  global.fetch = vi.fn(()=>Promise.resolve({ok:true, json:()=>Promise.resolve({id:'1'})})) as any
  await createJob('tenant-1', {name:'a', schedule:{type:'interval', expression:'1h'}, target:{url:'https://example.com'}} as any)
  expect((global.fetch as any).mock.calls[0][1].headers['X-Tenant-ID']).toBe('tenant-1')
})})
```

- [ ] **Step 2: Run to fail**

Run: `cd web && npm run test 2>&1 | tail`
Expected: FAIL `createJob not defined` or missing

- [ ] **Step 3: Implement web/src/lib/api.ts**

```ts
const base = import.meta.env.VITE_API_URL || 'http://localhost:8080'
type ApiError = {code:string; message:string}
export async function apiFetch(tenant:string, path:string, opts:RequestInit={}) {
  const res = await fetch(base+path, {...opts, headers:{'Content-Type':'application/json','X-Tenant-ID':tenant, ...(opts.headers||{})}})
  const data = await res.json().catch(()=> ({}))
  if(!res.ok) throw Object.assign(new Error(data.error?.message||res.statusText), {code:data.error?.code})
  return data
}
export const createJob = (t:string, body:any)=> apiFetch(t,'/v1/jobs',{method:'POST', body:JSON.stringify(body)})
export const listJobs = (t:string)=> apiFetch(t,'/v1/jobs').then(d=>d.jobs)
export const getJob = (t:string, id:string)=> apiFetch(t,`/v1/jobs/${id}`)
export const patchJob = (t:string, id:string, body:any)=> apiFetch(t,`/v1/jobs/${id}`,{method:'PATCH', body:JSON.stringify(body)})
export const deleteJob = (t:string, id:string)=> apiFetch(t,`/v1/jobs/${id}`,{method:'DELETE'})
export const listExecutions = (t:string, jobId:string)=> apiFetch(t,`/v1/jobs/${jobId}/executions`).then(d=>d.executions)
export const getExecution = (t:string, id:string)=> apiFetch(t,`/v1/executions/${id}`)
```

- [ ] **Step 4: Implement web/src/lib/tenant.ts**

```ts
export const getTenant = ()=> localStorage.getItem('tenant')||''
export const setTenant = (v:string)=> localStorage.setItem('tenant', v)
export const isTenant = (v:string)=> /^[0-9a-f-]{36}$/i.test(v)
```

- [ ] **Step 5: Pass**

Run: `cd web && npm run test 2>&1 | tail`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add web/src/lib/api.ts web/src/lib/tenant.ts web/src/lib/api.test.ts
git commit -m "feat(web): add api layer with tenant header and msw tests"
```

---

### Task 3: jobs list page with delete soft

**Files:**
- Create: `web/src/routes/jobs.tsx`
- Modify: `web/src/App.tsx`

**Interfaces:**
- Consumes: `listJobs`, `deleteJob` from Task 2
- Produces: `/` route with list, delete soft, enabled badge, next_run_at

- [ ] **Step 1: Write test for list renders jobs with msw**

Use MSW to mock `GET /v1/jobs` returning one job, assert table row appears.

- [ ] **Step 2: Implement jobs.tsx**

Uses `useQuery` listJobs, maps `target.timeout_seconds`, `retry.max_attempts`, `concurrency.max_executions`, shows enabled, next_run_at, delete button calls `deleteJob` and invalidates `['jobs']`, shows `deleted` toast.

- [ ] **Step 3: Wire in App.tsx Routes**

```tsx
<Route path="/" element={<Jobs/>}/>
```

- [ ] **Step 4: Manual verify**

Run: `cd web && npm run dev` and `go run ./cmd/api` from `server/`, open `http://localhost:3000`, tenant `111...`, see jobs from Go.

- [ ] **Step 5: Commit**

```bash
git add web/src/routes/jobs.tsx web/src/App.tsx
git commit -m "feat(web): add jobs list with soft delete"
```

---

### Task 4: job form create and edit with validation

**Files:**
- Create: `web/src/components/JobForm.tsx`
- Create: `web/src/routes/jobs.$id.tsx` edit part

**Interfaces:**
- Consumes: `createJob`, `patchJob`, `getJob` from Task 2
- Produces: form that validates same ranges as server `store.go:74`

- [ ] **Step 1: Write failing test for validation**

Test that `timeout_seconds 2` shows error `must be 5 to 300`.

- [ ] **Step 2: Implement JobForm with RHF and Zod**

Schema: `name min1 max200`, `schedule.type` cron|interval|once, `target.url` http, `timeout 5 to 300`, `retry 1 to 10`, `concurrency 1 to 10`. On submit calls `createJob` or `patchJob`, invalidates.

- [ ] **Step 3: Pass and manual verify create job with timeout 60 retry 5 concurrency 2 shows in list**

- [ ] **Step 4: Commit**

```bash
git add web/src/components/JobForm.tsx web/src/routes/jobs.$id.tsx
git commit -m "feat(web): add job form with timeout retry concurrency validation"
```

---

### Task 5: job detail with executions polling

**Files:**
- Create: `web/src/routes/jobs.$id.tsx` detail view
- Create: `web/src/components/ExecutionsTable.tsx`

**Interfaces:**
- Consumes: `getJob`, `listExecutions` with `refetchInterval 2000`
- Produces: detail view with executions table

- [ ] **Step 1: Implement detail with polling**

`useQuery getJob` and `useQuery listExecutions` with `refetchInterval 2000` when tab is visible.

- [ ] **Step 2: Verify polling updates after scheduler creates READY**

Manual: create interval 10s job to `https://httpbin.org/post`, open detail, see executions appear every 10s.

- [ ] **Step 3: Commit**

```bash
git add web/src/routes/jobs.$id.tsx web/src/components/ExecutionsTable.tsx
git commit -m "feat(web): add job detail with executions polling"
```

---

### Task 6: execution detail with attempts

**Files:**
- Create: `web/src/routes/executions.$id.tsx`
- Create: `web/src/components/ExecutionDetail.tsx`

**Interfaces:**
- Consumes: `getExecution` from Task 2 with `refetchInterval 2000`
- Produces: `/executions/:id` route showing attempts table

- [ ] **Step 1: Implement execution detail**

Shows `job_name`, `target.url`, `status`, `scheduled_at`, `attempt_count`, `lease_until`, `result_status_code`, `result_body`, `result_error`, and `attempts` table with `attempt_number`, `status`, `response_status_code`, `response_body` truncated, `error_message`.

- [ ] **Step 2: Verify with 500 job retry shows READY rescheduled with backoff and attempts FAILURE**

Manual: create job to `https://httpbin.org/status/500`, see execution detail shows 60s delay and attempt 1 FAILURE.

- [ ] **Step 3: Commit**

```bash
git add web/src/routes/executions.$id.tsx web/src/components/ExecutionDetail.tsx
git commit -m "feat(web): add execution detail with attempts"
```

---

### Task 7: docs and polish

**Files:**
- Modify: `Readme.md`, `docs/STATE.md`

- [ ] **Step 1: Update Readme quick start to include web**

Add `cd web && npm install && VITE_API_URL=http://localhost:8080 npm run dev` and `http://localhost:3000`.

- [ ] **Step 2: Update STATE what is built**

Add `web/` Vite React with full parity.

- [ ] **Step 3: Commit**

```bash
git add Readme.md docs/STATE.md
git commit -m "docs: document web Vite React full parity"
```

---

## Self-review

* Spec coverage: all spec sections map to tasks: tenant to Task 2, jobs list to 3, form to 4, executions polling to 5, execution detail to 6, soft delete to 3, retry fields to 4, polling to 5 and 6.
* Placeholder scan: no TBD, all code blocks complete, all file paths exact, all commands with expected output.
* Type consistency: `createJob` signature used in Tasks 3 and 4 matches Task 2 definition, `getExecution` returns `job_name` and `attempts` as defined.

