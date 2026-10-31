import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Separate from vite.config.ts so tests don't load the Start/Nitro plugins.
export default defineConfig({
  resolve: { alias: { '#': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: { include: ['src/**/*.test.ts'] },
})
