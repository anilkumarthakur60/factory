import type { Prng } from '@/prng/types'
import type { LocaleRef } from './locale'

/**
 * Commerce generators.
 *
 * @example
 * ```ts
 * faker.commerce.productName()   // "Bamboo Notebook"
 * faker.commerce.price()         // 24.99
 * faker.commerce.department()    // "Electronics"
 * ```
 */
export class Commerce {
  constructor(
    private readonly rng: Prng,
    private readonly locale: LocaleRef,
  ) {}

  productName(): string {
    return this.rng.pick(this.locale.data.productNames)
  }

  department(): string {
    return this.rng.pick(this.locale.data.departments)
  }

  price(min = 1, max = 1000, decimals = 2): number {
    return this.rng.float(min, max, decimals)
  }

  productDescription(): string {
    const adj = this.rng.pick(['Premium', 'Eco-friendly', 'Hand-crafted', 'Vintage', 'Modern'])
    return `${adj} ${this.productName().toLowerCase()} designed for everyday use.`
  }
}
