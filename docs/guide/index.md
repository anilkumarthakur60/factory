# Introduction

`@anil-labs/factory` is two libraries in one package:

1. **A factory builder** — for assembling typed test fixtures, seed data, and demo records, with the same expressive chain Laravel users know from Eloquent's `Factory` class.
2. **A seedable faker** — for generating realistic random values across 15 facets (person, internet, location, finance, regex, …), with a pluggable locale registry.

Both are wired together so the factory you define has `faker` in its build context out of the box, but you can also import either piece on its own.

## Why one more factory library

The TypeScript ecosystem has individual answers — `@faker-js/faker` for random data, `fishery` for factories, `rosie` for builders, `casual` for older Faker-style fakes — but no single zero-dep package combines:

- Fluent immutable factory chains, with states, sequences, relations, hooks, and recycle pools.
- A deterministic, seedable faker with a faceted API (`faker.person.fullName()`, not `faker.name()` legacy soup).
- Locale support that doesn't ship megabytes of corpus for languages you don't use.
- First-class TypeScript types — generics that flow, no `as any` workarounds.
- Plug-and-play persistence adapters (memory, HTTP, console — or write your own).

`@anil-labs/factory` packages all of that into one library with **zero runtime dependencies**.

## Next

→ [Installation](/guide/installation)
→ [Quick Start](/guide/quick-start)
