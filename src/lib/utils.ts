import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function normalizeName(name: string) {
  return name.trim().replace(/\s+/g, ' ')
}

export function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'workspace'
}

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${x}`)
}
