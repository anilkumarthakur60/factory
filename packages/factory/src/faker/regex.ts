import type { Prng } from '@/prng/types'

/**
 * Generate a sample string that matches the given regular-expression pattern.
 *
 * Supports the regex subset commonly used in test data:
 *   - Literals, dot, escaped characters, `\xHH`, `\uHHHH`, `\u{H…}`
 *   - Character classes `[a-z]`, `[^…]`, `\d`, `\D`, `\w`, `\W`, `\s`, `\S`
 *   - Anchors `^`, `$` and word boundaries `\b`, `\B` (emit nothing)
 *   - Groups `(...)`, non-capturing `(?:...)`, named `(?<name>...)`,
 *     alternation `a|b|c`
 *   - Quantifiers `*`, `+`, `?`, `{n}`, `{n,}`, `{n,m}` (lazy `?` is ignored)
 *
 * Lookaround assertions are dropped, so output is not guaranteed to satisfy
 * them. Backreferences are unsupported and rendered as their digit.
 * Boundaries are not enforced either: `\bfoo\b` yields "foo", but `a\bb`
 * still yields "ab".
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
// `\S` reuses the non-word pool, but a space is both non-word *and* whitespace —
// drawing one would produce output that fails the very regex it was generated from.
const NW_NO_SPACE = NW.filter((c) => !S.includes(c))
// Universe a negated class `[^…]` draws from: printable ASCII plus tab. Broad
// enough that excluding a handful of classes still leaves something to emit.
const ALL = ['\t', ...charRange(0x20, 0x7e)]

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
      return [...W, ...NW_NO_SPACE]
    case 'n':
      return ['\n']
    case 't':
      return ['\t']
    case 'r':
      return ['\r']
    case 'f':
      return ['\f']
    case 'v':
      return ['\v']
    case '0':
      return ['\0']
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
      // Non-capturing `(?:...)` and named `(?<name>...)` groups behave exactly
      // like a plain group, so drop the prefix. Never scan ahead for a colon:
      // the nearest one is usually a literal outside the group, and skipping to
      // it would silently delete the pattern in between.
      let zeroWidth = false
      if (this.peek() === '?') {
        const rest = this.src.slice(this.pos + 1)
        const named = /^<[A-Za-z_$][\w$]*>/.exec(rest)
        const lookaround = /^(?:=|!|<=|<!)/.exec(rest)
        if (rest.startsWith(':')) this.pos += 2
        else if (named) this.pos += 1 + named[0].length
        else if (lookaround) {
          this.pos += 1 + lookaround[0].length
          zeroWidth = true
        }
      }
      const inner = this.parseAlt()
      if (this.peek() === ')') this.pos++
      return zeroWidth ? { kind: 'lit', value: '' } : inner
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
      // Word boundaries are zero-width; emitting the letter breaks the match.
      if (this.peek() === 'b' || this.peek() === 'B') {
        this.pos++
        return { kind: 'lit', value: '' }
      }
      return { kind: 'class', pool: this.readEscape(false) }
    }
    this.pos++
    return { kind: 'lit', value: ch ?? '' }
  }

  /**
   * Consume the escape after a backslash and return the characters it can
   * stand for. `inClass` matters for `\b`, which is a backspace inside `[…]`.
   */
  private readEscape(inClass: boolean): string[] {
    const ch = this.src[this.pos++] ?? ''
    if (ch === 'b' && inClass) return ['\b']
    if (ch === 'x' || ch === 'u') {
      const rest = this.src.slice(this.pos)
      const m =
        ch === 'x'
          ? /^[0-9a-fA-F]{2}/.exec(rest)
          : (/^\{([0-9a-fA-F]+)\}/.exec(rest) ?? /^[0-9a-fA-F]{4}/.exec(rest))
      if (m) {
        this.pos += m[0].length
        return [String.fromCodePoint(parseInt(m[1] ?? m[0], 16))]
      }
      // Without hex digits, `\x` / `\u` is the literal letter.
    }
    return expandEscape(ch)
  }

  private parseCharClass(): string[] {
    const start = this.pos
    let negate = false
    if (this.peek() === '^') {
      negate = true
      this.pos++
    }
    const pool: string[] = []
    while (this.pos < this.src.length && this.peek() !== ']') {
      if (this.peek() === '\\') {
        this.pos++
        pool.push(...this.readEscape(true))
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
    const body = this.src.slice(start, this.pos)
    if (this.peek() === ']') this.pos++
    if (negate) {
      // Let the engine decide membership: the hand-written pools only
      // approximate classes like `\W`, so a set difference over them can emit
      // characters the class actually rejects.
      let exact: RegExp | null = null
      try {
        exact = new RegExp(`^[${body}]$`)
      } catch {
        // Malformed class — fall back to the approximate pools below.
      }
      const set = new Set(pool)
      return ALL.filter((c) => (exact ? exact.test(c) : !set.has(c)))
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
      // Only `{n}`, `{n,}` and `{n,m}` are quantifiers. Anything else (`{,3}`,
      // `{a}`) is literal text in a JS regex, so leave it for parseAtom.
      const m = /^\{(\d+)(?:(,)(\d*))?\}/.exec(this.src.slice(this.pos))
      if (m) {
        this.pos += m[0].length
        if (this.peek() === '?') this.pos++ // lazy — ignore
        const lo = Number(m[1])
        const hi = m[2] === undefined ? lo : m[3] ? Number(m[3]) : lo + 4
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
