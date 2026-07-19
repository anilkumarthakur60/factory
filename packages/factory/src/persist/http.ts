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
  const parse = options.parse ?? defaultParse
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  }

  return async (item: T): Promise<T> => {
    // Resolve the global at call time, never at construction. Adapters are
    // normally built at module scope, so snapshotting `fetch` here would pin
    // whatever existed at import — bypassing any `vi.stubGlobal('fetch', …)`,
    // msw setup or fetch polyfill installed later and hitting the real network.
    //
    // `globalThis.fetch` is typed non-nullable on Node 18+/modern browsers but
    // genuinely absent on older Node and some edge runtimes, so re-read it
    // through a `?fetch` shape to keep the runtime guard below live for TS.
    const globalFetch = (globalThis as { fetch?: FetchLike }).fetch
    // Bind to `globalThis`: browsers reject a detached `fetch` with
    // "Illegal invocation" because it requires its original receiver.
    const doFetch: FetchLike | undefined = options.fetch ?? globalFetch?.bind(globalThis)
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
    let json: unknown
    try {
      json = await response.json()
    } catch (cause) {
      // A bare SyntaxError from `response.json()` names neither the URL nor the
      // body, which is far less useful than the non-2xx message above it.
      const body = await safeRead(response)
      throw new Error(
        `[httpPersist] POST ${url} → ${response.status.toString()}: invalid JSON response (${body})`,
        { cause },
      )
    }
    return parse(json) as T
  }
}

/**
 * Documented as `json.data ?? json`: unwrap a `{ data: … }` envelope, but fall
 * back to the whole payload when `data` is nullish — an error envelope like
 * `{ data: null, error }` must not resolve `create()` to `null`.
 */
function defaultParse(json: unknown): unknown {
  if (json && typeof json === 'object' && 'data' in json) {
    return (json as { data?: unknown }).data ?? json
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
