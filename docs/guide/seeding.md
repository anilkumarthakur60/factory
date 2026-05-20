# Determinism & seeding

Every random draw flows through a single Mulberry32 PRNG. Reseed it, and downstream output is reproducible.

## Seed the global faker

```ts
import { faker } from '@anil-labs/factory'

faker.seed(42)
faker.person.fullName() // → 'Olivia Patel'
faker.seed(42)
faker.person.fullName() // → 'Olivia Patel' (same draw)
```

## Seed one factory

`.seed(n)` forks a private `Faker` for that factory — the global `faker` is untouched:

```ts
const A = UserFactory.seed(7)
const B = UserFactory.seed(7)

A.makeOne() // identical to B.makeOne()
faker.person.fullName() // independent of A / B
```

## Read the current seed

```ts
faker.currentSeed() // → number
faker.currentLocale() // → 'en'
```

## Fork for isolated streams

```ts
const main = faker
const sub = main.fork() // independent PRNG, same locale
```

`fork()` seeds the new faker from the current PRNG state — useful when you need a deterministic sub-stream without affecting the parent.

## When determinism matters

- Snapshot tests — `expect(snapshot(items)).toMatchSnapshot()` only works if `items` is stable across runs.
- Reproducing bug reports from production seed data.
- Demo data that must look identical across dev / staging / docs screenshots.

→ [API reference](/api/)
