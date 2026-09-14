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
        <h2 className="font-semibold tracking-tighter text-ink">Jobs for this tenant</h2>
        <span className="text-xs px-2 py-1 rounded-full bg-canvas-elevated border border-hairline text-mute">{list.length}</span>
      </div>
      {list.map((j: any) => (
        <div key={j.id} className={`rounded-md border p-3 flex justify-between gap-3 ${j.enabled ? 'border-hairline bg-canvas-elevated' : 'border-hairline bg-canvas'}`}>
          <div className="min-w-0">
            <p className="font-medium text-sm text-ink truncate">
              {j.name} <span className="font-mono text-xs text-mute">{j.id.slice(0, 8)}</span>
            </p>
            <p className="font-mono text-xs text-body mt-1">
              {j.schedule?.type} {j.schedule?.expression} {j.schedule?.timezone} → <span className="text-ink">{formatTime(j.next_run_at)}</span>
            </p>
            <p className="font-mono text-xs text-mute truncate">{j.target?.url}</p>
            <p className="font-mono text-xs text-mute">
              timeout {j.target?.timeout_seconds ?? 30}s retry {j.retry?.max_attempts ?? 3} concurrency {j.concurrency?.max_executions ?? 1}
            </p>
          </div>
          <div className="flex flex-col gap-2 shrink-0 items-center">
            <span className={`text-xs px-2 py-1 rounded-full border ${j.enabled ? 'bg-canvas-elevated border-hairline text-ink' : 'bg-warning-soft border-hairline text-warning-deep'}`}>
              {j.enabled ? 'enabled' : 'disabled'}
            </span>
            <Link to={`/jobs/${j.id}`} className="px-3 py-1 rounded-sm bg-canvas-elevated border border-hairline text-xs text-ink">
              open
            </Link>
            <button
              onClick={() => {
                if (confirm(`Soft delete ${j.name}? Keeps executions.`)) del.mutate(j.id)
              }}
              disabled={del.isPending}
              className="px-3 py-1 rounded-sm bg-canvas-elevated border border-hairline text-xs text-body"
            >
              delete
            </button>
          </div>
        </div>
      ))}
      {del.isError && <p className="text-xs text-error">{(del.error as any).message}</p>}
    </div>
  )
}
