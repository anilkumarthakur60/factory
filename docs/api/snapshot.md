# Snapshot

## `snapshot(value)`

Normalises a value (recursively) so test-runner snapshots are stable:

- `Date` → `{ __type: 'Date', value: '<ISO string>' }`
- Object keys sorted alphabetically
- Arrays mapped element-wise
- Primitives passed through

```ts
import { snapshot } from '@anil-labs/factory'

const items = UserFactory.seed(42).count(3).make()
expect(snapshot(items)).toMatchSnapshot()
```

The package doesn't write snapshot files itself — that's the test runner's job. `snapshot()` just makes the _input_ deterministic across:

- platforms (key order is not standardised across JS engines)
- timezones (Dates stringify to ISO-UTC)
- representations (no surprise `undefined` keys reordering serialised output)
