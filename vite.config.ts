import { defineConfig, type Plugin } from 'vite'
import dts from 'vite-plugin-dts'
import { stat } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))

// Each subpath is its own bundle so consumers can do
// `import { en } from '@anil-labs/factory/locales/en'` without pulling in
// the rest of the library.
const entries = {
  index: 'src/index.ts',
  faker: 'src/faker/index.ts',
  persist: 'src/persist/index.ts',
  'locales/en': 'src/locales/en.ts',
} as const

// Per-entry size ceilings. Catches accidental dep bloat — e.g. an
// `import { something } from 'huge-lib'` slipping in. Tighten as the
// package stabilises.
const SIZE_BUDGETS_KB: Record<string, number> = {
  'index.mjs': 80,
  'index.cjs': 80,
  'faker.mjs': 60,
  'faker.cjs': 60,
  'persist.mjs': 10,
  'persist.cjs': 10,
  'locales/en.mjs': 30,
  'locales/en.cjs': 30,
}

// Inline plugin: walks dist/ after the build and fails the build if any
// entry exceeds its KB budget. Vite emits ESM and CJS as separate outputs
// so `closeBundle` fires twice — gate on "every budgeted file exists" to
// guarantee we report once, after both passes are on disk.
function sizeBudget(): Plugin {
  const KB = 1024
  let reported = false
  return {
    name: 'factory:size-budget',
    apply: 'build',
    async closeBundle() {
      if (reported) return
      const distDir = resolve(here, 'dist')
      const sizes = await Promise.all(
        Object.keys(SIZE_BUDGETS_KB).map(async (rel) => {
          try {
            const s = await stat(resolve(distDir, rel))
            return [rel, s.size / KB] as const
          } catch {
            return [rel, null] as const
          }
        }),
      )
      // Skip until both ESM and CJS passes have written their files.
      if (sizes.some(([, kb]) => kb === null)) return
      reported = true

      const pad = (s: string | number, n: number) => String(s).padEnd(n)
      const rows: string[] = []
      let failed = false
      for (const [rel, kb] of sizes) {
        const limit = SIZE_BUDGETS_KB[rel]!
        const over = (kb as number) > limit
        if (over) failed = true
        rows.push(
          `${pad(rel, 22)} ${pad(`${(kb as number).toFixed(1)} KB`, 12)} ${pad(`${limit} KB`, 10)} ${
            over ? `OVER (+${((kb as number) - limit).toFixed(1)} KB)` : 'ok'
          }`,
        )
      }
      const header =
        `\n${pad('file', 22)} ${pad('size', 12)} ${pad('budget', 10)} status\n` +
        `${'-'.repeat(22)} ${'-'.repeat(12)} ${'-'.repeat(10)} ${'-'.repeat(20)}\n`
      process.stdout.write(header + rows.join('\n') + '\n')
      if (failed) {
        this.error('[size-budget] one or more entries exceed their KB budget.')
      } else {
        process.stdout.write('[size-budget] all entries within budget.\n')
      }
    },
  }
}

export default defineConfig({
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: 'tsconfig.build.json',
      // Emit per-source `.d.ts` files (one per `src/**/*.ts`). The exports
      // map points at the directory `index.d.ts` for subpaths so consumers
      // pick up the right entry — same pattern as the snaptime package.
      // Mirror every declaration to `.d.cts` so strict node16/nodenext
      // resolution finds types for the `require` branch.
      outDirs: [{ dir: 'dist' }, { dir: 'dist', moduleFormat: 'cjs' }],
    }),
    sizeBudget(),
  ],
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, resolve(here, v)])),
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: [/^node:/],
      output: [
        {
          format: 'es',
          dir: 'dist',
          entryFileNames: '[name].mjs',
          chunkFileNames: 'chunks/[name]-[hash].mjs',
          exports: 'named',
        },
        {
          format: 'cjs',
          dir: 'dist',
          entryFileNames: '[name].cjs',
          chunkFileNames: 'chunks/[name]-[hash].cjs',
          exports: 'named',
        },
      ],
    },
  },
})
