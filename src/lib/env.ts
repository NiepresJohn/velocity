import { z } from 'zod'
import * as dotenv from 'dotenv'
dotenv.config()

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 chars'),
  SESSION_COOKIE_NAME: z.string().default('velocity_session'),
  WORKSPACE_COOKIE_NAME: z.string().default('velocity_workspace'),
  EMAIL_FROM: z.string().email().optional(),
  EMAIL_PROVIDER: z.enum(['smtp', 'log', 'none']).default('log'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(20),
  DB_POOL_MAX: z.coerce.number().int().min(1).default(10),
})

export const env = envSchema.parse(process.env)
export const isProduction = env.NODE_ENV === 'production'
export const isDev = env.NODE_ENV === 'development'
