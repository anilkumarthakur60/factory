---
"@anil-labs/factory": minor
---

Restructure as a monorepo, add a CDN build, and fix 18 audited bugs — including several that broke the library's core reproducibility guarantee.

**New**

- Ships a browser global build alongside ESM and CJS. `dist/index.global.js` exposes a `FactoryJS` global and the `unpkg`/`jsdelivr` fields are set, so the library now works from a plain `<script>` tag with no bundler.
- `Faker` accepts a new `refDate` option (`Date | number`) with a chainable `faker.refDate(d)` setter and `faker.currentRefDate()` reader, pinning the anchor used by the relative `date.*` helpers. `DateGen` also takes an optional injectable clock.

**Fixed — reproducibility**

These all shared one root cause: mutable state shared through the fluent chain, where the API promises that "every method returns a new factory, never mutating the original".

- **`seed()` was effectively one-shot.** The private `Faker` was shared by reference across every clone and never re-applied, so calling a terminal method twice on a seeded factory returned different data, sibling clones drew from the same stream, and output depended on the order siblings were built. A seeded factory now reproduces on every terminal call and across clones. Unseeded factories remain random.
- **The builder helpers ignored the seed.** `oneOf()`, `maybe()`, and `array()` read the shared default faker instead of the factory's, so `seed()` never made them reproducible — despite `oneOf` appearing in the README's first example.
- **`locale()` mutated the faker in place**, retro-actively changing the factory it was called on and its sibling clones. It now forks.
- **`seed()` silently discarded a locale** set earlier in the chain. `.locale(l).seed(n)` and `.seed(n).locale(l)` are now equivalent.
- **Sequences shared a cursor** between a factory and factories derived from it, and a build advanced the cursor on its own receiver.
- **`faker.date.*` anchored on `Date.now()`**, so seeded date fields never reproduced across runs. Pin `refDate` for reproducible dates.

**Fixed — correctness**

- `generateFromRegex`: `\S` no longer emits a space (it previously produced strings that failed their own input pattern), and unsupported `(?…)` forms (lookahead, named groups) no longer cause the parser to discard everything up to the next colon. `(?:…)` is unaffected.
- `Prng.float` (and `number.float`, `commerce.price`, `finance.amount`, `location.latitude`/`longitude`) now honours its documented `[min, max)` range — it could previously return exactly `max` — and clamps up to `min` when `min` is off the decimal grid.
- `helpers.shuffle` no longer pins `undefined` elements to their original index.
- `httpPersist` resolves `globalThis.fetch` at call time, so test mocks and polyfills installed after import are honoured (previously they were bypassed, causing real network calls in tests). It also reports invalid JSON with the URL and status instead of a bare `SyntaxError`, and its default parse follows the documented `json.data ?? json`.
- `memoryPersist`'s auto-increment counter advances past ids the definition already set, so auto-assigned ids no longer collide.
- `snapshot()` no longer dies with a `RangeError` on cyclic or back-referencing data (emitted as `{ __type: 'Circular' }`), and represents `Map`/`Set` faithfully instead of collapsing both to `{}` — which previously made snapshots of different data compare equal.
- `lazy()` was exported and documented but never resolved, landing in built items as the wrapper object. It now resolves during the build, keyed off a branded symbol so real data with a `resolve` field is left alone.
- `fieldSequence(field, [])` throws at chain time instead of silently setting the field to `undefined`.

**Fixed — types**

- **Every entry point silently resolved to `any` under `moduleResolution: "node16"`/`"nodenext"`.** The emitted declarations used extensionless relative imports, which that mode rejects. All four subpaths (`.`, `./faker`, `./persist`, `./locales/en`) now provide real types in both ESM and CJS.
- `has()` and `hasAttached()` widen the factory type with the relation key, so reading a relation no longer needs a cast.

**Upgrade notes**

Seeded output is not byte-identical to `0.1.0`. Reusing a seeded factory now returns the *same* data on each call rather than fresh data; `float` values may shift by one quantum; `\S` patterns and shuffles of arrays containing `undefined` change; and snapshots containing `Map`/`Set` need regenerating. If you were relying on a reused seeded factory to keep producing new data, create a fresh factory per call or drop the seed.
