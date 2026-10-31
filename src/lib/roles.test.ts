import { describe, it, expect } from 'vitest'
import { checkRoleChange } from './roles'

describe('checkRoleChange', () => {
  it('blocks non-managers', () => expect(checkRoleChange('member', 'viewer', 'admin', 1)).toBeTruthy())
  it('admin cannot touch owner', () => expect(checkRoleChange('admin', 'owner', 'member', 2)).toBeTruthy())
  it('cannot demote or remove last owner', () => {
    expect(checkRoleChange('owner', 'owner', 'admin', 1)).toBeTruthy()
    expect(checkRoleChange('owner', 'owner', null, 1)).toBeTruthy()
  })
  it('owner may demote when another owner exists', () => expect(checkRoleChange('owner', 'owner', 'admin', 2)).toBeNull())
  it('nobody promotes to owner directly', () => expect(checkRoleChange('owner', 'member', 'owner', 1)).toBeTruthy())
  it('admin manages members', () => expect(checkRoleChange('admin', 'member', 'viewer', 1)).toBeNull())
})
