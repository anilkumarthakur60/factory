# Factory

Everything from `@anil-labs/factory` related to building model fixtures.

## `defineFactory<T>(definition, persist?)`

Functional alias for `Factory.define<T>(...)`. Returns a `Factory<T>`.

```ts
const UserFactory = defineFactory<User>(({ seq, faker }) => ({
  id: seq,
  name: faker.person.fullName(),
}))
```

## `Factory<T>`

Immutable fluent builder. Every method returns a new factory; the original is never mutated.

| Method                                        | Returns         | Purpose                                       |
| --------------------------------------------- | --------------- | --------------------------------------------- |
| `.count(n)` / `.times(n)`                     | `Factory<T>`    | Set how many items will be built              |
| `.with(overrides)`                            | `Factory<T>`    | Merge inline overrides                        |
| `.state(name, value)`                         | `Factory<T>`    | Register a named state                        |
| `.state(name)`                                | `Factory<T>`    | Activate a registered state                   |
| `.state(sequence)`                            | `Factory<T>`    | Attach a sequence as a state                  |
| `.states(map)`                                | `Factory<T>`    | Bulk-register states                          |
| `.sequence(entries)` / `.fieldSequence(k, v)` | `Factory<T>`    | Attach a sequence of patches                  |
| `.has(child, key)`                            | `Factory<T>`    | One-to-many relation                          |
| `.for(parent, fk, resolver?)`                 | `Factory<T>`    | Foreign-key relation                          |
| `.hasAttached(child, key, pivot)`             | `Factory<T>`    | Many-to-many with pivot                       |
| `.recycle(models, key)`                       | `Factory<T>`    | Add to a recycle pool                         |
| `.afterMaking(fn)` / `.afterCreating(fn)`     | `Factory<T>`    | Register hooks                                |
| `.persist(fn)`                                | `Factory<T>`    | Set persistence callback for `.create()`      |
| `.seed(n)` / `.locale(name)`                  | `Factory<T>`    | Fork a private faker                          |
| `.makeOne()` / `.makeMany()`                  | `T` / `T[]`     | Terminal — build                              |
| `.make()` / `.raw()`                          | `T \| T[]`      | Terminal — single or array depending on count |
| `.collect()`                                  | `Collection<T>` | Terminal — wrap in a Collection               |
| `.create()` / `.createMany()`                 | `Promise<…>`    | Terminal — build + persist                    |

## `Sequence<T>`

Cycle through a list of attribute patches. Entries may be `Partial<T>` literals or `({ index, count }) => Partial<T>` closures.

## `Collection<T>`

Immutable iterable wrapper with Laravel-like helpers: `.where()`, `.pluck()`, `.first()`, `.last()`, `.count()`, `.sortBy()`, etc.

## `FactoryRegistry`

Name-based lookup for factories — useful when relations are wired by string key.

For complete signatures and JSDoc, see the published `.d.ts` files.
