# Installation

## Requirements

- **Node 20 or newer** (the package's dev toolchain — Vite 8 / vitest 4 — requires it; the published library itself uses only standard ES2022).
- TypeScript **5.0+** recommended for the best type-inference experience.

Works in **Node, browsers, Bun, and Deno**. ESM + CJS dual build.

## Install

::: code-group

```bash [npm]
npm install --save-dev @anil-labs/factory
```

```bash [pnpm]
pnpm add -D @anil-labs/factory
```

```bash [yarn]
yarn add -D @anil-labs/factory
```

```bash [bun]
bun add -d @anil-labs/factory
```

:::

## Subpath imports

The package ships four entry points so you can pull in only what you need:

| Import                          | Contents                                          |
| ------------------------------- | ------------------------------------------------- |
| `@anil-labs/factory`            | Everything (factory, faker, builders, persist, …) |
| `@anil-labs/factory/faker`      | Faker only — no `Factory` class                   |
| `@anil-labs/factory/persist`    | Persistence adapters (`memoryPersist`, etc.)      |
| `@anil-labs/factory/locales/en` | English locale data                               |

Each subpath is its own bundle with shared chunks split out automatically.
