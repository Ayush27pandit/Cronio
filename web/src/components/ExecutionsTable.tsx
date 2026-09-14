import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { getTenant } from '../lib/tenant'
import { listExecutions } from '../lib/api'

export default function ExecutionsTable({ jobId }: { jobId: string }) {
  const tenant = getTenant()
  const { data, isLoading, error } = useQuery({
    queryKey: ['executions', jobId, tenant],
    queryFn: () => listExecutions(tenant, jobId),
    enabled: !!jobId && !!tenant,
    refetchInterval: 2000,
  })

  if (isLoading) return <p className="text-xs text-slate-500">Loading executions...</p>
  if (error) return <p className="text-xs text-red-600">{(error as any).message}</p>
  const list = (data as any[]) || []
  if (list.length === 0) return <p className="text-xs text-slate-500">No executions yet. Worker creates READY when next_run_at is due.</p>

  return (
    <div className="space-y-2">
      {list.map((e: any) => (
        <Link key={e.id} to={`/executions/${e.id}`} className="block rounded-lg border border-slate-200 bg-stone-50 px-3 py-2 flex justify-between items-center hover:bg-white">
          <span className="font-mono text-xs">{new Date(e.scheduled_at).toLocaleString()}</span>
          <span className={`text-xs px-2 py-1 rounded-full ${e.status === 'SUCCESS' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : e.status === 'READY' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-700 border border-slate-200'}`}>
            {e.status}
          </span>
        </Link>
      ))}
    </div>
  )
}
