import { describe, expect, it } from 'vitest'
import { securityHeaders } from './headers'

describe('securityHeaders', () => {
  it('prod adds HSTS + CSP, dev does not', () => {
    expect(securityHeaders(true)['Strict-Transport-Security']).toBeTruthy()
    expect(securityHeaders(true)['Content-Security-Policy']).toContain("frame-ancestors 'none'")
    expect(securityHeaders(false)['Content-Security-Policy']).toBeUndefined()
    expect(securityHeaders(false)['X-Frame-Options']).toBe('DENY')
  })
})
