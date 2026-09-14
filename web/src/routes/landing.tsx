import { Link } from 'react-router-dom'
import RecursiveErosionBackground from '@/components/ui/recursive-erosion'

export default function Landing() {
  return (
    <div className="bg-black text-white overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap');
        * { font-family: 'Poppins', sans-serif; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {/* Header - SaaS template Navigation as truth - fixed to avoid cropping by parent overflow */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-800/50 bg-black/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-[68px] flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight text-white text-[15px]">
            Cronio
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[14px] text-white/60">
            <a href="#pricing" className="hover:text-white">
              Pricing
            </a>
            <a href="#platform" className="hover:text-white">
              Platform
            </a>
            <a href="https://github.com/Ayush27pandit/Cronio" className="hover:text-white">
              Docs
            </a>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/app" className="hidden md:inline text-white/60 hover:text-white px-3 py-1.5 text-sm">
              Sign in
            </Link>
            <Link to="/app" className="px-4 py-1.5 rounded-full bg-white text-black font-medium text-sm hover:bg-gray-100">
              Go to app
            </Link>
          </div>
        </div>
      </header>

      {/* Hero - SaaS template Hero as truth, adapted to Cronio with recursive erosion background */}
      <section className="relative min-h-[85vh] flex flex-col items-center justify-start px-6 pt-[88px] pb-12 md:pb-16 bg-black overflow-hidden" style={{ animation: 'fadeIn 0.6s ease-out' }}>
        <div className="absolute inset-0 z-0">
          <RecursiveErosionBackground mode="dark" className="h-full w-full" style={{ filter: 'brightness(0.72) saturate(0.85)' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/55 to-black" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_transparent_35%,_black_80%)]" />
        </div>
        <div className="relative z-10 flex flex-col items-center w-full drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
          <aside className="mb-6 inline-flex flex-wrap items-center justify-center gap-2 px-4 py-2 rounded-full border border-gray-700 bg-gray-800/50 backdrop-blur-sm max-w-full">
          <span className="text-xs text-center whitespace-nowrap" style={{ color: '#9ca3af' }}>
            Execution layer for time — Cronio is live
          </span>
          <Link to="/app" className="flex items-center gap-1 text-xs hover:text-white transition-all active:scale-95 whitespace-nowrap" style={{ color: '#9ca3af' }}>
            Open app
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </Link>
        </aside>

        <h1
          className="text-4xl md:text-5xl lg:text-6xl font-medium text-center max-w-3xl leading-tight"
          style={{
            background: 'linear-gradient(to bottom, #ffffff, #ffffff, rgba(255, 255, 255, 0.6))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: '-0.05em',
          }}
        >
          The managed cloud <br /> for time
        </h1>

        <p className="text-sm md:text-base text-center max-w-2xl mt-4" style={{ color: '#9ca3af' }}>
          The best place to schedule, run, and observe time triggered work. Push your schedule and walk away. We handle the firing, the retries, and the history.
        </p>

        <div className="flex items-center gap-3 mt-8">
          <Link
            to="/app"
            className="inline-flex items-center justify-center h-12 px-8 text-base font-medium rounded-lg bg-gradient-to-b from-white via-white/95 to-white/60 text-black hover:scale-105 active:scale-95 transition-all"
          >
            Start building
          </Link>
          <a
            href="mailto:hello@cronio.dev"
            className="inline-flex items-center justify-center h-12 px-8 text-base font-medium rounded-lg bg-gray-800 text-white hover:bg-gray-700 border border-gray-700"
          >
            Contact sales
          </a>
        </div>

        <div className="flex items-center justify-center gap-6 mt-6 text-xs uppercase tracking-widest" style={{ color: '#6b7280' }}>
          <a href="#schedule" className="hover:text-white">
            Schedule
          </a>
          <span>·</span>
          <a href="#observe" className="hover:text-white">
            Observe
          </a>
          <span>·</span>
          <a href="#scale" className="hover:text-white">
            Scale
          </a>
        </div>

        <div className="w-full max-w-5xl relative mt-10 pb-10">
          <div className="absolute left-1/2 w-[90%] pointer-events-none z-0" style={{ top: '-18%', transform: 'translateX(-50%)' }} aria-hidden="true">
            <img
              src="https://cdn.21st.dev/assets/mirror/ab/abe6d8090cc14780b846eee062024e4e03274c99d38188554239cd312a7180fa.png"
              alt=""
              className="w-full h-auto opacity-40"
              loading="eager"
            />
          </div>
          {/* Mock Dashboard - Laptop screen size 16:10 */}
          <div className="relative z-10 mx-auto w-full max-w-[900px]">
            {/* Laptop screen */}
            <div className="relative rounded-t-xl bg-[#0a0a0a] border border-gray-700 shadow-2xl overflow-hidden p-2 pb-0">
              {/* Screen bezel */}
              <div className="rounded-lg bg-black border border-gray-800 overflow-hidden">
                {/* Notch / camera */}
                <div className="flex justify-center pt-1">
                  <div className="w-16 h-1 rounded-full bg-gray-800" />
                </div>
                {/* Screen content 16:10 */}
                <div className="aspect-[16/10] bg-[#0a0a0a] overflow-hidden rounded-b-lg mt-1">
                  {/* Top bar */}
                  <div className="flex items-center justify-between border-b border-gray-800 px-3 py-2 bg-[#0a0a0a]">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-3 h-3 rounded-full bg-red-500" />
                        <span className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="w-3 h-3 rounded-full bg-green-500" />
                      </div>
                      <span className="font-mono text-[11px]" style={{ color: '#e5e7eb' }}>
                        Cronio / production
                      </span>
                      <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">● Ready • 3 jobs • 2 workers</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="hidden md:inline text-[10px]" style={{ color: '#6b7280' }}>
                        tenant 1111…1111
                      </span>
                      <div className="w-5 h-5 rounded-full bg-gray-700" />
                    </div>
                  </div>
                  <div className="flex h-[calc(100%-36px)]">
                    {/* Sidebar */}
                    <div className="hidden md:flex w-[120px] border-r border-gray-800 bg-[#0a0a0a] flex-col p-2 gap-1">
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-white text-black text-[11px] font-medium">
                        <span>◷</span> Jobs
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 text-[11px]" style={{ color: '#9ca3af' }}>
                        <span>◎</span> Executions
                      </div>
                      <div className="flex items-center gap-2 px-2 py-1.5 text-[11px]" style={{ color: '#9ca3af' }}>
                        <span>⚙</span> Settings
                      </div>
                      <div className="mt-auto pt-2 border-t border-gray-800">
                        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: '#6b7280' }}>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          API 200 • 1.2k req
                        </div>
                      </div>
                    </div>
                    {/* Main */}
                    <div className="flex-1 min-w-0 flex flex-col bg-[#0a0a0a]">
                      {/* Metrics bar */}
                      <div className="grid grid-cols-4 gap-px bg-gray-800 border-b border-gray-800">
                        <div className="bg-[#0a0a0a] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#6b7280' }}>
                            Jobs
                          </p>
                          <p className="text-sm font-semibold text-white">12</p>
                          <p className="text-[10px]" style={{ color: '#22c55e' }}>
                            ↑ 3 today
                          </p>
                        </div>
                        <div className="bg-[#0a0a0a] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#6b7280' }}>
                            Executions
                          </p>
                          <p className="text-sm font-semibold text-white">1.2k</p>
                          <p className="text-[10px]" style={{ color: '#22c55e' }}>
                            98.3% success
                          </p>
                        </div>
                        <div className="bg-[#0a0a0a] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#6b7280' }}>
                            Avg duration
                          </p>
                          <p className="text-sm font-semibold text-white">412ms</p>
                          <p className="text-[10px]" style={{ color: '#6b7280' }}>
                            p95 890ms
                          </p>
                        </div>
                        <div className="bg-[#0a0a0a] px-3 py-2">
                          <p className="text-[10px] uppercase tracking-widest" style={{ color: '#6b7280' }}>
                            Workers
                          </p>
                          <p className="text-sm font-semibold text-white">2 • 3</p>
                          <p className="text-[10px]" style={{ color: '#6b7280' }}>
                            schedulers • workers
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between border-b border-gray-800 px-3 py-1.5 bg-[#0a0a0a]">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium text-white">Jobs • 12</span>
                          <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 border border-gray-700" style={{ color: '#9ca3af' }}>
                            10 enabled • 2 disabled • soft delete keeps history
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded-full bg-white text-black">+ New job</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded border border-gray-800" style={{ color: '#6b7280' }}>
                            timeout 30s retry 3 concurrency 1
                          </span>
                        </div>
                      </div>
                      <div className="hidden md:grid grid-cols-12 gap-1 px-3 py-1.5 text-[9px] uppercase tracking-widest border-b border-gray-800" style={{ color: '#6b7280' }}>
                        <span className="col-span-4">Job • Schedule</span>
                        <span className="col-span-3">Target • Timeout</span>
                        <span className="col-span-3">Next run • Retry</span>
                        <span className="col-span-2 text-right">Status • Lease</span>
                      </div>
                      <div className="divide-y divide-gray-800 flex-1">
                        <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-gray-800/30">
                          <div className="col-span-12 md:col-span-4 min-w-0">
                            <p className="text-[11px] font-medium text-white truncate">daily report</p>
                            <p className="font-mono text-[10px] truncate" style={{ color: '#9ca3af' }}>
                              0 9 * * * Asia/Kolkata • cron
                            </p>
                          </div>
                          <div className="col-span-6 md:col-span-3 font-mono text-[10px] truncate" style={{ color: '#9ca3af' }}>
                            https://api.internal/reports • 30s
                          </div>
                          <div className="col-span-6 md:col-span-3 font-mono text-[10px] text-white">09:00 IST • Retry 3</div>
                          <div className="col-span-12 md:col-span-2 flex justify-end gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">enabled</span>
                            <span className="hidden md:inline text-[10px] px-1 py-0.5 rounded bg-gray-800 border border-gray-700 text-white">1h</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center bg-white text-black">
                          <div className="col-span-12 md:col-span-4 min-w-0">
                            <p className="text-[11px] font-medium truncate">health check • 15m interval</p>
                            <p className="font-mono text-[10px] text-gray-500 truncate">https://example.com/ping • timeout 60s</p>
                          </div>
                          <div className="col-span-6 md:col-span-3 font-mono text-[10px] text-gray-500">retry 5 • concurrency 2</div>
                          <div className="col-span-6 md:col-span-3 font-mono text-[10px]">12:00:51 READY • lease 30s</div>
                          <div className="col-span-12 md:col-span-2 flex justify-end gap-1">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700">READY</span>
                            <span className="text-[10px] px-1 py-0.5 rounded bg-gray-100 border border-gray-200 text-black">15m</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-gray-800/30">
                          <div className="col-span-12 md:col-span-4 min-w-0">
                            <p className="text-[11px] font-medium text-white truncate">weekly digest • Once</p>
                            <p className="font-mono text-[10px] truncate" style={{ color: '#9ca3af' }}>
                              2026-09-01T09:00:00Z • Once
                            </p>
                          </div>
                          <div className="col-span-6 md:col-span-3 font-mono text-[10px]" style={{ color: '#9ca3af' }}>
                            timeout 30s retry 3 • POST
                          </div>
                          <div className="col-span-6 md:col-span-3 font-mono text-[10px] text-white">09:00 UTC • soft deleted</div>
                          <div className="col-span-12 md:col-span-2 flex justify-end">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-white">enabled</span>
                          </div>
                        </div>
                        <div className="grid grid-cols-12 gap-1 px-3 py-2 items-center hover:bg-gray-800/30 opacity-60">
                          <div className="col-span-12 md:col-span-4 min-w-0">
                            <p className="text-[11px] font-medium text-white truncate">invoice run • 30m</p>
                            <p className="font-mono text-[10px] truncate" style={{ color: '#9ca3af' }}>
                              interval • disabled • next_run_at null
                            </p>
                          </div>
                          <div className="col-span-6 md:col-span-3 font-mono text-[10px]" style={{ color: '#6b7280' }}>
                            soft deleted keeps history
                          </div>
                          <div className="col-span-6 md:col-span-3 font-mono text-[10px]" style={{ color: '#6b7280' }}>
                            enabled false
                          </div>
                          <div className="col-span-12 md:col-span-2 flex justify-end">
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-800 border border-gray-700" style={{ color: '#6b7280' }}>
                              disabled
                            </span>
                          </div>
                        </div>
                      </div>
                      {/* Execution preview with sparkline */}
                      <div className="border-t border-gray-800 bg-[#111113] px-3 py-2">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-[10px]" style={{ color: '#9ca3af' }}>
                            Executions last 24h • 12:00:31 SUCCESS 200 • 1.2s → 12:00:41 SUCCESS • 12:00:51 READY
                          </span>
                          <span className="hidden md:inline text-[10px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700" style={{ color: '#e5e7eb' }}>
                            attempts 1 • POST https://httpbin.org/post
                          </span>
                        </div>
                        <div className="mt-1.5 flex items-end gap-px h-6">
                          <div className="flex-1 bg-emerald-500/60 rounded-sm" style={{ height: '60%' }} />
                          <div className="flex-1 bg-emerald-500/60 rounded-sm" style={{ height: '80%' }} />
                          <div className="flex-1 bg-emerald-500/60 rounded-sm" style={{ height: '45%' }} />
                          <div className="flex-1 bg-amber-500/60 rounded-sm" style={{ height: '90%' }} />
                          <div className="flex-1 bg-emerald-500/60 rounded-sm" style={{ height: '70%' }} />
                          <div className="flex-1 bg-gray-700 rounded-sm" style={{ height: '30%' }} />
                          <div className="flex-1 bg-emerald-500/60 rounded-sm" style={{ height: '85%' }} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Laptop base - hinge and keyboard */}
            <div className="mx-auto w-[96%] h-3 bg-gradient-to-b from-gray-700 to-gray-800 rounded-b-xl border-x border-b border-gray-700 shadow-xl" />
            <div className="mx-auto w-[40%] h-1 bg-gray-600 rounded-b-md opacity-60" />
            <div className="mx-auto w-[80%] h-6 bg-gradient-to-b from-black/40 to-transparent blur-xl rounded-full mt-1" />
          </div>
        </div>
        </div>
      </section>

      {/* Social Proof - black with gray border */}
      <section className="border-y border-gray-800/50 bg-black py-8">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-sm" style={{ color: '#9ca3af' }}>
            Teams like these do not manage cron
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 mt-5 text-sm font-medium" style={{ color: '#6b7280' }}>
            <span>Elastic</span> <span>Statamic</span> <span>Harvard University</span> <span>Linear</span> <span>Vercel</span>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid - black with gray cards */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20 bg-black">
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 md:col-span-7 rounded-xl bg-gray-800/30 border border-gray-700 p-6">
            <p className="text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Create in one call
            </p>
            <h3 className="mt-2 font-semibold text-white">Schedule is a value, not a string</h3>
            <pre className="mt-3 bg-black border border-gray-800 rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ color: '#e5e7eb' }}>{`POST /v1/jobs  X-Tenant-ID: 111...
{
  "name": "daily report",
  "schedule": {"type":"cron","expression":"0 9 * * *","timezone":"Asia/Kolkata"},
  "target": {"url":"https://example.com/reports","timeout_seconds":30},
  "retry": {"max_attempts":3},
  "concurrency": {"max_executions":1}
} → 201 next_run_at 09:00 IST`}</pre>
          </div>
          <div className="col-span-12 md:col-span-5 rounded-xl bg-gray-800/30 border border-gray-700 p-6">
            <p className="text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Validation at construction
            </p>
            <h3 className="mt-2 font-semibold text-white">Fail fast, not on every tick</h3>
            <ul className="mt-3 space-y-2 text-sm" style={{ color: '#9ca3af' }}>
              <li>• Cron 5-field via `robfig/cron` + `LoadLocation`</li>
              <li>• Interval `ParseDuration` &gt; 0</li>
              <li>• Once `RFC3339` disables if past</li>
            </ul>
          </div>
          <div className="col-span-12 md:col-span-5 rounded-xl bg-gray-800/30 border border-gray-700 p-6">
            <p className="text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Observe
            </p>
            <h3 className="mt-2 font-semibold text-white">Attempts keep the bodies</h3>
            <div className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between border border-gray-700 rounded-lg px-3 py-2 bg-gray-800">
                <span style={{ color: '#e5e7eb' }}>#1 SUCCESS</span>
                <span style={{ color: '#9ca3af' }}>200</span>
              </div>
              <div className="flex justify-between border border-gray-700 rounded-lg px-3 py-2 bg-black">
                <span style={{ color: '#e5e7eb' }}>#1 FAILURE → READY</span>
                <span style={{ color: '#9ca3af' }}>500 → 60s</span>
              </div>
            </div>
          </div>
          <div className="col-span-12 md:col-span-7 rounded-xl bg-gray-800/30 border border-gray-700 p-6">
            <p className="text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>
              Tenant isolation
            </p>
            <h3 className="mt-2 font-semibold text-white">Distinct TenantID, no swapped ids</h3>
            <p className="mt-2 text-sm" style={{ color: '#9ca3af' }}>
              Every lock checks `WHERE id=$1 AND tenant_id=$2`. Wrong tenant gets 404, never touches another row. `X-Tenant-ID` header drives it.
            </p>
          </div>
        </div>
      </section>

      {/* Global Routing - Isometric 3-col grid */}
      <section className="bg-[#0a0a0a] border-y border-gray-800/50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>
            Global routing
          </p>
          <h2 className="text-center font-medium tracking-tight text-white text-4xl mt-2" style={{ letterSpacing: '-0.05em', fontFamily: 'Poppins, sans-serif' }}>
            Postgres is the source of truth
          </h2>
          <p className="text-center text-sm mt-2 max-w-[55ch] mx-auto" style={{ color: '#9ca3af' }}>
            The queue moves ids, Postgres decides what is due and who holds the lock. No in-memory leader.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            <div className="rounded-xl bg-gray-800/30 border border-gray-700 p-6 text-center">
              <h3 className="font-semibold text-white">Scheduler fleet</h3>
              <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                Polls `GetDueJobs 100` every 1s, `LockDueJob SKIP LOCKED`
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/30 border border-gray-700 p-6 text-center">
              <h3 className="font-semibold text-white">Postgres</h3>
              <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                Source of truth, `jobs.next_run_at` indexed `where enabled`
              </p>
            </div>
            <div className="rounded-xl bg-gray-800/30 border border-gray-700 p-6 text-center">
              <h3 className="font-semibold text-white">Worker fleet</h3>
              <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
                Claims `READY` with `lease 30s`, `POST target_url`
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Mode Interruption - keep black but add subtle distinction */}
      <section className="bg-black text-white py-16 md:py-20 border-y border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>
                Why Cronio
              </p>
              <h2 className="mt-2 font-medium tracking-tight text-white text-4xl leading-none" style={{ letterSpacing: '-0.05em', fontFamily: 'Poppins, sans-serif' }}>
                The execution layer for time
              </h2>
              <ul className="mt-6 space-y-3 text-sm" style={{ color: '#9ca3af' }}>
                <li>• Cron jobs die with the server → scheduler fleet with `SKIP LOCKED`, any can pick up</li>
                <li>• No history when it fails → executions and attempts keep bodies</li>
                <li>• One slow job blocks the rest → `max_executions` checked inside the same transaction</li>
                <li>• Every app builds its own scheduler → one API, one SDK</li>
              </ul>
            </div>
            <div className="rounded-xl bg-gray-800/50 border border-gray-700 p-6">
              <p className="font-mono text-xs" style={{ color: '#9ca3af' }}>
                POST /v1/jobs — 201
              </p>
              <pre className="mt-2 bg-black border border-gray-800 rounded-lg p-4 font-mono text-xs overflow-x-auto" style={{ color: '#e5e7eb' }}>{`curl -X POST http://localhost:8080/v1/jobs \\
  -H "X-Tenant-ID: $TENANT" \\
  -d '{"name":"daily report","schedule":{"type":"cron","expression":"0 9 * * *"}}'`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* Team Features - black */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20 bg-black">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-semibold text-white">Schedule</h3>
            <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
              Cron, Interval, Once with typed `Schedule` and `NextRun` pure.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Observe</h3>
            <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
              Executions and attempts keep bodies. Paginated, tenant scoped.
            </p>
          </div>
          <div>
            <h3 className="font-semibold text-white">Scale</h3>
            <p className="text-sm mt-1" style={{ color: '#9ca3af' }}>
              Schedulers and workers scale separately. `SKIP LOCKED` means different rows.
            </p>
          </div>
        </div>
      </section>

      {/* Testimonials - Wall of Love masonry black */}
      <section className="bg-black border-y border-gray-800/50 py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest" style={{ color: '#9ca3af' }}>
            Wall of love
          </p>
          <h2 className="text-center font-medium tracking-tight text-white text-4xl mt-2" style={{ letterSpacing: '-0.05em', fontFamily: 'Poppins, sans-serif' }}>
            Built by developers for developers
          </h2>
          <div className="columns-1 md:columns-3 gap-4 mt-8 space-y-4">
            <div className="break-inside-avoid rounded-xl bg-gray-800/30 border border-gray-700 p-5">
              <p className="text-sm text-white">“We replaced three cron servers with one Cronio tenant.”</p>
              <p className="text-xs mt-3" style={{ color: '#9ca3af' }}>
                — Sarah, platform
              </p>
            </div>
            <div className="break-inside-avoid rounded-xl bg-gray-800/30 border border-gray-700 p-5">
              <p className="text-sm text-white">“SKIP LOCKED is the only lock I trust.”</p>
              <p className="text-xs mt-3" style={{ color: '#9ca3af' }}>
                — Alex, infra
              </p>
            </div>
            <div className="break-inside-avoid rounded-xl bg-gray-800/30 border border-gray-700 p-5">
              <p className="text-sm text-white">“Attempts table saved us hours.”</p>
              <p className="text-xs mt-3" style={{ color: '#9ca3af' }}>
                — Priya, backend
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ - black */}
      <section className="max-w-7xl mx-auto px-6 py-16 md:py-20 bg-black">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2 md:sticky md:top-24 self-start">
            <h2 className="font-medium tracking-tight text-white text-3xl leading-none" style={{ letterSpacing: '-0.05em', fontFamily: 'Poppins, sans-serif' }}>
              Frequently asked questions
            </h2>
            <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>
              Everything you need to know about time and tenants.
            </p>
          </div>
          <div className="md:col-span-3 divide-y divide-gray-800 border border-gray-800 rounded-xl overflow-hidden">
            <details className="group p-5 open:bg-gray-800/30">
              <summary className="flex justify-between items-center cursor-pointer list-none font-medium text-sm text-white">
                What happens when a job fails? <span className="group-open:rotate-45 transition-transform" style={{ color: '#9ca3af' }}>+</span>
              </summary>
              <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>
                Worker writes a FAILURE attempt then either reschedules to READY with backoff or marks FAILURE after max_attempts.
              </p>
            </details>
            <details className="group p-5 open:bg-gray-800/30">
              <summary className="flex justify-between items-center cursor-pointer list-none font-medium text-sm text-white">
                How is tenant isolation done? <span className="group-open:rotate-45 transition-transform" style={{ color: '#9ca3af' }}>+</span>
              </summary>
              <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>
                Every lock checks WHERE tenant_id = $2. Wrong tenant gets 404.
              </p>
            </details>
          </div>
        </div>
      </section>

      {/* Pre-Footer - black */}
      <section className="relative overflow-hidden bg-black border-y border-gray-800/50 py-16 md:py-20 text-center">
        <h2 className="font-medium tracking-tight text-white text-4xl" style={{ letterSpacing: '-0.05em', fontFamily: 'Poppins, sans-serif' }}>
          Ready to start?
        </h2>
        <p className="text-sm mt-2" style={{ color: '#9ca3af' }}>
          Free to start, impossible to outgrow.
        </p>
        <div className="flex justify-center gap-3 mt-6">
          <Link to="/app" className="px-6 py-2.5 rounded-lg bg-white text-black font-medium text-sm">
            Go to app
          </Link>
          <a href="mailto:hello@cronio.dev" className="px-6 py-2.5 rounded-lg bg-gray-800 text-white border border-gray-700 text-sm">
            Contact sales
          </a>
        </div>
      </section>

      {/* Footer - black */}
      <footer className="relative bg-black text-gray-400 overflow-hidden border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between gap-6 text-sm">
            <div>
              <p className="font-semibold text-white">Cronio</p>
              <p className="max-w-[32ch] mt-1" style={{ color: '#9ca3af' }}>
                Execution layer for time.
              </p>
            </div>
            <div className="flex gap-8">
              <div>
                <p className="text-white">Cloud</p>
                <p>Pricing</p>
                <p>Docs</p>
              </div>
              <div>
                <p className="text-white">Explore</p>
                <p>GitHub</p>
                <p>Status</p>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none select-none overflow-hidden border-t border-gray-800/50">
          <p className="text-center font-semibold tracking-tighter text-white opacity-[0.05] text-[15vw] leading-none py-4" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Cronio
          </p>
        </div>
      </footer>
    </div>
  )
}
