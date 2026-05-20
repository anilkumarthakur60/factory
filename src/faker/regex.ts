import type { Prng } from '@/prng/types'

/**
 * Generate a sample string that matches the given regular-expression pattern.
 *
 * Supports the regex subset commonly used in test data:
 *   - Literals, dot, escaped characters
 *   - Character classes `[a-z]`, `[^…]`, `\d`, `\D`, `\w`, `\W`, `\s`, `\S`
 *   - Groups `(...)`, non-capturing `(?:...)`, alternation `a|b|c`
 *   - Quantifiers `*`, `+`, `?`, `{n}`, `{n,m}` (lazy `?` is ignored)
 *
 * Unsupported regex features (lookbehind/lookahead, backreferences,
 * named groups) are silently treated as literals.
 *
 * @example
 * ```ts
 * generateFromRegex(/[A-Z]{3}-\d{4}/, prng) // "ZQX-4172"
 * ```
 */
export function generateFromRegex(pattern: RegExp | string, rng: Prng): string {
  const src = pattern instanceof RegExp ? pattern.source : pattern
  const parser = new RegexParser(src)
  const tree = parser.parse()
  return render(tree, rng)
}

// ---------------------------------------------------------------------------
// Character pools
// ---------------------------------------------------------------------------

function charRange(startCode: number, endCode: number): string[] {
  const out: string[] = []
  for (let c = startCode; c <= endCode; c++) out.push(String.fromCharCode(c))
  return out
}

const D = charRange(0x30, 0x39) // '0'..'9'
const L = charRange(0x61, 0x7a) // 'a'..'z'
const U = charRange(0x41, 0x5a) // 'A'..'Z'
const W = [...D, ...L, ...U, '_']
const S = [' ', '\t']
const NW = [' ', '!', '@', '#', '$', '%', '&', '*', '-', '+', '=', ';', ':', ',', '.', '/', '?']
const ALL = [...W, ...S, '!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '-', '+']

function expandEscape(ch: string): string[] {
  switch (ch) {
    case 'd':
      return [...D]
    case 'D':
      return [...L, ...U, '_', ' ']
    case 'w':
      return [...W]
    case 'W':
      return [...NW]
    case 's':
      return [...S]
    case 'S':
      return [...W, ...NW]
    case 'n':
      return ['\n']
    case 't':
      return ['\t']
    case 'r':
      return ['\r']
    default:
      return [ch]
  }
}

// ---------------------------------------------------------------------------
// AST nodes
// ---------------------------------------------------------------------------

interface Quantified {
  max: number
  min: number
  node: Node
}
interface SeqNode {
  items: Quantified[]
  kind: 'seq'
}
type Node =
  | { kind: 'lit'; value: string }
  | { kind: 'class'; pool: string[] }
  | { kind: 'dot' }
  | SeqNode
  | { branches: SeqNode[]; kind: 'alt' }

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

class RegexParser {
  private pos = 0
  constructor(private readonly src: string) {}

  parse(): Node {
    return this.parseAlt()
  }

  private peek(): string | undefined {
    return this.src[this.pos]
  }

  private parseAlt(): Node {
    const branches: SeqNode[] = [this.parseSeq()]
    while (this.peek() === '|') {
      this.pos++
      branches.push(this.parseSeq())
    }
    if (branches.length === 1) {
      const only = branches[0]
      if (only === undefined) throw new Error('[regex] unreachable: empty branches')
      return only
    }
    return { kind: 'alt', branches }
  }

  private parseSeq(): SeqNode {
    const items: Quantified[] = []
    while (this.pos < this.src.length && this.peek() !== ')' && this.peek() !== '|') {
      const node = this.parseAtom()
      const q = this.parseQuant()
      items.push({ node, min: q.min, max: q.max })
      if (this.peek() === '?') this.pos++ // lazy modifier on group-level — ignore
    }
    return { kind: 'seq', items }
  }

  private parseAtom(): Node {
    const ch = this.peek()
    if (ch === '(') {
      this.pos++
      // Handle non-capturing `(?:...)` and other special forms — we just
      // skip up to the colon and treat as a group.
      if (this.peek() === '?') {
        const colon = this.src.indexOf(':', this.pos)
        if (colon !== -1) this.pos = colon + 1
      }
      const inner = this.parseAlt()
      if (this.peek() === ')') this.pos++
      return inner
    }
    if (ch === '[') {
      this.pos++
      return { kind: 'class', pool: this.parseCharClass() }
    }
    if (ch === '.') {
      this.pos++
      return { kind: 'dot' }
    }
    if (ch === '^' || ch === '$') {
      this.pos++
      return { kind: 'lit', value: '' }
    }
    if (ch === '\\') {
      this.pos++
      const escaped = this.src[this.pos++] ?? ''
      return { kind: 'class', pool: expandEscape(escaped) }
    }
    this.pos++
    return { kind: 'lit', value: ch ?? '' }
  }

  private parseCharClass(): string[] {
    let negate = false
    if (this.peek() === '^') {
      negate = true
      this.pos++
    }
    const pool: string[] = []
    while (this.pos < this.src.length && this.peek() !== ']') {
      if (this.peek() === '\\') {
        this.pos++
        pool.push(...expandEscape(this.src[this.pos++] ?? ''))
      } else if (
        this.src[this.pos + 1] === '-' &&
        this.src[this.pos + 2] &&
        this.src[this.pos + 2] !== ']'
      ) {
        const fromCh = this.src[this.pos]
        const toCh = this.src[this.pos + 2]
        if (fromCh !== undefined && toCh !== undefined) {
          const from = fromCh.charCodeAt(0)
          const to = toCh.charCodeAt(0)
          for (let c = from; c <= to; c++) pool.push(String.fromCharCode(c))
        }
        this.pos += 3
      } else {
        const ch = this.src[this.pos++]
        if (ch !== undefined) pool.push(ch)
      }
    }
    if (this.peek() === ']') this.pos++
    if (negate) {
      const set = new Set(pool)
      return ALL.filter((c) => !set.has(c))
    }
    return pool.length > 0 ? pool : ['a']
  }

  private parseQuant(): { max: number; min: number } {
    const ch = this.peek()
    if (ch === '*') {
      this.pos++
      return { min: 0, max: 8 }
    }
    if (ch === '+') {
      this.pos++
      return { min: 1, max: 8 }
    }
    if (ch === '?') {
      this.pos++
      return { min: 0, max: 1 }
    }
    if (ch === '{') {
      const end = this.src.indexOf('}', this.pos)
      if (end !== -1) {
        const inner = this.src.slice(this.pos + 1, end)
        this.pos = end + 1
        if (this.peek() === '?') this.pos++ // lazy — ignore
        const parts = inner.split(',')
        const lo = parseInt(parts[0] ?? '1', 10)
        const hi = parts.length > 1 ? (parts[1] ? parseInt(parts[1], 10) : lo + 4) : lo
        return { min: lo, max: Math.min(hi, lo + 10) }
      }
    }
    return { min: 1, max: 1 }
  }
}

// ---------------------------------------------------------------------------
// Render
// ---------------------------------------------------------------------------

function render(node: Node, rng: Prng): string {
  switch (node.kind) {
    case 'lit':
      return node.value
    case 'class':
      return node.pool.length > 0 ? rng.pick(node.pool) : ''
    case 'dot':
      return rng.pick([...W, ' '])
    case 'seq': {
      let out = ''
      for (const item of node.items) {
        const count = rng.int(item.min, item.max)
        for (let i = 0; i < count; i++) out += render(item.node, rng)
      }
      return out
    }
    case 'alt':
      return render(rng.pick(node.branches), rng)
  }
}
