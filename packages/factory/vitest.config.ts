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
        //
        // The remaining gaps are unreachable defensive guards (`if (x ===
        // undefined) continue` / `throw`) we added to remove non-null
        // assertions. They can't fire without invalid input, so we don't
        // chase 100%.
        lines: 98,
        statements: 97,
        functions: 99,
        branches: 87,
      },
    },
  },
})
