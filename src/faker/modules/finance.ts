import type { Prng } from '../../prng/types'

/**
 * Finance generators.
 *
 * @example
 * ```ts
 * faker.finance.amount()              // "327.41"
 * faker.finance.amount(0, 10, 2, '$') // "$4.27"
 * faker.finance.accountNumber()
 * faker.finance.creditCardNumber()    // 16-digit Luhn-valid number
 * faker.finance.currencyCode()
 * faker.finance.iban()
 * ```
 */
export class Finance {
  constructor(private readonly rng: Prng) {}

  amount(min = 0, max = 1000, decimals = 2, symbol = ''): string {
    return symbol + this.rng.float(min, max, decimals).toFixed(decimals)
  }

  accountNumber(digits = 10): string {
    let out = ''
    for (let i = 0; i < digits; i++) out += this.rng.int(0, 9).toString()
    return out
  }

  /** Generates a Luhn-valid 16-digit credit-card number. */
  creditCardNumber(): string {
    const digits: number[] = []
    for (let i = 0; i < 15; i++) digits.push(this.rng.int(0, 9))
    // Compute Luhn check digit.
    let sum = 0
    for (let i = digits.length - 1; i >= 0; i--) {
      let d = digits[i]!
      if ((digits.length - i) % 2 === 1) {
        d *= 2
        if (d > 9) d -= 9
      }
      sum += d
    }
    digits.push((10 - (sum % 10)) % 10)
    return digits.join('')
  }

  currencyCode(): string {
    return this.rng.pick(CURRENCY_CODES)
  }

  iban(countryCode = 'GB', length = 22): string {
    let body = ''
    for (let i = 0; i < length - 4; i++) body += this.rng.int(0, 9).toString()
    return `${countryCode}${this.rng.int(10, 99)}${body}`
  }

  bitcoinAddress(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz123456789'
    let out = this.rng.pick(['1', '3'])
    const length = this.rng.int(25, 33)
    for (let i = 1; i < length; i++) out += chars[this.rng.int(0, chars.length - 1)]
    return out
  }
}

const CURRENCY_CODES = [
  'USD',
  'EUR',
  'GBP',
  'JPY',
  'CHF',
  'CAD',
  'AUD',
  'CNY',
  'INR',
  'NPR',
  'BRL',
  'MXN',
  'SGD',
  'HKD',
  'KRW',
]
