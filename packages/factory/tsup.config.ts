import { defineConfig } from 'tsup'

/**
 * Two build definitions in one file.
 *
 * The library build emits each subpath as its own bundle so consumers can
 * `import { en } from '@anil-labs/factory/locales/en'` without pulling in the
 * rest. The browser build is separate because IIFE has a single global name
 * and so cannot sensibly cover four entries — everything is re-exported from
 * `src/index.ts`, so the global carries the full public surface anyway.
 *
 * tsup *bundles* declarations (one .d.ts per entry, no internal relative
 * imports), which is why this package no longer needs the post-build
 * specifier rewrite the previous vite-plugin-dts setup required: extensionless
 * relative specifiers under `moduleResolution: "node16"` silently degraded the
 * whole public API to `any`. `scripts/check-dist.ts` guards against that
 * regressing.
 */
export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      faker: 'src/faker/index.ts',
      persist: 'src/persist/index.ts',
      'locales/en': 'src/locales/en.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    tsconfig: 'tsconfig.tsup.json',
    // No sourcemaps in the published package. They were 64% of the tarball
    // (460 KB of 724 KB) for a debugging aid almost nobody uses on a
    // test-data factory that is itself a devDependency, and they do not
    // affect consumers' bundle size either way since bundlers strip them.
    // The repo's own tests run against `src` through the `@` alias and never
    // touch dist, so nothing local depends on them either.
    sourcemap: false,
    clean: true,
    treeshake: true,
    splitting: true,
    target: 'es2022',
    outDir: 'dist',
  },
  {
    entry: { index: 'src/index.ts' },
    format: ['iife'],
    globalName: 'FactoryJS',
    // The library build owns `clean`; this pass must not wipe it.
    clean: false,
    dts: false,
    // No sourcemaps in the published package. They were 64% of the tarball
    // (460 KB of 724 KB) for a debugging aid almost nobody uses on a
    // test-data factory that is itself a devDependency, and they do not
    // affect consumers' bundle size either way since bundlers strip them.
    // The repo's own tests run against `src` through the `@` alias and never
    // touch dist, so nothing local depends on them either.
    sourcemap: false,
    treeshake: true,
    target: 'es2022',
    outDir: 'dist',
    outExtension: () => ({ js: '.global.js' }),
  },
])
