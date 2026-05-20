# Persistence

A `Persist<T>` is just `(item: T) => T | Promise<T>`. Three implementations ship with the package; bring your own for anything custom.

## `memoryPersist<T>()`

In-memory persistence with a queryable store:

```ts
const store = memoryPersist<User>()
await UserFactory.persist(store).count(5).create()
store.all()
store.find(1)
store.reset()
```

Auto-assigns numeric ids when `item.id` is undefined; preserves any existing id.

## `httpPersist<T>(url, options?)`

```ts
type HttpPersistOptions = {
  fetch?: FetchLike
  headers?: Record<string, string>
  parse?: (json: unknown) => unknown // defaults to `json.data ?? json`
}
```

POSTs each item with `Content-Type: application/json`, awaits the response, and returns the parsed body.

## `consolePersist<T>(label?)`

Logs each item to `console.log` and returns it unchanged. Use when wiring up a factory and you want to inspect what `create()` would send.

## Writing your own

```ts
import type { Persist } from '@anil-labs/factory'

const dbPersist: Persist<User> = async (user) => {
  const row = await db.insert('users').values(user).returning('*')
  return row[0]
}

await UserFactory.persist(dbPersist).count(3).create()
```
