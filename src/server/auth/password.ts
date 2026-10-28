import { hash, verify } from 'argon2'

export async function hashPassword(password: string) {
  return hash(password, { type: 2 /* argon2id */, memoryCost: 19456, timeCost: 2, parallelism: 1 })
}

export async function verifyPassword(password: string, hashStr: string) {
  try {
    return await verify(hashStr, password)
  } catch {
    return false
  }
}
