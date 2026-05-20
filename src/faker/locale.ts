import type { LocaleData } from '@/locales/types'
import { en } from '@/locales/en'

/**
 * Live reference to the active locale data. A single instance is shared by
 * every faker namespace, so swapping the locale at the `Faker` level
 * propagates instantly without rebuilding modules.
 */
export class LocaleRef {
  private currentName: string
  private currentData: LocaleData

  constructor(initial = 'en') {
    this.currentName = initial
    const data = registry.get(initial)
    if (!data) {
      throw new Error(
        `[Locale] Unknown locale "${initial}". Registered: ${[...registry.keys()].join(', ')}`,
      )
    }
    this.currentData = data
  }

  /** Read the currently-active locale data. */
  get data(): LocaleData {
    return this.currentData
  }

  /** Read the active locale's identifier (e.g. `"en"`). */
  get name(): string {
    return this.currentName
  }

  /** Swap to a different registered locale. Throws if unknown. */
  set(name: string): void {
    const data = registry.get(name)
    if (!data) {
      throw new Error(
        `[Locale] Unknown locale "${name}". Registered: ${[...registry.keys()].join(', ')}`,
      )
    }
    this.currentName = name
    this.currentData = data
  }
}

const registry = new Map<string, LocaleData>()
registry.set('en', en)

/** Register a new locale. Overwrites if `name` already exists. */
export function registerLocale(name: string, data: LocaleData): void {
  registry.set(name, data)
}

/** Read a locale's raw data without making it active. */
export function getLocale(name: string): LocaleData | undefined {
  return registry.get(name)
}

/** List every registered locale identifier. */
export function listLocales(): string[] {
  return [...registry.keys()]
}

export type { LocaleData }
export { en }
