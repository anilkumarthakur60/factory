import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(here, 'src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    globals: false,
    reporters: ['default'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      // Exclude:
      //  - barrels (`index.ts` files just re-export — no runtime to cover)
      //  - type-only modules (`types.ts` — declarations don't emit JS)
      //  - `.d.ts` and build output
      exclude: [
        'tests/**',
        '**/*.d.ts',
        'dist/**',
        'src/index.ts',
        'src/**/index.ts',
        'src/**/types.ts',
      ],
      thresholds: {
        // Floor matches today's real numbers (rounded down with a 1-2% buffer
        // for natural drift between runs). Ratchet up whenever new tests land
        // — never down. CI fails if we drop below.
        lines: 93,
        statements: 91,
        functions: 95,
        branches: 77,
      },
    },
  },
})
