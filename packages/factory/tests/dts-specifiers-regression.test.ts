import { describe, expect, it } from 'vitest'
import { findMismatchedSpecifiers, rewriteDtsSpecifiers } from '../scripts/rewrite-dts-specifiers'

// Regression cover for: "every public entry point silently degrades to `any`
// under moduleResolution node16/nodenext". vite-plugin-dts emitted declarations
// whose relative re-exports had no file extension; node16 rejects those, and
// with `skipLibCheck: true` the failure is silent, so consumers got `any` for
// the whole library. The repo's own typecheck uses `moduleResolution: bundler`,
// which resolves them fine — hence these tests assert on the emitted text.

// Mirrors the real `src/` layout closely enough to exercise both the
// file-specifier and directory-specifier paths.
const SOURCE_MODULES = new Set([
  '/repo/src/index',
  '/repo/src/core/factory',
  '/repo/src/core/types',
  '/repo/src/faker/index',
  '/repo/src/faker/faker',
  '/repo/src/faker/locale',
  '/repo/src/locales/types',
  '/repo/src/prng/index',
])

const probe = (path: string): boolean => SOURCE_MODULES.has(path)

describe('rewriteDtsSpecifiers', () => {
  it('adds .js to relative specifiers in the .d.ts tree', () => {
    const out = rewriteDtsSpecifiers(`export { Factory, defineFactory } from './core/factory';\n`, {
      dtsExtension: '.d.ts',
      sourceDir: '/repo/src',
      probe,
    })

    expect(out).toBe(`export { Factory, defineFactory } from './core/factory.js';\n`)
  })

  it('adds .cjs to relative specifiers in the .d.cts mirror', () => {
    // Without this the `.d.cts` re-export resolves to the sibling `.d.ts`,
    // which is ESM (package.json has "type": "module") — TS1479.
    const out = rewriteDtsSpecifiers(`export { Factory } from './core/factory';\n`, {
      dtsExtension: '.d.cts',
      sourceDir: '/repo/src',
      probe,
    })

    expect(out).toBe(`export { Factory } from './core/factory.cjs';\n`)
  })

  it('re-keys .js to .cjs when producing the .d.cts mirror', () => {
    // vite-plugin-dts feeds the cjs pass the content the `.d.ts` pass already
    // produced, so the rewriter must correct an existing extension, not skip it.
    const out = rewriteDtsSpecifiers(`export { Faker } from './faker/index.js';\n`, {
      dtsExtension: '.d.cts',
      sourceDir: '/repo/src',
      probe,
    })

    expect(out).toBe(`export { Faker } from './faker/index.cjs';\n`)
  })

  it('expands a directory specifier to its index file', () => {
    // node16 does no directory-index lookup for relative paths, so './faker'
    // must become './faker/index.js'.
    const out = rewriteDtsSpecifiers(`export { Faker, faker } from './faker';\n`, {
      dtsExtension: '.d.ts',
      sourceDir: '/repo/src',
      probe,
    })

    expect(out).toBe(`export { Faker, faker } from './faker/index.js';\n`)
  })

  it('resolves parent-relative specifiers against the declaration source dir', () => {
    const out = rewriteDtsSpecifiers(`export type { LocaleData } from '../locales/types';\n`, {
      dtsExtension: '.d.ts',
      sourceDir: '/repo/src/faker',
      probe,
    })

    expect(out).toBe(`export type { LocaleData } from '../locales/types.js';\n`)
  })

  it('covers type-only imports, dynamic imports and require calls', () => {
    const input = [
      `import type { Prng } from './prng';`,
      `type Lazy = typeof import('./core/factory');`,
      `declare const m: typeof require('./core/types');`,
    ].join('\n')

    const out = rewriteDtsSpecifiers(input, {
      dtsExtension: '.d.ts',
      sourceDir: '/repo/src',
      probe,
    })

    expect(out).toBe(
      [
        `import type { Prng } from './prng/index.js';`,
        `type Lazy = typeof import('./core/factory.js');`,
        `declare const m: typeof require('./core/types.js');`,
      ].join('\n'),
    )
  })

  it('is idempotent for a given flavour', () => {
    const once = rewriteDtsSpecifiers(`export { Faker } from './faker';\n`, {
      dtsExtension: '.d.ts',
      sourceDir: '/repo/src',
      probe,
    })
    const twice = rewriteDtsSpecifiers(once, {
      dtsExtension: '.d.ts',
      sourceDir: '/repo/src',
      probe,
    })

    expect(twice).toBe(once)
  })

  it('leaves bare specifiers and non-module assets alone', () => {
    const input = [`import { z } from 'node:util';`, `import data from './data.json';`].join('\n')

    expect(
      rewriteDtsSpecifiers(input, { dtsExtension: '.d.ts', sourceDir: '/repo/src', probe }),
    ).toBe(input)
  })

  it('leaves unresolvable specifiers untouched rather than guessing', () => {
    const input = `export { x } from './does/not/exist';\n`

    expect(
      rewriteDtsSpecifiers(input, { dtsExtension: '.d.ts', sourceDir: '/repo/src', probe }),
    ).toBe(input)
  })
})

describe('findMismatchedSpecifiers', () => {
  it('flags the exact shape that shipped broken declarations', () => {
    const emitted = [
      `export { Faker, faker } from './faker';`,
      `export type { LocaleData } from '../locales/types';`,
    ].join('\n')

    expect(findMismatchedSpecifiers(emitted, '.d.ts')).toStrictEqual([
      './faker',
      '../locales/types',
    ])
  })

  it('flags a .d.cts that kept the ESM .js extension', () => {
    const emitted = `export { Faker, faker } from './faker/index.js';`

    expect(findMismatchedSpecifiers(emitted, '.d.cts')).toStrictEqual(['./faker/index.js'])
  })

  it('reports nothing once specifiers match the declaration flavour', () => {
    expect(
      findMismatchedSpecifiers(
        [
          `export { Faker } from './faker/index.js';`,
          `export type { LocaleData } from '../locales/types.js';`,
          `import { z } from 'node:util';`,
        ].join('\n'),
        '.d.ts',
      ),
    ).toStrictEqual([])

    expect(
      findMismatchedSpecifiers(`export { Faker } from './faker/index.cjs';`, '.d.cts'),
    ).toStrictEqual([])
  })
})
