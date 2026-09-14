import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createJob, patchJob } from '../lib/api'
import { getTenant } from '../lib/tenant'
import { useMutation, useQueryClient } from '@tanstack/react-query'

const schema = z.object({
  name: z.string().min(1, 'name is required').max(200, 'max 200'),
  scheduleType: z.enum(['cron', 'interval', 'once']),
  expression: z.string().min(1, 'expression is required'),
  timezone: z.string().optional(),
  targetUrl: z.string().url('must be http or https').refine((v) => v.startsWith('http://') || v.startsWith('https://'), 'must be http or https'),
  timeout: z.coerce.number().min(5).max(300).optional(),
  retry: z.coerce.number().min(1).max(10).optional(),
  concurrency: z.coerce.number().min(1).max(10).optional(),
})

type FormValues = z.infer<typeof schema>

export default function JobForm({ job, onDone }: { job?: any; onDone?: () => void }) {
  const tenant = getTenant()
  const qc = useQueryClient()
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: job
      ? {
          name: job.name,
          scheduleType: job.schedule?.type,
          expression: job.schedule?.expression,
          timezone: job.schedule?.timezone || 'UTC',
          targetUrl: job.target?.url,
          timeout: job.target?.timeout_seconds,
          retry: job.retry?.max_attempts,
          concurrency: job.concurrency?.max_executions,
        }
      : {
          scheduleType: 'cron',
          timezone: 'UTC',
          timeout: 30,
          retry: 3,
          concurrency: 1,
        },
  })

  const create = useMutation({
    mutationFn: (v: FormValues) =>
      createJob(tenant, {
        name: v.name,
        schedule: { type: v.scheduleType, expression: v.expression, timezone: v.timezone },
        target: { url: v.targetUrl, timeout_seconds: v.timeout },
        retry: { max_attempts: v.retry },
        concurrency: { max_executions: v.concurrency },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs', tenant] })
      reset()
      onDone?.()
    },
  })

  const patch = useMutation({
    mutationFn: (v: FormValues) =>
      patchJob(tenant, job.id, {
        name: v.name,
        schedule: { type: v.scheduleType, expression: v.expression, timezone: v.timezone },
        target: { url: v.targetUrl, timeout_seconds: v.timeout },
        retry: { max_attempts: v.retry },
        concurrency: { max_executions: v.concurrency },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['jobs', tenant] })
      onDone?.()
    },
  })

  const isEdit = !!job
  const mut = isEdit ? patch : create

  return (
    <form onSubmit={handleSubmit((v) => mut.mutate(v as any))} className="rounded-xl bg-white border border-slate-200 p-5 space-y-3">
      <h2 className="font-medium">{isEdit ? 'Edit job' : 'Create job'}</h2>
      <p className="text-xs text-slate-500">Schedule is typed. Choose cron, interval, or once.</p>

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500">name</label>
        <input {...register('name')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="daily report" />
        {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">schedule type</label>
          <select {...register('scheduleType')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
            <option value="cron">cron</option>
            <option value="interval">interval</option>
            <option value="once">once</option>
          </select>
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">timezone (cron only)</label>
          <input {...register('timezone')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="Asia/Kolkata" />
        </div>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500">expression</label>
        <input {...register('expression')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="0 9 * * *  or  15m  or  2026-09-01T09:00:00Z" />
        {errors.expression && <p className="text-xs text-red-600">{errors.expression.message}</p>}
        <p className="text-xs text-slate-500 mt-1">cron: 5-field, interval: 15m/1h, once: RFC3339</p>
      </div>

      <div>
        <label className="text-xs uppercase tracking-wide text-slate-500">target url</label>
        <input {...register('targetUrl')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" placeholder="https://example.com/reports" />
        {errors.targetUrl && <p className="text-xs text-red-600">{errors.targetUrl.message}</p>}
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">timeout (5-300)</label>
          <input type="number" {...register('timeout')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="30" />
          {errors.timeout && <p className="text-xs text-red-600">{errors.timeout.message}</p>}
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">retry (1-10)</label>
          <input type="number" {...register('retry')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="3" />
          {errors.retry && <p className="text-xs text-red-600">{errors.retry.message}</p>}
        </div>
        <div>
          <label className="text-xs uppercase tracking-wide text-slate-500">concurrency (1-10)</label>
          <input type="number" {...register('concurrency')} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" placeholder="1" />
          {errors.concurrency && <p className="text-xs text-red-600">{errors.concurrency.message}</p>}
        </div>
      </div>

      <button type="submit" disabled={mut.isPending} className="w-full mt-2 px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium disabled:opacity-50">
        {mut.isPending ? 'saving...' : isEdit ? 'save' : 'create'}
      </button>
      {mut.isError && <p className="text-xs text-red-600">{(mut.error as any).message}</p>}
      {mut.isSuccess && <p className="text-xs text-emerald-600">{isEdit ? 'saved' : 'created'}</p>}
    </form>
  )
}
