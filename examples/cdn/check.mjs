/**
 * Smoke-test for the browser/CDN global build.
 *
 * The HTML demo can't run in CI, so this loads the exact same bundle in a
 * browser-like sandbox and asserts the global actually works — that it's
 * exposed, carries the public surface, and produces deterministic output.
 *
 * Run: pnpm --filter example-cdn build
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { resolve, dirname } from 'node:path'
import { createContext, runInContext } from 'node:vm'
import assert from 'node:assert/strict'

const here = dirname(fileURLToPath(import.meta.url))
const bundlePath = resolve(here, '../../packages/factory/dist/index.global.js')

let code
try {
  code = readFileSync(bundlePath, 'utf8')
} catch {
  console.error(`[cdn] Global bundle not found at ${bundlePath}`)
  console.error('[cdn] Build the library first: pnpm build')
  process.exit(1)
}

// A bare sandbox — no Node globals — so anything the bundle needs beyond
// standard JS would blow up here rather than silently work in Node and fail
// in a real browser.
const sandbox = { console }
createContext(sandbox)
runInContext(code, sandbox)

const FactoryJS = sandbox.FactoryJS
assert.ok(FactoryJS, 'global `FactoryJS` was not defined by the bundle')

for (const name of ['defineFactory', 'oneOf', 'faker', 'memoryPersist', 'Factory']) {
  assert.equal(typeof FactoryJS[name] !== 'undefined', true, `FactoryJS.${name} is missing`)
}

const { defineFactory, oneOf } = FactoryJS

const userFactory = defineFactory(({ seq, faker }) => ({
  id: seq,
  name: faker.person.fullName(),
  role: oneOf(['admin', 'editor', 'viewer']),
})).state('admin', { role: 'admin' })

const one = userFactory.makeOne()
assert.equal(typeof one.name, 'string', 'generated name should be a string')
assert.equal(userFactory.count(3).makeMany().length, 3, 'count(3) should yield 3 items')
assert.equal(userFactory.state('admin').makeOne().role, 'admin', 'state should apply')

// Determinism is the headline feature — verify it survives the global build.
const a = JSON.stringify(userFactory.seed(42).count(2).makeMany())
const b = JSON.stringify(userFactory.seed(42).count(2).makeMany())
assert.equal(a, b, 'same seed should produce identical output')

const sizeKb = (Buffer.byteLength(code) / 1024).toFixed(1)
console.log(`[cdn] OK — global build works (FactoryJS, ${sizeKb} KB, deterministic).`)
