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

  if (isLoading) return <p className="text-xs text-mute">Loading executions...</p>
  if (error) return <p className="text-xs text-error">{(error as any).message}</p>
  const list = (data as any[]) || []
  if (list.length === 0) return <p className="text-xs text-mute">No executions yet. Worker creates READY when next_run_at is due.</p>

  return (
    <div className="space-y-2">
      {list.map((e: any) => (
        <Link key={e.id} to={`/executions/${e.id}`} className="block rounded-sm border border-hairline bg-canvas px-3 py-2 flex justify-between items-center hover:bg-canvas-elevated">
          <span className="font-mono text-xs text-ink">{new Date(e.scheduled_at).toLocaleString()}</span>
          <span className={`text-xs px-2 py-1 rounded-full border ${e.status === 'SUCCESS' ? 'bg-canvas-elevated border-hairline text-ink' : e.status === 'READY' ? 'bg-warning-soft border-hairline text-warning-deep' : 'bg-canvas border-hairline text-mute'}`}>
            {e.status}
          </span>
        </Link>
      ))}
    </div>
  )
}
