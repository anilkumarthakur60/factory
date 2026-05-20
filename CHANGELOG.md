# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — Initial release

### Factory

- Immutable fluent builder: `defineFactory<T>(definition)` → chainable `Factory<T>`.
- States: `.state(name, value)` to register, `.state(name)` to activate, `.state(sequence)` to attach a sequence as state.
- Sequences: standalone `Sequence<T>` class + `.sequence(entries)` + `.fieldSequence(field, values)` for per-field cycling.
- Relations: `.has(childFactory, key)` (one-to-many), `.for(parent, foreignKey, resolver?)` (foreign key), `.hasAttached(child, key, pivot)` (many-to-many with pivot).
- Recycle pool: `.recycle(models, key)` + `.getRecycled(key)`.
- Hooks: `.afterMaking(fn)`, `.afterCreating(fn)` (sync or async).
- Persistence: `.persist(fn)` + terminal `.create()` / `.createMany()`.
- Per-factory determinism: `.seed(n)` / `.locale(name)` fork into an isolated `Faker`.
- Terminal methods: `.makeOne()`, `.makeMany()`, `.make()`, `.raw()`, `.collect()`.

### Faker

- Seedable PRNG (Mulberry32, deterministic).
- Faceted namespaces: `person`, `internet`, `location`, `lorem`, `date`, `number`, `string`, `color`, `company`, `commerce`, `finance`, `image`, `system`, `datatype`, `helpers`.
- Regex-based string generation: `faker.helpers.fromRegExp(/[A-Z]{3}\d{4}/)`.
- Weighted picking, unique-collection, enum-value, shuffle, slug, nanoid, UUID, IBAN, Luhn-valid card numbers.
- Locale system with pluggable registry: `registerLocale`, `getLocale`, `listLocales`. English (`en`) ships by default.

### Persistence adapters

- `memoryPersist<T>()` — in-memory store with `all()` / `find(id)` / `reset()`.
- `httpPersist<T>(url, options?)` — fetch-shaped POST adapter with response unwrapping.
- `consolePersist<T>(label?)` — logging adapter for inspection.

### Builders

- `oneOf(items)`, `maybe(value, chance?)`, `array(item, count)`, `lazy(fn)`.

### Snapshot

- `snapshot(value)` — normalises Dates / key order so test runners (vitest, jest) can snapshot stably.

### Packaging

- ESM + CJS dual build via Vite + `vite-plugin-dts`.
- Subpath exports: `@anil-labs/factory`, `/faker`, `/persist`, `/locales/en`.
- `.d.ts` + `.d.cts` for strict `node16` / `nodenext` type resolution.
- Zero runtime dependencies. Node 20+.

[Unreleased]: https://github.com/anilkumarthakur60/factory/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/anilkumarthakur60/factory/releases/tag/v0.1.0
