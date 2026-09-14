import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getTenant } from '../lib/tenant'
import { listJobs, deleteJob } from '../lib/api'

function formatTime(v: string | null) {
  if (!v) return '—'
  try {
    return new Date(v).toLocaleString()
  } catch {
    return v
  }
}

export default function Jobs() {
  const tenant = getTenant()
  const qc = useQueryClient()
  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs', tenant],
    queryFn: () => listJobs(tenant),
    enabled: !!tenant,
  })

  const del = useMutation({
    mutationFn: (id: string) => deleteJob(tenant, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['jobs', tenant] }),
  })

  if (!tenant) return <p className="text-sm text-amber-700">Set a tenant UUID above to list jobs.</p>
  if (isLoading) return <p className="text-sm text-slate-500">Loading jobs...</p>
  if (error) {
    const e = error as any
    return <p className="text-sm text-red-600">Failed: {e.message} {e.code ? `(${e.code})` : ''}</p>
  }

  const list = (jobs as any[]) || []
  if (list.length === 0) {
    return <p className="text-sm text-slate-500">No jobs for this tenant. Create one below.</p>
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-medium">Jobs for this tenant</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-slate-100 border border-slate-200">{list.length}</span>
      </div>
      {list.map((j: any) => (
        <div key={j.id} className={`rounded-lg border p-3 flex justify-between gap-3 ${j.enabled ? 'border-slate-200 bg-slate-50' : 'border-amber-200 bg-amber-50'}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">
              {j.name} <span className="font-mono text-xs text-slate-500">{j.id.slice(0, 8)}</span>
            </p>
            <p className="font-mono text-xs text-slate-600 mt-1">
              {j.schedule?.type} {j.schedule?.expression} {j.schedule?.timezone} → <span className="text-slate-900">{formatTime(j.next_run_at)}</span>
            </p>
            <p className="font-mono text-xs text-slate-500 truncate">{j.target?.url}</p>
            <p className="font-mono text-xs text-slate-500">
              timeout {j.target?.timeout_seconds ?? 30}s retry {j.retry?.max_attempts ?? 3} concurrency {j.concurrency?.max_executions ?? 1}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0 items-center">
            <span className={`text-xs px-2 py-1 rounded-full ${j.enabled ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-amber-100 text-amber-800 border border-amber-200'}`}>
              {j.enabled ? 'enabled' : 'disabled'}
            </span>
            <Link to={`/jobs/${j.id}`} className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs">
              open
            </Link>
            <button
              onClick={() => {
                if (confirm(`Soft delete ${j.name}? Keeps executions.`)) del.mutate(j.id)
              }}
              disabled={del.isPending}
              className="px-3 py-1 rounded-lg bg-white border border-slate-300 text-xs text-amber-700"
            >
              delete
            </button>
          </div>
        </div>
      ))}
      {del.isError && <p className="text-xs text-red-600">{(del.error as any).message}</p>}
    </div>
  )
}
