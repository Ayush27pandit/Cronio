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
      <Link to="/" className="text-xs text-slate-500 hover:text-slate-700">
        ← back to jobs
      </Link>

      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="font-medium">{j.name} <span className="font-mono text-xs text-slate-500">{j.id.slice(0, 8)}</span></h2>
            <p className="font-mono text-xs text-slate-600 mt-1">{j.schedule?.type} {j.schedule?.expression} {j.schedule?.timezone}</p>
            <p className="font-mono text-xs text-slate-500">{j.target?.url} timeout {j.target?.timeout_seconds}s</p>
            <p className="font-mono text-xs text-slate-500">retry {j.retry?.max_attempts} concurrency {j.concurrency?.max_executions}</p>
            <p className="text-xs mt-1">next_run_at {j.next_run_at ? new Date(j.next_run_at).toLocaleString() : '—'} enabled {String(j.enabled)}</p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => toggle.mutate()} disabled={toggle.isPending} className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs">
              {j.enabled ? 'disable' : 'enable'}
            </button>
            <button onClick={() => setEditing(!editing)} className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs">
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

      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Recent executions, polls every 2s</h3>
        <div className="mt-3">
          <ExecutionsTable jobId={id!} />
        </div>
      </div>
    </div>
  )
}
