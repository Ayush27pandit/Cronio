import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createJob, listJobs, getExecution } from './api'

describe('api tenant header', () => {
  // @ts-ignore vitest types
  beforeEach(() => vi.restoreAllMocks())

  it('adds X-Tenant-ID on createJob', async () => {
    const fetchMock: any = vi.fn(() => Promise.resolve({ ok: true, status: 201, text: () => Promise.resolve(JSON.stringify({ id: '1' })) } as unknown as Response))
    global.fetch = fetchMock
    await createJob('tenant-1', { name: 'a', schedule: { type: 'interval', expression: '1h' }, target: { url: 'https://example.com' } })
    const headers = (fetchMock.mock.calls[0] as any)[1].headers
    expect(headers['X-Tenant-ID']).toBe('tenant-1')
    expect((fetchMock.mock.calls[0] as any)[0]).toBe('http://localhost:8080/v1/jobs')
  })

  it('adds tenant on listJobs', async () => {
    const fetchMock: any = vi.fn(() => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(JSON.stringify({ jobs: [] })) } as unknown as Response))
    global.fetch = fetchMock
    await listJobs('tenant-2')
    expect((fetchMock.mock.calls[0] as any)[1].headers['X-Tenant-ID']).toBe('tenant-2')
  })

  it('throws ApiError with code on 400', async () => {
    const fetchMock: any = vi.fn(() =>
      Promise.resolve({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: () => Promise.resolve(JSON.stringify({ error: { code: 'missing_tenant', message: 'X-Tenant-ID is required' } })),
      } as unknown as Response)
    )
    global.fetch = fetchMock
    try {
      await getExecution('t', 'id')
      throw new Error('should throw')
    } catch (e: any) {
      expect(e.code).toBe('missing_tenant')
      expect(e.status).toBe(400)
    }
  })
})
