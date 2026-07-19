import { defineConfig } from 'vite'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))

// Browser/CDN bundle. IIFE supports exactly one entry, so this is a second
// build pass over the main entry only — the subpath entries (`./faker`,
// `./persist`, `./locales/en`) are all re-exported from `src/index.ts`, so
// the global carries the full public surface.
//
// Runs after the ESM/CJS pass, hence `emptyOutDir: false` — otherwise it
// would wipe the dist/ that pass just wrote.
//
// Nothing is externalised: the library has zero runtime dependencies and no
// `node:` imports, so the global bundle is fully self-contained.
export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(here, 'src'),
    },
  },
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: false,
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(here, 'src/index.ts'),
      formats: ['iife'],
      name: 'FactoryJS',
      fileName: () => 'index.global.js',
    },
    rollupOptions: {
      output: {
        exports: 'named',
      },
    },
  },
})
