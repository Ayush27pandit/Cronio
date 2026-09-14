export const getTenant = () => localStorage.getItem('tenant') || ''

export const setTenant = (v: string) => localStorage.setItem('tenant', v)

export const isTenant = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.trim())
