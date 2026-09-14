import { Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Jobs from './routes/jobs'
import JobDetail from './routes/jobs.$id'
import ExecutionDetail from './routes/executions.$id'
import JobForm from './components/JobForm'

export default function App() {
  const [tenant, setTenant] = useState(() => localStorage.getItem('tenant') || '11111111-1111-1111-1111-111111111111')
  useEffect(() => {
    localStorage.setItem('tenant', tenant)
  }, [tenant])

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 bg-stone-50 min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Cronio <span className="text-slate-400 font-normal">— execution layer for time</span>
          </h1>
          <p className="text-sm text-slate-500 mt-1">Separate web on 3000, API on 8080. Tenant header drives isolation.</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <Link to="/" className="px-3 py-1.5 rounded-full bg-slate-900 text-white">jobs</Link>
          <a href="http://localhost:8080/health" target="_blank" className="px-3 py-1.5 rounded-full bg-white border border-slate-200">api health</a>
        </div>
      </header>

      <section className="mt-6 rounded-xl bg-white border border-slate-200 p-4 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[280px]">
          <label className="text-xs uppercase tracking-wide text-slate-500">X-Tenant-ID</label>
          <input
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm"
            placeholder="11111111-1111-1111-1111-111111111111"
          />
          <p className="text-xs text-slate-500 mt-1">Stored in localStorage, sent as X-Tenant-ID for every fetch.</p>
        </div>
        <div className="text-xs text-slate-400">API: {import.meta.env.VITE_API_URL || 'http://localhost:8080'}</div>
      </section>

      <div className="mt-6">
        <Routes>
          <Route
            path="/"
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
