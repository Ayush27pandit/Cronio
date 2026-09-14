import { Link } from 'react-router-dom'

export default function Landing() {
  return (
    <div className="bg-[#09090b] text-[#fafafa] -mx-6 -my-8">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/80 backdrop-blur border-b border-white/[0.08]">
        <div className="max-w-[1280px] mx-auto px-6 h-[64px] flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="font-semibold tracking-tighter text-white text-sm">
              Cronio
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm text-[#a1a1aa]">
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
          </div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/app" className="hidden md:inline text-[#a1a1aa] hover:text-white px-3 py-1.5">
              Sign in
            </Link>
            <Link to="/app" className="px-4 py-1.5 rounded-full bg-white text-black font-medium text-sm">
              Go to app
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 pt-12 md:pt-20 pb-12">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          <div>
            <p className="mono-eyebrow text-[#71717a] mb-3">Execution layer for time</p>
            <h1 className="text-[40px] md:text-[64px] font-semibold tracking-tighter leading-none text-white">The managed cloud for time</h1>
            <p className="text-base text-[#a1a1aa] leading-relaxed mt-4 max-w-[48ch]">
              The best place to schedule, run, and observe time triggered work. Push your schedule and walk away. We will handle the firing, the retries, and the history.
            </p>
            <div className="flex items-center gap-3 mt-6">
              <Link to="/app" className="px-5 py-2.5 rounded-full bg-white text-black font-medium text-sm">
                Start building
              </Link>
              <a href="mailto:hello@cronio.dev" className="px-5 py-2.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-white text-sm">
                Contact sales
              </a>
            </div>
            <div className="flex items-center gap-6 mt-8 text-sm mono-eyebrow text-[#71717a]">
              <a href="#schedule" className="hover:text-white">
                Schedule
              </a>
              <a href="#observe" className="hover:text-white">
                Observe
              </a>
              <a href="#scale" className="hover:text-white">
                Scale
              </a>
            </div>
          </div>
          <div className="rounded-md bg-[#111113] border border-white/[0.12] p-4 md:p-6">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3">
              <span className="font-mono text-xs text-[#a1a1aa]">Cronio / production</span>
              <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Ready</span>
            </div>
            <div className="grid gap-3 font-mono text-xs">
              <div className="rounded-sm bg-white text-[#171717] p-3">
                <p className="font-medium">daily report • 0 9 * * * Asia/Kolkata</p>
                <p className="text-[#71717a]">next_run_at 2026-09-01 09:00 IST → https://api.internal/reports</p>
                <p className="text-[#71717a]">retry 3 concurrency 1 timeout 30s</p>
              </div>
              <div className="rounded-sm bg-[#18181b] border border-white/[0.08] p-3">
                <p className="text-[#fafafa]">Executions</p>
                <p className="text-[#a1a1aa]">12:00:31 SUCCESS attempt 1 200 in 1.2s</p>
                <p className="text-[#a1a1aa]">12:00:41 SUCCESS attempt 1 200 in 0.9s</p>
                <p className="text-[#a1a1aa]">12:00:51 READY scheduled 12:00:51</p>
              </div>
              <div className="rounded-sm bg-[#18181b] border border-white/[0.08] p-3">
                <p className="text-[#fafafa]">Worker lease</p>
                <p className="text-[#a1a1aa]">claim_token abc lease_until 30s • ReapExpiredLeases every Tick</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Logos */}
      <section className="border-y border-white/[0.08] py-8">
        <div className="max-w-[1280px] mx-auto px-6">
          <p className="text-center text-sm text-[#71717a]">Teams like these do not manage cron</p>
          <div className="flex flex-wrap justify-center items-center gap-8 mt-4 text-sm text-[#8f8f8f]">
            <span>Elastic</span> <span>Statamic</span> <span>Harvard University</span> <span>Linear</span> <span>Vercel</span>
          </div>
        </div>
      </section>

      {/* 01 Schedule */}
      <section id="schedule" className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 border-b border-white/[0.08]">
        <p className="mono-eyebrow text-[#71717a]">01 — Schedule</p>
        <div className="grid md:grid-cols-2 gap-10 mt-4">
          <div>
            <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tighter leading-none text-white">Never touch cron again</h2>
            <p className="text-base text-[#a1a1aa] leading-relaxed mt-4 max-w-[52ch]">
              No crontabs on app servers. One place to create a job, say when it fires, and see what happened. If it has a schedule, it belongs in Cronio.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-[#a1a1aa]">
              <li>
                <span className="text-white">Cron 5-field plus timezone.</span> Evaluated in its timezone, stored as UTC via `robfig/cron`.
              </li>
              <li>
                <span className="text-white">Interval Go duration.</span> `15m`, `1h`, validated `time.ParseDuration` greater than zero.
              </li>
              <li>
                <span className="text-white">Once RFC3339.</span> Fires once then disables itself.
              </li>
              <li>
                <span className="text-white">Preview safe.</span> Create `Once` in the past and it stores disabled with no next run.
              </li>
            </ul>
          </div>
          <div className="rounded-md bg-white text-[#171717] p-4 font-mono text-xs">
            <p className="font-medium">POST /v1/jobs — X-Tenant-ID: 111…</p>
            <pre className="mt-2 bg-[#fafafa] border border-[#ebebeb] rounded-sm p-3 overflow-x-auto">{`{
  "name": "daily report",
  "schedule": {"type":"cron","expression":"0 9 * * *","timezone":"Asia/Kolkata"},
  "target": {"url":"https://example.com/reports","timeout_seconds":30},
  "retry": {"max_attempts":3},
  "concurrency": {"max_executions":1}
}`}</pre>
            <p className="mt-3 text-[#71717a]">→ 201 with next_run_at 2026-09-01T09:00:00+05:30</p>
          </div>
        </div>
      </section>

      {/* 02 Observe */}
      <section id="observe" className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 border-b border-white/[0.08]">
        <p className="mono-eyebrow text-[#71717a]">02 — Observe</p>
        <div className="grid md:grid-cols-2 gap-10 mt-4">
          <div>
            <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tighter leading-none text-white">Full visibility without the setup</h2>
            <p className="text-base text-[#a1a1aa] leading-relaxed mt-4">Problems do not wait for business hours. Cronio catches them before your users do.</p>
            <div className="grid grid-cols-2 gap-3 mt-6 font-mono text-xs">
              <div className="rounded-sm bg-[#18181b] border border-white/[0.08] p-3">
                <p className="text-[#fafafa]">App MEM 55% CPU 90%</p>
                <p className="text-[#a1a1aa]">Storage 9.5 GB / 10 GB</p>
              </div>
              <div className="rounded-sm bg-[#18181b] border border-white/[0.08] p-3">
                <p className="text-[#fafafa]">Spending $24.00</p>
                <p className="text-[#a1a1aa]">20% remaining $6.00 left</p>
              </div>
            </div>
          </div>
          <div className="rounded-md bg-white text-[#171717] p-4">
            <p className="mono-eyebrow text-[#71717a]">Attempts for execution</p>
            <div className="mt-3 space-y-2 font-mono text-xs">
              <div className="flex justify-between border border-[#ebebeb] rounded-sm px-3 py-2">
                <span>#1 SUCCESS</span>
                <span>200</span>
              </div>
              <div className="flex justify-between border border-[#ebebeb] rounded-sm px-3 py-2 bg-[#f2f2f2]">
                <span>#1 FAILURE → READY</span>
                <span>500 rescheduled 60s</span>
              </div>
              <pre className="bg-[#111113] text-[#fafafa] rounded-sm p-3 overflow-x-auto">{`UTC [INFO] Cache cleared
UTC [ERROR] Uncaught exception during order placement`}</pre>
            </div>
          </div>
        </div>
      </section>

      {/* 03 Scale */}
      <section id="scale" className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 border-b border-white/[0.08]">
        <p className="mono-eyebrow text-[#71717a]">03 — Scale</p>
        <div className="grid md:grid-cols-2 gap-10 mt-4">
          <div>
            <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tighter leading-none text-white">Scale without growing your team</h2>
            <p className="text-base text-[#a1a1aa] leading-relaxed mt-4">The platform expands and contracts on its own. Traffic spikes, quiet nights, jobs by the million. All covered with `SKIP LOCKED`.</p>
            <div className="mt-6 font-mono text-xs space-y-2">
              <p className="text-[#fafafa]">Traffic ███████████████████</p>
              <p className="text-[#a1a1aa]">Compute ██████ → ███ → 0 Wake &lt; 500 ms</p>
              <p className="text-[#a1a1aa]">concurrency_max_executions 2 → scheduler skips when 2 CLAIMED</p>
            </div>
          </div>
          <div className="rounded-md bg-[#18181b] border border-white/[0.08] p-4 font-mono text-xs">
            <p className="text-[#fafafa]">scheduler A BEGIN LockDueJob 1 SKIP LOCKED → row locked</p>
            <p className="text-[#71717a]">scheduler B BEGIN LockDueJob 1 SKIP LOCKED → 0 rows, skipped</p>
            <p className="text-[#fafafa]">worker A TryClaim 42 → CLAIMED token abc lease 30s</p>
            <p className="text-[#71717a]">worker B TryClaim 42 → 0 rows</p>
          </div>
        </div>
      </section>

      {/* 04 Tenant Isolation */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 border-b border-white/[0.08]">
        <p className="mono-eyebrow text-[#71717a]">04 — Tenant isolation</p>
        <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tighter leading-none text-white">Your own private cron, fully isolated</h2>
        <div className="grid md:grid-cols-2 gap-10 mt-6">
          <ul className="space-y-3 text-sm text-[#a1a1aa]">
            <li>X-Tenant-ID header, `TenantID` distinct type, `WHERE tenant_id = $2` in every lock</li>
            <li>Postgres is the source of truth, `jobs`, `executions`, `attempts` with tenant scoped indexes</li>
            <li>At-least-once, execution id is the dedupe key your target stores</li>
          </ul>
          <div className="rounded-md bg-white text-[#171717] p-4 font-mono text-xs">
            <p>Internet → Edge → Private tenant jobs → Executions → Your URL</p>
            <p className="mt-2 text-[#8f8f8f]">Wrong tenant → 404, never touches another row</p>
          </div>
        </div>
      </section>

      {/* 06 Pricing */}
      <section id="pricing" className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 border-b border-white/[0.08]">
        <p className="mono-eyebrow text-[#71717a]">06 — Pricing</p>
        <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tighter leading-none text-white">Pricing that scales to zero</h2>
        <p className="text-base text-[#a1a1aa] leading-relaxed mt-4 max-w-[52ch]">Start free with usage credits. Flex compute scales to zero, costs scale down. Spending limits pause compute automatically.</p>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-md bg-white text-[#171717] p-6 border border-[#ebebeb]">
            <p className="font-semibold">Free</p>
            <p className="text-2xl font-semibold mt-2">$0</p>
            <p className="text-xs text-[#71717a]">For trying</p>
            <ul className="mt-4 space-y-2 text-sm text-[#4d4d4d]">
              <li>3 jobs, 1k executions</li>
              <li>Community support</li>
            </ul>
          </div>
          <div className="rounded-md bg-[#111113] text-white p-6 border border-white/[0.12]">
            <p className="font-semibold">Pro</p>
            <p className="text-2xl font-semibold mt-2">$20</p>
            <p className="text-xs text-[#a1a1aa]">Plus usage</p>
            <ul className="mt-4 space-y-2 text-sm text-[#a1a1aa]">
              <li>Unlimited jobs, pay per execution</li>
              <li>Retry, concurrency, timeout</li>
            </ul>
          </div>
          <div className="rounded-md bg-white text-[#171717] p-6 border border-[#ebebeb]">
            <p className="font-semibold">Enterprise</p>
            <p className="text-2xl font-semibold mt-2">Custom</p>
            <p className="text-xs text-[#71717a]">For scale</p>
            <ul className="mt-4 space-y-2 text-sm text-[#4d4d4d]">
              <li>Private network, RBAC</li>
              <li>SAML, audit logs</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 border-b border-white/[0.08]">
        <p className="mono-eyebrow text-[#71717a]">07 — Built by developers for developers</p>
        <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tighter leading-none text-white mt-4">See what engineers say</h2>
        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="rounded-md bg-[#18181b] border border-white/[0.08] p-5">
            <p className="text-sm text-white">“We replaced three cron servers with one Cronio tenant.”</p>
            <p className="text-xs text-[#71717a] mt-3">— Sarah, platform</p>
          </div>
          <div className="rounded-md bg-[#18181b] border border-white/[0.08] p-5">
            <p className="text-sm text-white">“SKIP LOCKED is the only lock I trust.”</p>
            <p className="text-xs text-[#71717a] mt-3">— Alex, infra</p>
          </div>
          <div className="rounded-md bg-[#18181b] border border-white/[0.08] p-5">
            <p className="text-sm text-white">“Attempts table saved us hours of tailing logs.”</p>
            <p className="text-xs text-[#71717a] mt-3">— Priya, backend</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-[1280px] mx-auto px-6 py-16 md:py-24 border-b border-white/[0.08]">
        <p className="mono-eyebrow text-[#71717a]">08 — FAQ</p>
        <h2 className="text-[36px] md:text-[48px] font-semibold tracking-tighter leading-none text-white mt-4">Everything you need to know</h2>
        <div className="mt-8 divide-y divide-white/[0.08]">
          <div className="py-4 flex justify-between text-sm text-[#a1a1aa]">
            <span>Does it support cron, interval, and once?</span>
            <span>+</span>
          </div>
          <div className="py-4 flex justify-between text-sm text-[#a1a1aa]">
            <span>What happens on 500?</span>
            <span>+</span>
          </div>
          <div className="py-4 flex justify-between text-sm text-[#a1a1aa]">
            <span>How is tenant isolation done?</span>
            <span>+</span>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-[1280px] mx-auto px-6 py-24 text-center">
        <h2 className="text-[48px] font-semibold tracking-tighter leading-none text-white">Ready to ship?</h2>
        <p className="text-base text-[#a1a1aa] mt-3">Free to start, impossible to outgrow.</p>
        <div className="flex justify-center gap-3 mt-6">
          <Link to="/app" className="px-6 py-2.5 rounded-full bg-white text-black font-medium text-sm">
            Go to app
          </Link>
          <a href="mailto:hello@cronio.dev" className="px-6 py-2.5 rounded-full bg-white/[0.08] border border-white/[0.12] text-white text-sm">
            Contact sales
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col md:flex-row justify-between gap-6 text-sm text-[#71717a]">
          <div>
            <p className="text-white font-medium">Cronio</p>
            <p className="max-w-[32ch] mt-1">Execution layer for time. Cron-first, Postgres as source of truth, at-least-once.</p>
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
      </footer>
    </div>
  )
}
