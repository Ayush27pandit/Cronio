import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const schema = z.object({
  timeout: z.coerce.number().min(5).max(300).optional(),
  retry: z.coerce.number().min(1).max(10).optional(),
  concurrency: z.coerce.number().min(1).max(10).optional(),
})

describe('JobForm validation', () => {
  it('rejects timeout 2', () => {
    const r = schema.safeParse({ timeout: 2 })
    expect(r.success).toBe(false)
  })
  it('accepts timeout 30', () => {
    const r = schema.safeParse({ timeout: 30 })
    expect(r.success).toBe(true)
  })
  it('rejects retry 20', () => {
    const r = schema.safeParse({ retry: 20 })
    expect(r.success).toBe(false)
  })
})
