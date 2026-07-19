# factory

Monorepo for **[`@anil-labs/factory`](packages/factory)** — Laravel-inspired model factories
plus a seedable, locale-aware faceted faker for TypeScript. **Zero runtime dependencies.**
ESM + CJS + a browser global. Browser, Node 20+, Bun, Deno.

[![npm version](https://img.shields.io/npm/v/@anil-labs/factory)](https://www.npmjs.com/package/@anil-labs/factory)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

```bash
npm i @anil-labs/factory
```

```ts
import { defineFactory, oneOf, faker } from '@anil-labs/factory'

const UserFactory = defineFactory<User>(({ seq, faker }) => ({
  id: seq,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: oneOf(['admin', 'editor', 'viewer']),
})).state('admin', { role: 'admin' })

UserFactory.count(5).make() // → User[]
UserFactory.seed(42).make() // → deterministic
```

Or with no bundler at all:

```html
<script src="https://unpkg.com/@anil-labs/factory"></script>
<script>
  const { defineFactory, oneOf } = FactoryJS
</script>
```

**Full documentation lives in [`packages/factory/README.md`](packages/factory/README.md)
and the [docs site](docs).**

## Repository layout

This repository is a pnpm workspace:

| Path                                         | What it is                                                  |
| -------------------------------------------- | ----------------------------------------------------------- |
| [`packages/factory`](packages/factory)       | The published library — source, Vitest suite, Vite build    |
| [`examples/playground`](examples/playground) | Node + TypeScript demo resolved through the built package   |
| [`examples/cdn`](examples/cdn)               | No-bundler demo of the browser global, with a CI smoke test |
| [`docs`](docs)                               | VitePress documentation site                                |

## Development

```bash
pnpm install       # bootstrap the workspace
pnpm build         # build the library (ESM + CJS + browser IIFE)
pnpm test          # run the test suite
pnpm test:coverage # with coverage thresholds enforced
pnpm typecheck     # strict TS across the workspace
pnpm lint          # eslint (type-aware on packages/*/src)
pnpm format        # prettier
pnpm verify        # typecheck + lint + format:check + test
pnpm docs:dev      # serve the docs site locally
```

Releases are managed with [Changesets](https://github.com/changesets/changesets):

```bash
pnpm changeset          # describe your change
pnpm version-packages   # apply version bumps + changelog
```

## License

[MIT](LICENSE)
