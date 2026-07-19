/**
 * Post-build guard. Two jobs:
 *
 * 1. SIZE BUDGETS — catch accidental dependency bloat (an `import` from a huge
 *    library slipping into a subpath entry). Tighten as the package stabilises.
 *
 * 2. NODE16 DECLARATION RESOLUTION — assert no emitted declaration carries an
 *    extensionless relative specifier. Under `moduleResolution: "node16"` /
 *    "nodenext" those are illegal, and because nearly every consumer runs with
 *    `skipLibCheck: true` the diagnostic is swallowed while resolution still
 *    fails — so every re-exported symbol silently becomes `any`. The package
 *    looks like it typechecks while providing no type safety at all. That was a
 *    real shipped bug; tsup bundles declarations so it should not recur, but
 *    this makes the guarantee explicit rather than incidental.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { resolve, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const DIST = resolve(fileURLToPath(new URL('.', import.meta.url)), '../dist')
const KB = 1024

/**
 * Ceiling for all emitted runtime JS combined, in KB.
 *
 * Per-entry budgets alone stopped being a real bloat guard once the build
 * started code-splitting: shared code moves into `chunk-*.js`, so a subpath
 * entry can read as 0.1 KB while pulling in far more. This total is what
 * actually catches a heavy dependency slipping in. Sourcemaps and declarations
 * are excluded — they do not ship weight consumers execute.
 */
const TOTAL_JS_BUDGET_KB = 230

/** Per-file ceilings in KB. */
const SIZE_BUDGETS = {
  'index.js': 80,
  'index.cjs': 80,
  'faker.js': 60,
  'faker.cjs': 60,
  'persist.js': 10,
  'persist.cjs': 10,
  'locales/en.js': 30,
  'locales/en.cjs': 30,
  'index.global.js': 100,
}

function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

let failed = false
const files = walk(DIST)

// ---------------------------------------------------------------- size ----
const pad = (s, n) => String(s).padEnd(n)
const rows = []
for (const [rel, limit] of Object.entries(SIZE_BUDGETS)) {
  const full = join(DIST, rel)
  let kb
  try {
    kb = statSync(full).size / KB
  } catch {
    console.error(`[check-dist] MISSING expected build output: ${rel}`)
    failed = true
    continue
  }
  const over = kb > limit
  if (over) failed = true
  rows.push(
    `${pad(rel, 20)} ${pad(`${kb.toFixed(1)} KB`, 12)} ${pad(`${limit} KB`, 10)} ${
      over ? `OVER (+${(kb - limit).toFixed(1)} KB)` : 'ok'
    }`,
  )
}
console.log(
  `\n${pad('file', 20)} ${pad('size', 12)} ${pad('budget', 10)} status\n` +
    `${'-'.repeat(20)} ${'-'.repeat(12)} ${'-'.repeat(10)} ${'-'.repeat(20)}`,
)
console.log(rows.join('\n'))

const totalJsKb =
  files
    .filter((f) => /\.(js|cjs|mjs)$/.test(f) && !f.endsWith('.map'))
    .reduce((sum, f) => sum + statSync(f).size, 0) / KB
const totalOver = totalJsKb > TOTAL_JS_BUDGET_KB
if (totalOver) failed = true
console.log(
  `${pad('TOTAL runtime js', 20)} ${pad(`${totalJsKb.toFixed(1)} KB`, 12)} ${pad(
    `${TOTAL_JS_BUDGET_KB} KB`,
    10,
  )} ${totalOver ? `OVER (+${(totalJsKb - TOTAL_JS_BUDGET_KB).toFixed(1)} KB)` : 'ok'}`,
)

// ------------------------------------------------- declaration specifiers --
// Matches `from './x'` / `import('./x')` where the specifier has no extension.
const RELATIVE_SPECIFIER = /(?:from\s*|import\(\s*)['"](\.[^'"]*)['"]/g
const decls = files.filter((f) => /\.d\.(ts|cts|mts)$/.test(f))
const offenders = []

for (const file of decls) {
  const text = readFileSync(file, 'utf8')
  for (const [, spec] of text.matchAll(RELATIVE_SPECIFIER)) {
    // A specifier is node16-safe only if it ends in an explicit runtime
    // extension. Directory specifiers ('./faker') are unsafe too.
    if (!/\.(js|cjs|mjs)$/.test(spec)) {
      offenders.push(`${relative(DIST, file)} -> ${spec}`)
    }
  }
}

if (offenders.length > 0) {
  failed = true
  console.error(
    `\n[check-dist] ${offenders.length} extensionless relative specifier(s) in emitted declarations.`,
  )
  console.error('[check-dist] These resolve to `any` under moduleResolution node16/nodenext:')
  for (const o of offenders.slice(0, 20)) console.error(`  ${o}`)
} else {
  console.log(
    `\n[check-dist] ${decls.length} declaration files: no extensionless relative specifiers.`,
  )
}

if (failed) {
  console.error('\n[check-dist] FAILED')
  process.exit(1)
}
console.log('[check-dist] all checks passed.\n')
