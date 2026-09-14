import { Routes, Route, Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Jobs from './routes/jobs'
import JobDetail from './routes/jobs.$id'
import ExecutionDetail from './routes/executions.$id'
import Landing from './routes/landing'
import JobForm from './components/JobForm'

function isAppRoute(pathname: string) {
  return pathname.startsWith('/app') || pathname.startsWith('/jobs') || pathname.startsWith('/executions')
}

export default function App() {
  const [tenant, setTenant] = useState(() => localStorage.getItem('tenant') || '11111111-1111-1111-1111-111111111111')
  const location = useLocation()
  const isApp = isAppRoute(location.pathname)
  useEffect(() => {
    localStorage.setItem('tenant', tenant)
  }, [tenant])

  if (!isApp) {
    return <Landing />
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 bg-canvas min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline pb-4">
        <div>
          <Link to="/" className="text-2xl font-semibold tracking-tighter text-ink">
            Cronio <span className="text-mute font-normal">— execution layer for time</span>
          </Link>
          <p className="text-sm text-body mt-1">Separate web on 3000, API on 8080. Tenant header drives isolation.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link to="/" className="px-3.5 py-1.5 rounded-sm bg-canvas-elevated border border-hairline text-ink text-sm">
            Landing
          </Link>
          <Link to="/app" className="px-3.5 py-1.5 rounded-pill bg-ink text-white text-sm font-medium">
            app
          </Link>
          <a href="http://localhost:8080/health" target="_blank" className="px-3.5 py-1.5 rounded-sm bg-canvas-elevated border border-hairline text-ink text-sm">
            api health
          </a>
        </div>
      </header>

      <section className="mt-6 rounded-md bg-canvas-elevated border border-hairline p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[280px]">
          <label className="text-xs uppercase tracking-wide text-mute">X-Tenant-ID</label>
          <input
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="mt-1 w-full rounded-sm border border-hairline bg-canvas-elevated px-3 py-2 font-mono text-sm text-ink"
            placeholder="11111111-1111-1111-1111-111111111111"
          />
          <p className="text-xs text-mute mt-1">Stored in localStorage, sent as X-Tenant-ID for every fetch.</p>
        </div>
        <div className="text-xs text-faint">API: {import.meta.env.VITE_API_URL || 'http://localhost:8080'}</div>
      </section>

      <div className="mt-6">
        <Routes>
          <Route
            path="/app"
            element={
              <div className="grid md:grid-cols-5 gap-6">
                <div className="md:col-span-2">
                  <JobForm />
                </div>
                <div className="md:col-span-3">
                  <Jobs />
                </div>
              </div>
            }
          />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/executions/:id" element={<ExecutionDetail />} />
        </Routes>
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">Cronio web — Vite React — TanStack Query — Tailwind</footer>
    </div>
  )
}
