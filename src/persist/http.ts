import type { Persist } from '@/core/types'

/** Minimal `fetch`-like interface — works with `fetch`, `axios.request`, etc. */
type FetchLike = (
  url: string,
  init: { body: string; headers: Record<string, string>; method: string },
) => Promise<{
  json(): Promise<unknown>
  ok: boolean
  status: number
  text(): Promise<string>
}>

export interface HttpPersistOptions {
  /** Custom fetch implementation (defaults to global `fetch`). */
  fetch?: FetchLike
  /** Extra HTTP headers — combined with `Content-Type: application/json`. */
  headers?: Record<string, string>
  /**
   * Function that extracts the persisted entity from the HTTP response.
   * Defaults to `(json) => json.data ?? json` to handle both wrapped + flat shapes.
   */
  parse?: (responseJson: unknown) => unknown
}

/**
 * HTTP persistence adapter. POSTs each built item to `url` and returns the
 * server-assigned representation.
 *
 * Works with any `fetch`-shaped implementation — pass `axios.request` or a
 * test double if you need to intercept.
 *
 * @example
 * ```ts
 * import { httpPersist } from '@anil-labs/factory'
 *
 * const UserFactory = defineFactory<User>(...).persist(
 *   httpPersist<User>('/api/users')
 * )
 * await UserFactory.count(3).create()
 * ```
 */
export function httpPersist<T>(url: string, options: HttpPersistOptions = {}): Persist<T> {
  // `globalThis.fetch` is typed non-nullable on Node 18+/modern browsers but
  // genuinely absent on older Node and some edge runtimes. Re-read it through
  // a `?fetch` shape so TypeScript can see the runtime guard below as live.
  const globalFetch = (globalThis as { fetch?: FetchLike }).fetch
  const doFetch: FetchLike | undefined = options.fetch ?? globalFetch
  const parse = options.parse ?? defaultParse
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  }

  return async (item: T): Promise<T> => {
    if (!doFetch) {
      throw new Error(
        '[httpPersist] No global `fetch` is available — pass `options.fetch` explicitly.',
      )
    }
    const response = await doFetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(item),
    })
    if (!response.ok) {
      const body = await safeRead(response)
      throw new Error(`[httpPersist] POST ${url} → ${response.status.toString()}: ${body}`)
    }
    const json = (await response.json()) as Record<string, unknown>
    return parse(json) as T
  }
}

function defaultParse(json: unknown): unknown {
  if (json && typeof json === 'object' && 'data' in json) {
    return json.data
  }
  return json
}

async function safeRead(response: { text(): Promise<string> }): Promise<string> {
  try {
    return await response.text()
  } catch {
    return '<unreadable body>'
  }
}
