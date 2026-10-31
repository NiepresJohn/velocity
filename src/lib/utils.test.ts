import { describe, expect, it } from 'vitest'
import { normalizeEmail, slugify } from './utils'

describe('utils', () => {
  it('normalizes email', () => expect(normalizeEmail('  A@B.Com ')).toBe('a@b.com'))
  it('slugifies', () => expect(slugify('My Team!')).toBe('my-team'))
})
