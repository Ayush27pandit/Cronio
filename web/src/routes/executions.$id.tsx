import { useParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getTenant } from '../lib/tenant'
import { getExecution } from '../lib/api'

export default function ExecutionDetail() {
  const { id } = useParams()
  const tenant = getTenant()
  const { data, isLoading, error } = useQuery({
    queryKey: ['execution', id, tenant],
    queryFn: () => getExecution(tenant, id!),
    enabled: !!id && !!tenant,
    refetchInterval: 2000,
  })

  if (isLoading) return <p className="text-sm text-slate-500">Loading execution...</p>
  if (error) return <p className="text-sm text-red-600">{(error as any).message}</p>
  const e = data as any
  return (
    <div className="space-y-4">
      <Link to={`/jobs/${e.job_id}`} className="text-xs text-slate-500 hover:text-slate-700">
        ← back to job
      </Link>
      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <h2 className="font-medium">Execution {e.id.slice(0, 8)} <span className="text-xs px-2 py-1 rounded-full bg-slate-100 border">{e.status}</span></h2>
        <p className="font-mono text-xs text-slate-600 mt-1">job {e.job_name} {e.job_id.slice(0, 8)} → {e.target?.url}</p>
        <p className="text-xs text-slate-500 mt-1">scheduled {new Date(e.scheduled_at).toLocaleString()} attempt {e.attempt_count}</p>
        <p className="text-xs text-slate-500">result {e.result_status_code ?? '—'} {e.result_error ?? ''}</p>
      </div>
      <div className="rounded-xl bg-white border border-slate-200 p-5">
        <h3 className="text-xs uppercase tracking-wide text-slate-500">Attempts, polls every 2s</h3>
        <div className="mt-3 space-y-2">
          {(e.attempts || []).map((a: any) => (
            <div key={a.id} className="rounded-lg border border-slate-200 bg-stone-50 px-3 py-2">
              <div className="flex justify-between text-xs">
                <span>#{a.attempt_number} {a.status}</span>
                <span>{a.response_status_code ?? ''}</span>
              </div>
              <p className="font-mono text-xs text-slate-600 truncate">{a.response_body?.slice(0, 200) || a.error_message || ''}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
