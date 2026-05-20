# Hooks & persistence

## Hooks

Fire callbacks after each item is built or persisted:

```ts
UserFactory.afterMaking((user, index) => {
  user.slug = slugify(user.name)
}).afterCreating(async (user) => {
  await emailService.welcome(user)
})
```

- `afterMaking(fn)` — fires after every item built by `make()`, `makeOne()`, `makeMany()`, `collect()`, `create()`.
- `afterCreating(fn)` — fires after every item passes through the persistence adapter (only on `.create()` / `.createMany()`).
- Hooks may be sync or async. On the sync `.make()` path, async hooks are fire-and-forget — use `.create()` if you need sequencing.

## Persistence adapters

A `Persist<T>` is just `(item: T) => T | Promise<T>` — implement your own or use one of the three shipped adapters.

### `memoryPersist()`

In-memory store for unit tests:

```ts
import { memoryPersist } from '@anil-labs/factory'

const store = memoryPersist<User>()
await UserFactory.persist(store).count(5).create()

store.all() // → User[]
store.find(1) // → User | undefined
store.reset()
```

Auto-assigns numeric ids when `item.id` is undefined.

### `httpPersist(url, options?)`

POSTs each built item to an HTTP endpoint:

```ts
import { httpPersist } from '@anil-labs/factory'

const persist = httpPersist<User>('/api/users', {
  headers: { Authorization: 'Bearer …' },
  parse: (json) => json.data ?? json,
})

await UserFactory.persist(persist).count(3).create()
```

Works with `fetch`, `axios.request`, or any fetch-shaped callable.

### `consolePersist(label?)`

Logs each item to the console and returns it unchanged — useful when wiring up a factory before pointing it at a real backend:

```ts
import { consolePersist } from '@anil-labs/factory'
await UserFactory.persist(consolePersist('[user]')).count(3).create()
```

→ [Faker namespaces](/guide/faker-namespaces)
