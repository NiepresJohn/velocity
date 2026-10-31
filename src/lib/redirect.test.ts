import { describe, expect, it } from 'vitest'
import { passwordProblem, safeRedirect } from './redirect'

describe('safeRedirect', () => {
  it.each(['//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '', undefined, '/a\nb', '/login', '\\\\evil'])('rejects %s', (v) => expect(safeRedirect(v)).toBe('/app'))
  it('keeps relative paths with query/hash', () => expect(safeRedirect('/app/projects/1?x=1#y')).toBe('/app/projects/1?x=1#y'))
  it('uses custom fallback', () => expect(safeRedirect('//x', '/')).toBe('/'))
})
describe('passwordProblem', () => {
  it('flags short, letterless, ok', () => {
    expect(passwordProblem('abc1')).toBeTruthy()
    expect(passwordProblem('12345678')).toBeTruthy()
    expect(passwordProblem('abcd1234')).toBeNull()
  })
})
