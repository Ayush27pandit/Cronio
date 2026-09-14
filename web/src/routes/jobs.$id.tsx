import { useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTenant } from '../lib/tenant'
import { getJob, patchJob } from '../lib/api'
import ExecutionsTable from '../components/ExecutionsTable'
import JobForm from '../components/JobForm'
import { useState } from 'react'

export default function JobDetail() {
  const { id } = useParams()
  const tenant = getTenant()
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', id, tenant],
    queryFn: () => getJob(tenant, id!),
    enabled: !!id && !!tenant,
  })

  const toggle = useMutation({
    mutationFn: () => patchJob(tenant, id!, { enabled: !(job as any).enabled }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['job', id, tenant] })
      qc.invalidateQueries({ queryKey: ['jobs', tenant] })
    },
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading job...</p>
  if (!job) return <p className="text-sm text-red-600">Job not found</p>
  const j = job as any

  return (
    <div className="space-y-6">
      <Link to="/" className="text-xs text-mute hover:text-ink">
        ← back to jobs
      </Link>

      <div className="rounded-md bg-canvas-elevated border border-hairline p-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-semibold tracking-tighter text-ink">{j.name} <span className="font-mono text-xs text-mute">{j.id.slice(0, 8)}</span></h2>
            <p className="font-mono text-xs text-body mt-1">{j.schedule?.type} {j.schedule?.expression} {j.schedule?.timezone}</p>
            <p className="font-mono text-xs text-mute">{j.target?.url} timeout {j.target?.timeout_seconds}s</p>
            <p className="font-mono text-xs text-mute">retry {j.retry?.max_attempts} concurrency {j.concurrency?.max_executions}</p>
            <p className="text-xs text-body mt-1">next_run_at {j.next_run_at ? new Date(j.next_run_at).toLocaleString() : '—'} enabled {String(j.enabled)}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => toggle.mutate()} disabled={toggle.isPending} className="px-3 py-1.5 rounded-sm bg-canvas-elevated border border-hairline text-xs text-ink">
              {j.enabled ? 'disable' : 'enable'}
            </button>
            <button onClick={() => setEditing(!editing)} className="px-3 py-1.5 rounded-pill bg-ink text-white text-xs">
              {editing ? 'close' : 'edit'}
            </button>
          </div>
        </div>
        {editing && (
          <div className="mt-4">
            <JobForm job={j} onDone={() => setEditing(false)} />
          </div>
        )}
      </div>

      <div className="rounded-md bg-canvas-elevated border border-hairline p-5">
        <h3 className="mono-eyebrow text-mute">Recent executions, polls every 2s</h3>
        <div className="mt-3">
          <ExecutionsTable jobId={id!} />
        </div>
      </div>
    </div>
  )
}
