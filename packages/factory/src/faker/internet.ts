import type { Prng } from '@/prng/types'
import type { LocaleRef } from './locale'

/**
 * Internet / network namespace.
 *
 * @example
 * ```ts
 * faker.internet.email()         // "olivia.patel91@example.com"
 * faker.internet.email({ firstName: 'Alice', lastName: 'Wu' })  // "alice.wu41@…"
 * faker.internet.userName()      // "alex_anderson"
 * faker.internet.url()           // "https://app.gupta.io"
 * faker.internet.ipv4()          // "172.16.42.7"
 * faker.internet.password(12)    // "K8m$pQrt2Wz!"
 * ```
 */
export class Internet {
  constructor(
    private readonly rng: Prng,
    private readonly locale: LocaleRef,
  ) {}

  email(opts: { firstName?: string; lastName?: string } = {}): string {
    const first = (opts.firstName ?? this.rng.pick(this.locale.data.firstNames)).toLowerCase()
    const last = (opts.lastName ?? this.rng.pick(this.locale.data.lastNames)).toLowerCase()
    const suffix = this.rng.int(1, 99).toString()
    const local = this.rng.pick([`${first}.${last}`, `${first}${last}`, `${first}_${last}`])
    const domain = this.rng.pick(this.locale.data.emailDomains)
    return `${local}${suffix}@${domain}`
  }

  userName(): string {
    const first = this.rng.pick(this.locale.data.firstNames).toLowerCase()
    const last = this.rng.pick(this.locale.data.lastNames).toLowerCase()
    const numeric = this.rng.int(1, 999).toString()
    return this.rng.pick([`${first}.${last}`, `${first}_${last}`, `${first}${numeric}`])
  }

  /** Bare domain (e.g. `acme.io`). */
  domainName(): string {
    const word = this.rng.pick(this.locale.data.firstNames).toLowerCase()
    return `${word}.${this.rng.pick(this.locale.data.tlds)}`
  }

  url(): string {
    const sub = this.rng.pick(['www', 'app', 'api', 'blog', 'docs'])
    return `https://${sub}.${this.domainName()}`
  }

  ipv4(): string {
    return [
      this.rng.int(1, 255),
      this.rng.int(0, 255),
      this.rng.int(0, 255),
      this.rng.int(1, 254),
    ].join('.')
  }

  ipv6(): string {
    return Array.from({ length: 8 }, () =>
      this.rng.int(0, 0xffff).toString(16).padStart(4, '0'),
    ).join(':')
  }

  /** Random MAC address (colon-separated). */
  mac(): string {
    return Array.from({ length: 6 }, () => this.rng.int(0, 255).toString(16).padStart(2, '0')).join(
      ':',
    )
  }

  password(length = 12): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_+='
    let out = ''
    for (let i = 0; i < length; i++) {
      const ch = chars[this.rng.int(0, chars.length - 1)]
      if (ch !== undefined) out += ch
    }
    return out
  }
}
