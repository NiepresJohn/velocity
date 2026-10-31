import { drizzle } from 'drizzle-orm/node-postgres'
import { Pool } from 'pg'
import * as schema from './schema'
import { env } from '#/lib/env'

const pool = new Pool({ connectionString: env.DATABASE_URL, max: env.DB_POOL_MAX })

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error', err.message)
})

export const db = drizzle(pool, { schema })
export { pool }
