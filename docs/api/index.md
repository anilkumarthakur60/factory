# API Reference

For complete signatures and inline JSDoc, the published `.d.ts` files are the source of truth. This section provides high-level orientation; the [README](https://github.com/anilkumarthakur60/factory#readme) has the most up-to-date detailed examples.

## Modules

- [Factory](/api/factory) — `Factory<T>` class, `defineFactory()`, `Sequence`, `Collection`, `FactoryRegistry`
- [Faker](/api/faker) — `Faker` class, `faker` singleton, locale registry
- [Builders](/api/builders) — `oneOf`, `maybe`, `array`, `lazy`
- [Persistence](/api/persistence) — `memoryPersist`, `httpPersist`, `consolePersist`
- [PRNG](/api/prng) — `Mulberry32`, `createPrng`, `Prng` interface
- [Snapshot](/api/snapshot) — `snapshot()`

## Entry points

| Import path                     | What you get                               |
| ------------------------------- | ------------------------------------------ |
| `@anil-labs/factory`            | Everything                                 |
| `@anil-labs/factory/faker`      | Faker + locale registry (no Factory class) |
| `@anil-labs/factory/persist`    | Persistence adapters                       |
| `@anil-labs/factory/locales/en` | English locale data                        |
