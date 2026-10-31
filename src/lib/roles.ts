export type Role = 'owner' | 'admin' | 'member' | 'viewer'

// Returns an error message when the actor may not do this, else null.
export function checkRoleChange(actor: string, target: string, next: string | null, ownerCount: number): string | null {
  if (actor !== 'owner' && actor !== 'admin') return 'Only owners and admins can manage members.'
  if (actor === 'admin' && target === 'owner') return 'Admins cannot modify owners.'
  if (next === 'owner') return 'Use ownership transfer to make an owner.'
  if (target === 'owner' && ownerCount <= 1) return 'A workspace must keep at least one owner.'
  return null
}
