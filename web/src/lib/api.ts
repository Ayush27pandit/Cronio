const base = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export type ApiError = Error & { code?: string; status?: number }

function toApiError(message: string, code?: string, status?: number): ApiError {
  const e = new Error(message) as ApiError
  e.code = code
  e.status = status
  return e
}

export async function apiFetch(tenant: string, path: string, opts: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': tenant,
    ...((opts.headers as Record<string, string>) || {}),
  }
  const res = await fetch(base + path, { ...opts, headers })
  const text = await res.text()
  let data: any = {}
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    data = {}
  }
  if (!res.ok) {
    const code = data?.error?.code
    const msg = data?.error?.message || res.statusText
    throw toApiError(msg, code, res.status)
  }
  return data
}

export const createJob = (tenant: string, body: any) => apiFetch(tenant, '/v1/jobs', { method: 'POST', body: JSON.stringify(body) })

export const listJobs = (tenant: string) => apiFetch(tenant, '/v1/jobs').then((d: any) => d.jobs as any[])

export const getJob = (tenant: string, id: string) => apiFetch(tenant, `/v1/jobs/${id}`)

export const patchJob = (tenant: string, id: string, body: any) => apiFetch(tenant, `/v1/jobs/${id}`, { method: 'PATCH', body: JSON.stringify(body) })

export const deleteJob = (tenant: string, id: string) => apiFetch(tenant, `/v1/jobs/${id}`, { method: 'DELETE' })

export const listExecutions = (tenant: string, jobId: string) =>
  apiFetch(tenant, `/v1/jobs/${jobId}/executions`).then((d: any) => d.executions as any[])

export const getExecution = (tenant: string, id: string) => apiFetch(tenant, `/v1/executions/${id}`)
