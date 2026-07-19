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

/** Marker emitted in place of a node that is already open on the current walk. */
const CIRCULAR = { __type: 'Circular' } as const

/**
 * Recursively normalise dates, collections, undefineds, and key order so
 * snapshots are stable.
 *
 * Cycles are expected in factory output — a `has()` relation whose hook
 * back-links the child to its parent produces one — so a revisited node
 * becomes a `{ __type: 'Circular' }` marker instead of overflowing the stack.
 */
export function snapshot(value: unknown): unknown {
  return normalise(value, new Set<object>())
}

/**
 * `open` holds the nodes on the current root-to-node path, not every node ever
 * seen: a value referenced twice as a sibling (a shared pool object) is a DAG,
 * not a cycle, and is still expanded both times so the snapshot stays a
 * faithful picture of the data.
 */
function normalise(value: unknown, open: Set<object>): unknown {
  if (value === null || value === undefined) return value
  if (typeof value !== 'object') return value
  if (value instanceof Date) return { __type: 'Date', value: value.toISOString() }

  if (open.has(value)) return CIRCULAR
  open.add(value)
  try {
    if (Array.isArray(value)) return value.map((item) => normalise(item, open))

    // Map/Set contents live in internal slots, so the Object.keys() walk below
    // would flatten them to {} and hide every difference in their contents.
    // Insertion order is preserved rather than sorted: it is already
    // deterministic per the iteration-order spec, and sorting would have to key
    // off String(entry), which collides (1 vs '1', every object -> the same
    // '[object Object]') and would silently reorder unrelated entries.
    if (value instanceof Map) {
      const entries = [...value.entries()].map(([k, v]) => [normalise(k, open), normalise(v, open)])
      return { __type: 'Map', value: entries }
    }
    if (value instanceof Set) {
      return { __type: 'Set', value: [...value].map((item) => normalise(item, open)) }
    }

    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      out[key] = normalise((value as Record<string, unknown>)[key], open)
    }
    return out
  } finally {
    open.delete(value)
  }
}
