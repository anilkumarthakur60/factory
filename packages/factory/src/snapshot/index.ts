/**
 * Snapshot helpers.
 *
 * The package doesn't write files itself — it just normalises payloads so
 * test runners (vitest, jest) can snapshot them deterministically.
 *
 * @example
 * ```ts
 * import { snapshot } from '@anil-labs/factory'
 *
 * const items = UserFactory.seed(42).count(3).make()
 * expect(snapshot(items)).toMatchSnapshot()
 * ```
 */

/** Recursively normalise dates, undefineds, and key order so snapshots are stable. */
export function snapshot(value: unknown): unknown {
  return normalise(value)
}

function normalise(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (value instanceof Date) return { __type: 'Date', value: value.toISOString() }
  if (Array.isArray(value)) return value.map(normalise)
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = normalise((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}
