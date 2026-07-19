import { defineConfig, type Plugin } from 'vite'
import dts from 'vite-plugin-dts'
import { existsSync } from 'node:fs'
import { readFile, readdir, stat } from 'node:fs/promises'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  findMismatchedSpecifiers,
  rewriteDtsSpecifiers,
  type DtsExtension,
} from './scripts/rewrite-dts-specifiers'

const here = fileURLToPath(new URL('.', import.meta.url))
const SRC_DIR = resolve(here, 'src')
const DIST_DIR = resolve(here, 'dist')

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
        const limit = SIZE_BUDGETS_KB[rel]
        if (limit === undefined) continue
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

// A relative specifier names a module if a matching source file exists.
// Declarations mirror `src/` one-for-one, so probing the source tree is exact
// and — unlike probing `dist/` — works while the files are still being written.
function sourceModuleExists(absPathWithoutExtension: string): boolean {
  return ['.ts', '.tsx', '.d.ts'].some((ext) => existsSync(`${absPathWithoutExtension}${ext}`))
}

function dtsExtensionOf(filePath: string): DtsExtension | null {
  if (filePath.endsWith('.d.cts')) return '.d.cts'
  if (filePath.endsWith('.d.mts')) return '.d.mts'
  if (filePath.endsWith('.d.ts')) return '.d.ts'
  return null
}

// Collects every emitted declaration file under dist/.
async function listDeclarations(dir: string): Promise<string[]> {
  const out: string[] = []
  let items
  try {
    items = await readdir(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const item of items) {
    const full = resolve(dir, item.name)
    if (item.isDirectory()) out.push(...(await listDeclarations(full)))
    else if (dtsExtensionOf(item.name) !== null) out.push(full)
  }
  return out
}

// Inline plugin: fails the build if any emitted declaration still contains an
// extensionless relative specifier. Belt-and-braces behind the `beforeWriteFile`
// rewrite — the repo's own typecheck runs `moduleResolution: "bundler"`, which
// resolves those specifiers happily, so nothing else in CI can catch a
// regression that only breaks node16/nodenext consumers.
function dtsSpecifierGuard(): Plugin {
  return {
    name: 'factory:dts-specifier-guard',
    apply: 'build',
    async closeBundle() {
      const files = await listDeclarations(DIST_DIR)
      // Nothing emitted yet — a later invocation will do the checking.
      if (files.length === 0) return

      const offenders: string[] = []
      for (const file of files) {
        const dtsExtension = dtsExtensionOf(file)
        if (dtsExtension === null) continue
        const bad = findMismatchedSpecifiers(await readFile(file, 'utf8'), dtsExtension)
        for (const specifier of bad) offenders.push(`${relative(here, file)} -> '${specifier}'`)
      }
      if (offenders.length > 0) {
        this.error(
          `[dts-specifier-guard] ${String(offenders.length)} relative specifier(s) carry the ` +
            `wrong (or no) file extension; node16/nodenext consumers would silently get \`any\`:\n` +
            offenders.map((o) => `  ${o}`).join('\n'),
        )
      }
      process.stdout.write(
        `[dts-specifier-guard] ${String(files.length)} declaration file(s) are node16-clean.\n`,
      )
    },
  }
}

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(here, 'src'),
    },
  },
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
      // TypeScript copies the source's extensionless specifiers straight into
      // the emitted declarations, which node16/nodenext resolution rejects —
      // and with `skipLibCheck: true` (the default everywhere) the consumer
      // never sees the error, they just get `any` for the whole library.
      // Rewrite each specifier to point at a concrete file: `.js` in the
      // `.d.ts` tree, `.cjs` in the `.d.cts` mirror.
      beforeWriteFile(filePath, content) {
        const dtsExtension = dtsExtensionOf(filePath)
        if (dtsExtension === null) return

        return {
          content: rewriteDtsSpecifiers(content, {
            dtsExtension,
            sourceDir: dirname(resolve(SRC_DIR, relative(DIST_DIR, filePath))),
            probe: sourceModuleExists,
          }),
        }
      },
    }),
    dtsSpecifierGuard(),
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
