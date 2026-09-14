import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="bg-white text-[#0F172A] -mx-6 -my-8 overflow-x-hidden">
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');`}</style>

      {/* Header - sticky with backdrop-filter blur */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-[#E5E7EB]">
        <div className="max-w-[1280px] mx-auto px-6 h-[68px] flex items-center justify-between">
          <Link to="/" className="font-semibold tracking-tight text-[#0F172A] text-[15px]">
            Cronio
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-[14px] text-[#475569]">
            <a href="#pricing" className="hover:text-[#0F172A]">
              Pricing
            </a>
            <a href="#platform" className="hover:text-[#0F172A]">
              Platform
            </a>
            <a href="https://github.com/Ayush27pandit/Cronio" className="hover:text-[#0F172A]">
              Docs
            </a>
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/app" className="hidden md:inline text-[#475569] hover:text-[#0F172A] px-3 py-1.5 text-sm">
              Sign in
            </Link>
            <Link to="/app" className="px-4 py-1.5 rounded-full bg-[#0F172A] text-white font-medium text-sm">
              Go to app
            </Link>
          </div>
        </div>
      </header>

      {/* Hero - centered, clamp typography, radial gradient glow */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-[-120px] -translate-x-1/2 w-[1200px] h-[600px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.15),_transparent_60%),radial-gradient(ellipse_at_center,_rgba(139,92,246,0.12),_transparent_60%)] blur-3xl" />
          <div className="absolute left-1/2 top-[200px] -translate-x-1/2 w-[900px] h-[500px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.08),_transparent_70%)] blur-2xl" />
        </div>
        <div className="relative max-w-[1280px] mx-auto px-6 pt-16 md:pt-24 pb-10 text-center">
          <p className="text-xs uppercase tracking-widest text-[#64748B]">Execution layer for time</p>
          <h1 className="mt-4 font-semibold tracking-tight leading-none text-[#0F172A] text-[clamp(2.5rem,6vw,4.5rem)] max-w-[18ch] mx-auto">
            The managed cloud for time
          </h1>
          <p className="mt-4 text-[clamp(1rem,2vw,1.125rem)] text-[#475569] leading-relaxed max-w-[55ch] mx-auto">
            The best place to schedule, run, and observe time triggered work. Push your schedule and walk away. We handle the firing, the retries, and the history.
          </p>
          <div className="flex items-center justify-center gap-3 mt-8">
            <Link to="/app" className="px-6 py-2.5 rounded-full bg-[#0F172A] text-white font-medium text-sm">
              Start building
            </Link>
            <a href="mailto:hello@cronio.dev" className="px-6 py-2.5 rounded-full bg-white border border-[#E5E7EB] text-[#0F172A] text-sm">
              Contact sales
            </a>
          </div>
          <div className="flex items-center justify-center gap-6 mt-6 text-xs uppercase tracking-widest text-[#94A3B8]">
            <a href="#schedule" className="hover:text-[#0F172A]">
              Schedule
            </a>
            <span>·</span>
            <a href="#observe" className="hover:text-[#0F172A]">
              Observe
            </a>
            <span>·</span>
            <a href="#scale" className="hover:text-[#0F172A]">
              Scale
            </a>
          </div>

          {/* Dashboard mockup - centered, with glow blur behind */}
          <div className="relative mt-10 md:mt-14 max-w-[1000px] mx-auto">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 via-violet-500/20 to-indigo-500/20 blur-3xl rounded-3xl transform scale-95" />
            <div className="relative rounded-xl bg-white border border-[#E5E7EB] shadow-xl overflow-hidden">
              <div className="flex items-center justify-between border-b border-[#E5E7EB] px-4 py-3 bg-[#F8FAFC]">
                <span className="font-mono text-xs text-[#64748B]">Cronio / production</span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">Ready • 3 jobs</span>
              </div>
              <div className="grid md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-[#E5E7EB] font-mono text-xs">
                <div className="p-4">
                  <p className="font-medium text-[#0F172A]">daily report • 0 9 * * *</p>
                  <p className="text-[#64748B] mt-1">Asia/Kolkata → https://api.internal/reports</p>
                  <p className="text-[#94A3B8] mt-1">retry 3 concurrency 1 timeout 30s</p>
                  <div className="mt-3 h-1 bg-[#E5E7EB] rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-[#0F172A]" />
                  </div>
                </div>
                <div className="p-4 bg-[#F8FAFC]">
                  <p className="font-medium text-[#0F172A]">Executions</p>
                  <p className="text-[#475569] mt-1">12:00:31 SUCCESS 200 • 1.2s</p>
                  <p className="text-[#475569]">12:00:41 SUCCESS 200 • 0.9s</p>
                  <p className="text-[#3B82F6]">12:00:51 READY scheduled</p>
                  <p className="text-[#94A3B8] mt-2">attempt 1 → POST target_url</p>
                </div>
                <div className="p-4">
                  <p className="font-medium text-[#0F172A]">Worker lease</p>
                  <p className="text-[#64748B] mt-1">claim_token abc</p>
                  <p className="text-[#64748B]">lease_until 30s</p>
                  <p className="text-[#64748B]">ReapExpiredLeases every Tick</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[#475569]">2 workers • SKIP LOCKED</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof - logo strip flexbox wrap */}
      <section className="border-y border-[#E5E7EB] bg-[#F8FAFC]">
        <div className="max-w-[1280px] mx-auto px-6 py-8">
          <p className="text-center text-sm text-[#64748B]">Teams like these do not manage cron</p>
          <div className="flex flex-wrap justify-center items-center gap-8 mt-5 text-sm font-medium text-[#94A3B8] grayscale">
            <span>Elastic</span> <span>Statamic</span> <span>Harvard University</span> <span>Linear</span> <span>Vercel</span>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid - 12 col grid, asymmetrical */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 md:py-20">
        <div className="grid grid-cols-12 gap-4">
          {/* Large code snippet card spans 7 */}
          <div className="col-span-12 md:col-span-7 rounded-xl bg-white border border-[#E5E7EB] p-6 hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-widest text-[#64748B]">Create in one call</p>
            <h3 className="mt-2 font-semibold text-[#0F172A]">Schedule is a value, not a string</h3>
            <pre className="mt-3 bg-[#0F172A] text-[#E5E7EB] rounded-lg p-4 font-mono text-xs overflow-x-auto">{`POST /v1/jobs  X-Tenant-ID: 111...
{
  "name": "daily report",
  "schedule": {"type":"cron","expression":"0 9 * * *","timezone":"Asia/Kolkata"},
  "target": {"url":"https://example.com/reports","timeout_seconds":30},
  "retry": {"max_attempts":3},
  "concurrency": {"max_executions":1}
} → 201 next_run_at 09:00 IST`}</pre>
          </div>
          {/* Small stats card spans 5 */}
          <div className="col-span-12 md:col-span-5 rounded-xl bg-white border border-[#E5E7EB] p-6 hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-widest text-[#64748B]">Validation at construction</p>
            <h3 className="mt-2 font-semibold text-[#0F172A]">Fail fast, not on every tick</h3>
            <ul className="mt-3 space-y-2 text-sm text-[#475569]">
              <li>• Cron 5-field via `robfig/cron` + `LoadLocation`</li>
              <li>• Interval `ParseDuration` &gt; 0</li>
              <li>• Once `RFC3339` disables if past</li>
            </ul>
          </div>
          {/* Dashboard panel spans 5 */}
          <div className="col-span-12 md:col-span-5 rounded-xl bg-white border border-[#E5E7EB] p-6 hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-widest text-[#64748B]">Observe</p>
            <h3 className="mt-2 font-semibold text-[#0F172A]">Attempts keep the bodies</h3>
            <div className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between border border-[#E5E7EB] rounded-lg px-3 py-2">
                <span>#1 SUCCESS</span>
                <span>200</span>
              </div>
              <div className="flex justify-between border border-[#E5E7EB] rounded-lg px-3 py-2 bg-[#F8FAFC]">
                <span>#1 FAILURE → READY</span>
                <span>500 → 60s</span>
              </div>
            </div>
          </div>
          {/* Wide feature spans 7 */}
          <div className="col-span-12 md:col-span-7 rounded-xl bg-white border border-[#E5E7EB] p-6 hover:shadow-md transition-shadow">
            <p className="text-xs uppercase tracking-widest text-[#64748B]">Tenant isolation</p>
            <h3 className="mt-2 font-semibold text-[#0F172A]">Distinct TenantID, no swapped ids</h3>
            <p className="mt-2 text-sm text-[#475569]">Every lock checks `WHERE id=$1 AND tenant_id=$2`. Wrong tenant gets 404, never touches another row. `X-Tenant-ID` header drives it.</p>
          </div>
        </div>
      </section>

      {/* Global Routing - Isometric 3-col grid with inline SVGs */}
      <section className="bg-[#F8FAFC] border-y border-[#E5E7EB] py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest text-[#64748B]">Global routing</p>
          <h2 className="text-center font-semibold tracking-tight text-[#0F172A] text-[clamp(1.75rem,4vw,2.5rem)] mt-2">Postgres is the source of truth</h2>
          <p className="text-center text-sm text-[#475569] mt-2 max-w-[55ch] mx-auto">The queue moves ids, Postgres decides what is due and who holds the lock. No in-memory leader.</p>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {/* Scheduler Node */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-6 text-center">
              <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto animate-[float_3s_ease-in-out_infinite]" style={{ animationDelay: '0s' }}>
                <g>
                  <rect x="10" y="20" width="60" height="40" rx="6" fill="#0F172A" stroke="#E5E7EB" strokeWidth="1" />
                  <rect x="20" y="28" width="40" height="4" rx="2" fill="#3B82F6" />
                  <rect x="20" y="36" width="30" height="4" rx="2" fill="#E5E7EB" />
                  <rect x="20" y="44" width="35" height="4" rx="2" fill="#E5E7EB" />
                  <circle cx="40" cy="12" r="3" fill="#3B82F6" className="animate-pulse" />
                  <line x1="40" y1="15" x2="40" y2="20" stroke="#3B82F6" strokeWidth="1.5" />
                </g>
              </svg>
              <h3 className="font-semibold text-[#0F172A] mt-4">Scheduler fleet</h3>
              <p className="text-sm text-[#475569] mt-1">Polls `GetDueJobs 100` every 1s, `LockDueJob SKIP LOCKED`</p>
            </div>
            {/* Postgres Node */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-6 text-center">
              <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto animate-[float_3s_ease-in-out_infinite]" style={{ animationDelay: '0.5s' }}>
                <g>
                  <ellipse cx="40" cy="20" rx="20" ry="8" fill="#0F172A" stroke="#E5E7EB" />
                  <rect x="20" y="20" width="40" height="40" fill="#0F172A" />
                  <ellipse cx="40" cy="60" rx="20" ry="8" fill="#1E293B" stroke="#E5E7EB" />
                  <line x1="40" y1="0" x2="40" y2="80" stroke="#3B82F6" strokeWidth="1" strokeDasharray="3 3" className="animate-[pulse_2s_ease-in-out_infinite]" />
                </g>
              </svg>
              <h3 className="font-semibold text-[#0F172A] mt-4">Postgres</h3>
              <p className="text-sm text-[#475569] mt-1">Source of truth, `jobs.next_run_at` indexed `where enabled`</p>
            </div>
            {/* Worker Node */}
            <div className="rounded-xl bg-white border border-[#E5E7EB] p-6 text-center">
              <svg width="80" height="80" viewBox="0 0 80 80" className="mx-auto animate-[float_3s_ease-in-out_infinite]" style={{ animationDelay: '1s' }}>
                <g>
                  <rect x="15" y="25" width="50" height="30" rx="6" fill="white" stroke="#E5E7EB" strokeWidth="1" />
                  <rect x="25" y="33" width="30" height="4" rx="2" fill="#0F172A" />
                  <rect x="25" y="41" width="20" height="4" rx="2" fill="#94A3B8" />
                  <circle cx="65" cy="15" r="3" fill="#22C55E" className="animate-pulse" />
                  <line x1="60" y1="18" x2="50" y2="25" stroke="#22C55E" strokeWidth="1.5" />
                </g>
              </svg>
              <h3 className="font-semibold text-[#0F172A] mt-4">Worker fleet</h3>
              <p className="text-sm text-[#475569] mt-1">Claims `READY` with `lease 30s`, `POST target_url`</p>
            </div>
          </div>
        </div>
      </section>

      {/* Dark Mode Interruption */}
      <section data-theme="dark" className="bg-[#0F172A] text-white py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-xs uppercase tracking-widest text-[#94A3B8]">Why Cronio</p>
              <h2 className="mt-2 font-semibold tracking-tight text-white text-[clamp(1.75rem,4vw,2.5rem)] leading-none">The execution layer for time</h2>
              <ul className="mt-6 space-y-3 text-sm text-[#CBD5E1]">
                <li>• Cron jobs die with the server → scheduler fleet with `SKIP LOCKED`, any can pick up</li>
                <li>• No history when it fails → executions and attempts keep bodies</li>
                <li>• One slow job blocks the rest → `max_executions` checked inside the same transaction</li>
                <li>• Every app builds its own scheduler → one API, one SDK</li>
              </ul>
            </div>
            <div className="rounded-xl bg-white text-[#0F172A] p-6 border border-[#E5E7EB]">
              <p className="font-mono text-xs text-[#64748B]">POST /v1/jobs — 201</p>
              <pre className="mt-2 bg-[#0F172A] text-[#E5E7EB] rounded-lg p-4 font-mono text-xs overflow-x-auto">{`curl -X POST http://localhost:8080/v1/jobs \\
  -H "X-Tenant-ID: $TENANT" \\
  -d '{"name":"daily report","schedule":{"type":"cron","expression":"0 9 * * *"}}'`}</pre>
              <div className="mt-4 flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[#475569]">At-least-once, execution id is the dedupe key</span>
              </div>
            </div>
          </div>
          <div className="mt-10 flex flex-wrap justify-center items-center gap-6 text-xs text-[#64748B] border-t border-white/10 pt-6">
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">Postgres 15+ pgcrypto</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">chi/v5 + pgx</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">sqlc + migrate</span>
            <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10">robfig/cron 5-field</span>
          </div>
        </div>
      </section>

      {/* Team Features - 3-col grid icon top */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center text-[#3B82F6]">◷</div>
            <h3 className="font-semibold text-[#0F172A] mt-3">Schedule</h3>
            <p className="text-sm text-[#475569] mt-1">Cron, Interval, Once with typed `Schedule` and `NextRun` pure. Validation at construction, not on every tick.</p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] border border-[#DCFCE7] flex items-center justify-center text-[#16A34A]">◎</div>
            <h3 className="font-semibold text-[#0F172A] mt-3">Observe</h3>
            <p className="text-sm text-[#475569] mt-1">Executions and attempts keep request and response bodies. Paginated, tenant scoped.</p>
          </div>
          <div>
            <div className="w-8 h-8 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] flex items-center justify-center text-[#D97706]">↗</div>
            <h3 className="font-semibold text-[#0F172A] mt-3">Scale</h3>
            <p className="text-sm text-[#475569] mt-1">Schedulers and workers scale separately. `SKIP LOCKED` means different rows per fleet member.</p>
          </div>
        </div>
      </section>

      {/* Testimonials - Wall of Love masonry */}
      <section className="bg-[#F8FAFC] border-y border-[#E5E7EB] py-16 md:py-20">
        <div className="max-w-[1280px] mx-auto px-6">
          <p className="text-center text-xs uppercase tracking-widest text-[#64748B]">Wall of love</p>
          <h2 className="text-center font-semibold tracking-tight text-[#0F172A] text-[clamp(1.5rem,4vw,2rem)] mt-2">Built by developers for developers</h2>
          <div className="columns-1 md:columns-3 gap-4 mt-8 space-y-4">
            <div className="break-inside-avoid rounded-xl bg-white border border-[#E5E7EB] p-5">
              <p className="text-sm text-[#0F172A]">“We replaced three cron servers with one Cronio tenant. No more 3am paging.”</p>
              <div className="flex items-center gap-3 mt-4">
                <img src="https://picsum.photos/seed/sarah/40/40" className="w-8 h-8 rounded-full" alt="Sarah" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Sarah</p>
                  <p className="text-xs text-[#64748B]">@sarah • platform</p>
                </div>
              </div>
            </div>
            <div className="break-inside-avoid rounded-xl bg-white border border-[#E5E7EB] p-5">
              <p className="text-sm text-[#0F172A]">“SKIP LOCKED is the only lock I trust at 2am. The lease reap saved us when a worker died.”</p>
              <div className="flex items-center gap-3 mt-4">
                <img src="https://picsum.photos/seed/alex/40/40" className="w-8 h-8 rounded-full" alt="Alex" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Alex</p>
                  <p className="text-xs text-[#64748B]">@alex • infra</p>
                </div>
              </div>
            </div>
            <div className="break-inside-avoid rounded-xl bg-white border border-[#E5E7EB] p-5">
              <p className="text-sm text-[#0F172A]">“Attempts table with bodies ended the log tailing. We just GET /v1/executions/:id.”</p>
              <div className="flex items-center gap-3 mt-4">
                <img src="https://picsum.photos/seed/priya/40/40" className="w-8 h-8 rounded-full" alt="Priya" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Priya</p>
                  <p className="text-xs text-[#64748B]">@priya • backend</p>
                </div>
              </div>
            </div>
            <div className="break-inside-avoid rounded-xl bg-white border border-[#E5E7EB] p-5">
              <p className="text-sm text-[#0F172A]">“Soft delete keeps history. Hard delete was scary.”</p>
              <div className="flex items-center gap-3 mt-4">
                <img src="https://picsum.photos/seed/miguel/40/40" className="w-8 h-8 rounded-full" alt="Miguel" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Miguel</p>
                  <p className="text-xs text-[#64748B]">@miguel • platform</p>
                </div>
              </div>
            </div>
            <div className="break-inside-avoid rounded-xl bg-white border border-[#E5E7EB] p-5">
              <p className="text-sm text-[#0F172A]">“Vercel design system plus our scheduler just feels right.”</p>
              <div className="flex items-center gap-3 mt-4">
                <img src="https://picsum.photos/seed/jane/40/40" className="w-8 h-8 rounded-full" alt="Jane" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Jane</p>
                  <p className="text-xs text-[#64748B]">@jane • design</p>
                </div>
              </div>
            </div>
            <div className="break-inside-avoid rounded-xl bg-white border border-[#E5E7EB] p-5">
              <p className="text-sm text-[#0F172A]">“Timeout, retry, concurrency per job. No more one slow job blocks the rest.”</p>
              <div className="flex items-center gap-3 mt-4">
                <img src="https://picsum.photos/seed/ken/40/40" className="w-8 h-8 rounded-full" alt="Ken" />
                <div>
                  <p className="text-sm font-medium text-[#0F172A]">Ken</p>
                  <p className="text-xs text-[#64748B]">@ken • SRE</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ & Pre-Footer CTA - sticky heading + details/summary */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 md:py-20">
        <div className="grid md:grid-cols-5 gap-10">
          <div className="md:col-span-2 md:sticky md:top-24 self-start">
            <h2 className="font-semibold tracking-tight text-[#0F172A] text-[clamp(1.5rem,3vw,2rem)] leading-none">Frequently asked questions</h2>
            <p className="text-sm text-[#475569] mt-2">Everything you need to know about time and tenants.</p>
          </div>
          <div className="md:col-span-3 divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-xl overflow-hidden">
            <details className="group p-5 open:bg-[#F8FAFC]">
              <summary className="flex justify-between items-center cursor-pointer list-none font-medium text-sm text-[#0F172A]">
                What happens when a job fails? <span className="text-[#64748B] group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-[#475569] mt-2">Worker writes a FAILURE attempt with status code and body, then either reschedules the same execution to READY with exponential backoff or marks FAILURE terminal after max_attempts.</p>
            </details>
            <details className="group p-5 open:bg-[#F8FAFC]">
              <summary className="flex justify-between items-center cursor-pointer list-none font-medium text-sm text-[#0F172A]">
                How is tenant isolation enforced? <span className="text-[#64748B] group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-[#475569] mt-2">Every lock and query checks WHERE tenant_id = $2. Wrong tenant gets 404 or empty list, never touches another row.</p>
            </details>
            <details className="group p-5 open:bg-[#F8FAFC]">
              <summary className="flex justify-between items-center cursor-pointer list-none font-medium text-sm text-[#0F172A]">
                Does it support cron, interval, and once? <span className="text-[#64748B] group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-[#475569] mt-2">Yes. Cron 5-field plus timezone via LoadLocation, Interval via ParseDuration, Once via RFC3339. NextRun is pure UTC.</p>
            </details>
            <details className="group p-5 open:bg-[#F8FAFC]">
              <summary className="flex justify-between items-center cursor-pointer list-none font-medium text-sm text-[#0F172A]">
                Can I set timeout, retry, and concurrency per job? <span className="text-[#64748B] group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-sm text-[#475569] mt-2">Yes. POST with target.timeout_seconds 5 to 300, retry.max_attempts 1 to 10, concurrency.max_executions 1 to 10. Defaults 30, 3, 1.</p>
            </details>
          </div>
        </div>
      </section>

      {/* Pre-Footer */}
      <section className="relative overflow-hidden bg-[#F8FAFC] border-y border-[#E5E7EB] py-16 md:py-20 text-center">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-[radial-gradient(ellipse_at_center,_rgba(59,130,246,0.12),_transparent_70%)] blur-2xl" />
        </div>
        <div className="relative">
          <h2 className="font-semibold tracking-tight text-[#0F172A] text-[clamp(1.75rem,4vw,2.5rem)]">Ready to start?</h2>
          <p className="text-sm text-[#475569] mt-2">Free to start, impossible to outgrow. Re-use the same blur from hero to tie together.</p>
          <div className="flex justify-center gap-3 mt-6">
            <Link to="/app" className="px-6 py-2.5 rounded-full bg-[#0F172A] text-white font-medium text-sm">
              Go to app
            </Link>
            <a href="mailto:hello@cronio.dev" className="px-6 py-2.5 rounded-full bg-white border border-[#E5E7EB] text-[#0F172A] text-sm">
              Contact sales
            </a>
          </div>
        </div>
      </section>

      {/* Footer - dark, multi-col, newsletter, watermark */}
      <footer data-theme="dark" className="relative bg-[#0F172A] text-[#CBD5E1] overflow-hidden">
        <div className="max-w-[1280px] mx-auto px-6 py-12">
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-2">
              <p className="font-semibold text-white">Cronio</p>
              <p className="text-sm text-[#94A3B8] mt-2 max-w-[32ch]">Optimized and crafted for time, by time. So you can focus on building, not on cron.</p>
              <div className="flex gap-3 mt-4 text-xs">
                <a href="https://github.com/Ayush27pandit/Cronio" className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10">
                  GitHub
                </a>
                <a href="#" className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10">
                  X
                </a>
                <a href="#" className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10">
                  Discord
                </a>
              </div>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Cloud</p>
              <ul className="mt-3 space-y-2 text-sm text-[#94A3B8]">
                <li>Pricing</li>
                <li>Platform</li>
                <li>Docs</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Explore</p>
              <ul className="mt-3 space-y-2 text-sm text-[#94A3B8]">
                <li>GitHub</li>
                <li>Status</li>
                <li>Changelog</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium text-white">Stay updated</p>
              <div className="mt-3 flex gap-2">
                <input placeholder="you@example.com" className="flex-1 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-sm text-white placeholder:text-[#64748B]" />
                <button className="px-4 py-2 rounded-full bg-white text-black text-sm font-medium">Subscribe</button>
              </div>
              <p className="text-xs text-[#64748B] mt-2">By submitting you agree to our terms. Opt-out anytime.</p>
            </div>
          </div>
        </div>
        <div className="pointer-events-none select-none overflow-hidden border-t border-white/5">
          <p className="text-center font-semibold tracking-tighter text-white opacity-[0.05] text-[15vw] leading-none py-4">Cronio</p>
        </div>
      </footer>
    </div>
  )
}
