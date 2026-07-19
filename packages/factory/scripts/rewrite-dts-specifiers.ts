/**
 * Rewrites relative module specifiers inside emitted declaration files so they
 * carry an explicit file extension matching the declaration's own flavour.
 *
 * TypeScript emits `.d.ts` with the same extensionless specifiers the source
 * used (`export { Factory } from './core/factory'`). Under `moduleResolution:
 * "node16"` / `"nodenext"` those specifiers are illegal (TS2834/TS2835), and
 * because virtually every consumer runs with `skipLibCheck: true` the
 * diagnostic is swallowed while resolution still fails — so every re-exported
 * symbol silently becomes `any`. The package looks like it typechecks while
 * providing no type safety at all.
 *
 * The `.d.cts` mirror needs `.cjs` rather than `.js`: a `.js` specifier there
 * resolves to the sibling `.d.ts`, which is ESM (package.json declares
 * `"type": "module"`), giving TS1479 and the same `any` fallback.
 */

/** Declaration file flavours vite-plugin-dts can emit. */
export type DtsExtension = '.d.ts' | '.d.cts' | '.d.mts'

/**
 * The runtime extension a specifier must carry for a given declaration
 * flavour. TS maps `./x.js` -> `x.d.ts`, `./x.cjs` -> `x.d.cts`,
 * `./x.mjs` -> `x.d.mts`.
 */
const RUNTIME_EXTENSION: Record<DtsExtension, string> = {
  '.d.ts': '.js',
  '.d.cts': '.cjs',
  '.d.mts': '.mjs',
}

/**
 * Matches the quoted specifier of `from '...'`, `import('...')` and
 * `require('...')`, capturing only relative ones. Declaration files never
 * contain string literals in other positions that could be mistaken for these,
 * so a regex is sufficient and avoids pulling the compiler API into the build.
 */
const RELATIVE_SPECIFIER = /(\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)(['"])(\.\.?\/[^'"]*)\2/g

/** A JS runtime extension already present on a specifier. */
const RUNTIME_SUFFIX = /\.[cm]?js$/

/** Assets that are not modules of ours and must never be re-keyed. */
const NON_MODULE_SUFFIX = /\.(json|node|css)$/

/**
 * Probes whether an extensionless absolute path names a module. Injected so
 * the rewrite is a pure function that can be tested without touching disk.
 *
 * @param absPathWithoutExtension - absolute path, no extension
 * @returns `true` when a source module exists at that path
 */
export type ModuleProbe = (absPathWithoutExtension: string) => boolean

export interface RewriteDtsOptions {
  /** Flavour of the declaration file being written. */
  readonly dtsExtension: DtsExtension
  /** Tells the rewriter whether a resolved path is a real module. */
  readonly probe: ModuleProbe
  /**
   * Absolute directory of the *source* module this declaration was generated
   * from. Relative specifiers are resolved against it.
   */
  readonly sourceDir: string
}

/** Joins POSIX-style path segments, collapsing `.` and `..`. */
function joinPosix(base: string, relativePath: string): string {
  const segments = base.split('/')
  for (const segment of relativePath.split('/')) {
    if (segment === '' || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return segments.join('/')
}

/**
 * Resolves one relative specifier to its canonical, extension-bearing form.
 *
 * Returns `null` when the specifier should be left exactly as written — either
 * it is not one of ours (`.json`) or the probe cannot resolve it, in which case
 * guessing would be worse than the status quo.
 */
function resolveSpecifier(
  specifier: string,
  sourceDir: string,
  runtimeExtension: string,
  probe: ModuleProbe,
): string | null {
  if (NON_MODULE_SUFFIX.test(specifier)) return null

  // Strip any runtime extension already present so re-running for a different
  // flavour re-keys `.js` -> `.cjs` instead of bailing out. vite-plugin-dts
  // feeds the `.d.cts` pass the content the `.d.ts` pass already produced.
  const stem = specifier.replace(RUNTIME_SUFFIX, '').replace(/\/+$/, '')
  const resolved = joinPosix(sourceDir, stem)

  if (probe(resolved)) return `${stem}${runtimeExtension}`
  // node16 does no directory-index lookup for relative paths, so a specifier
  // naming a folder must be expanded to its index module.
  if (probe(`${resolved}/index`)) return `${stem}/index${runtimeExtension}`
  return null
}

/** Adds/corrects explicit extensions on every relative specifier in a declaration file. */
export function rewriteDtsSpecifiers(content: string, options: RewriteDtsOptions): string {
  const { dtsExtension, probe, sourceDir } = options
  const runtimeExtension = RUNTIME_EXTENSION[dtsExtension]
  const base = sourceDir.replaceAll('\\', '/').replace(/\/+$/, '')

  return content.replace(
    RELATIVE_SPECIFIER,
    (match, prefix: string, quote: string, specifier: string) => {
      const next = resolveSpecifier(specifier, base, runtimeExtension, probe)
      return next === null ? match : `${prefix}${quote}${next}${quote}`
    },
  )
}

/**
 * Finds relative specifiers that would not resolve under node16/nodenext for a
 * declaration of the given flavour: no extension at all, or the extension of a
 * different flavour (`.js` inside a `.d.cts`). Used as a post-build guard so
 * this class of breakage can never ship again — the repo's own typecheck runs
 * `moduleResolution: "bundler"`, which resolves all of these happily.
 */
export function findMismatchedSpecifiers(content: string, dtsExtension: DtsExtension): string[] {
  const expected = RUNTIME_EXTENSION[dtsExtension]
  const bad: string[] = []
  for (const match of content.matchAll(RELATIVE_SPECIFIER)) {
    const specifier = match[3]
    if (specifier === undefined) continue
    if (NON_MODULE_SUFFIX.test(specifier)) continue
    if (!specifier.endsWith(expected)) bad.push(specifier)
  }
  return bad
}
