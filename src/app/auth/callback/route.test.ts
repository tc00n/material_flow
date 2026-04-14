import { describe, it, expect, vi, beforeEach } from 'vitest'

// Must mock before importing the module under test
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

const mockExchangeCodeForSession = vi.fn()
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: { exchangeCodeForSession: mockExchangeCodeForSession },
  })),
}))

// Helper: build a minimal request-like object the handler accepts
function makeRequest(url: string) {
  return { url, cookies: { getAll: () => [] } } as unknown as import('next/server').NextRequest
}

describe('GET /auth/callback', () => {
  // Dynamic import so mocks are applied first
  let GET: (req: import('next/server').NextRequest) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    vi.resetModules()
    const mod = await import('./route')
    GET = mod.GET
  })

  it('exchanges code and redirects to / by default', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const req = makeRequest('http://localhost:3000/auth/callback?code=abc123')
    const res = await GET(req)

    expect(mockExchangeCodeForSession).toHaveBeenCalledWith('abc123')
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })

  it('redirects to next param on successful exchange', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: null })

    const req = makeRequest(
      'http://localhost:3000/auth/callback?code=abc123&next=/reset-password'
    )
    const res = await GET(req)

    expect(res.headers.get('location')).toBe('http://localhost:3000/reset-password')
  })

  it('redirects to /login with error when no code provided', async () => {
    const req = makeRequest('http://localhost:3000/auth/callback')
    const res = await GET(req)

    expect(mockExchangeCodeForSession).not.toHaveBeenCalled()
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/login?error=auth_callback_failed'
    )
  })

  it('redirects to /login with error when code exchange fails', async () => {
    mockExchangeCodeForSession.mockResolvedValue({ error: new Error('invalid code') })

    const req = makeRequest('http://localhost:3000/auth/callback?code=bad-code')
    const res = await GET(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe(
      'http://localhost:3000/login?error=auth_callback_failed'
    )
  })
})
