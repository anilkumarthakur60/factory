# Builders

Standalone composable builders for use inside factory definitions or anywhere you need randomized values.

## `oneOf(items)`

Pick a random element. Equivalent to `faker.helpers.arrayElement` but with a shorter, builder-style name.

```ts
import { oneOf } from '@anil-labs/factory'

const role = oneOf(['admin', 'editor', 'viewer'])
```

## `maybe(value, chance = 0.5)`

Return `value` with probability `chance`, otherwise `undefined`.

```ts
const verifiedAt = maybe(new Date(), 0.3) // 30% chance of a Date
```

## `array(item, count)`

Build an array of length `count` by calling `item` (function) or repeating its value.

```ts
const tags = array(() => oneOf(['a', 'b', 'c']), 5)
```

## `lazy(fn)`

Defer evaluation — useful when you want the function called per build, not at factory-definition time.

```ts
const now = lazy(() => new Date())
```
