# @anil-labs/factory

Laravel-inspired model factories + a seedable, locale-aware faceted faker for TypeScript. **Zero runtime dependencies.** ESM + CJS + a browser global. Browser, Node 20+, Bun, Deno.

```bash
npm i @anil-labs/factory
```

**TypeScript 4.9 through 7.x** are supported. The shipped declarations are verified
against 4.9, 5.0, 5.2, 5.4, 5.9, 6.0 and 7.0 under both `moduleResolution: "bundler"`
and `"node16"`, for ESM and CJS consumers alike. TypeScript is optional — plain
JavaScript works just as well.

```ts
import { defineFactory, oneOf, faker } from '@anil-labs/factory'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  active: boolean
}

const UserFactory = defineFactory<User>(({ seq, faker }) => ({
  id: seq,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: oneOf(['admin', 'editor', 'viewer']),
  active: true,
}))
  .state('admin', { role: 'admin' })
  .state('inactive', { active: false })

UserFactory.make() // → User
UserFactory.count(5).make() // → User[]
UserFactory.state('admin').make() // → User with role: 'admin'
UserFactory.seed(42).make() // → deterministic User
```

---

## Why one more factory library

Most JS data-generation libraries pick one job and stop:

- **`@faker-js/faker`** gives you faker, no model factories.
- **`fishery`**, **`rosie`** give you factories, no faker.
- **ORM-specific seeders** are tied to one DB layer.

`@anil-labs/factory` combines **Laravel-quality model factories** with a **seedable, locale-aware faker**, in one zero-dep package with first-class TypeScript types and pluggable persistence adapters. It's the package I wanted to find when I went looking.

---

## Quick tour

```ts
import {
  defineFactory,
  faker,
  oneOf,
  maybe,
  array,
  memoryPersist,
  httpPersist,
  sequence,
  Collection,
  FactoryRegistry,
} from '@anil-labs/factory'

// 1. A faker with namespaces
faker.seed(123)
faker.person.fullName() // "Olivia Patel"
faker.internet.email()
faker.location.streetAddress()
faker.string.uuid()
faker.lorem.paragraph()
faker.number.int({ min: 1, max: 100 })
faker.color.hex()
faker.finance.creditCardNumber() // Luhn-valid
faker.helpers.fromRegExp(/[A-Z]{3}-\d{4}/)
faker.helpers.weightedArrayElement([
  { value: 'rare', weight: 1 },
  { value: 'common', weight: 9 },
])

// 2. A factory
interface User {
  id: number
  name: string
  email: string
  active: boolean
}

const UserFactory = defineFactory<User>(({ seq, faker }) => ({
  id: seq,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  active: true,
}))

// 3. Build (sync) — Laravel parity
UserFactory.make() // single
UserFactory.count(10).make() // array
UserFactory.with({ active: false }).make() // overrides
UserFactory.state('inactive').make() // named states
UserFactory.fieldSequence('active', [true, false]).count(4).make()
UserFactory.sequence([{ active: true }, { active: false }])
  .count(4)
  .make()

// 4. Persist (async) — works with any backend
const memory = memoryPersist<User>()
await UserFactory.persist(memory).count(3).create()
memory.all() // [User, User, User]

await UserFactory.persist(httpPersist<User>('/api/users')).create()

// 5. Relationships
interface Post {
  id: number
  title: string
  userId: number
}
const PostFactory = defineFactory<Post>(({ seq, faker }) => ({
  id: seq,
  title: faker.lorem.sentence(4),
  userId: 0,
}))

UserFactory.has(PostFactory.count(3), 'posts').make() // attach children
PostFactory.for(UserFactory, 'userId').make() // set foreign key

interface Role {
  id: number
  name: string
}
const RoleFactory = defineFactory<Role>(({ seq }) => ({ id: seq, name: `Role ${seq}` }))
UserFactory.hasAttached(RoleFactory.count(2), 'roles', { active: true })

// 6. Collection helpers (Laravel-style)
const users = UserFactory.count(20).collect()
users.where((u) => u.active).count()
users.pluck('email').toArray()

// 7. Registry — look up by name
FactoryRegistry.register('User', UserFactory)
FactoryRegistry.resolve<User>('User').count(5).make()
```

---

## API

### `defineFactory<T>(definition, persist?)`

Create a new factory. `definition` receives a build context `{ seq, faker }` and returns the base attributes for one item.

```ts
const f = defineFactory<User>(({ seq, faker }) => ({
  id: seq,
  name: faker.person.fullName(),
}))
```

You can also use the static form: `Factory.define<T>(definition, persist?)`.

### Building methods

| Method                                    | Returns      | Notes                                                                                   |
| ----------------------------------------- | ------------ | --------------------------------------------------------------------------------------- |
| `.count(n)`                               | `Factory<T>` | Set how many items to build. Alias: `.times(n)`.                                        |
| `.with(overrides)`                        | `Factory<T>` | Merge overrides into every built item.                                                  |
| `.state(name, value)`                     | `Factory<T>` | Register a named state — `value` may be a partial OR `(item, ctx) => partial`.          |
| `.state(name)`                            | `Factory<T>` | Activate a registered state.                                                            |
| `.state(sequenceInstance)`                | `Factory<T>` | Attach a sequence as state.                                                             |
| `.states({ a: …, b: … })`                 | `Factory<T>` | Bulk-register states.                                                                   |
| `.sequence([…])`                          | `Factory<T>` | Cycle attribute patches across items.                                                   |
| `.fieldSequence(key, [v1, v2])`           | `Factory<T>` | Cycle one field's values.                                                               |
| `.has(childFactory, key)`                 | `Factory<T>` | Attach `count` child records under `key`.                                               |
| `.for(parent, foreignKey, resolver?)`     | `Factory<T>` | Set the foreign-key on each child from a parent (factory, instance, or `() => parent`). |
| `.hasAttached(childFactory, key, pivot)`  | `Factory<T>` | Many-to-many; `pivot` may be an object or `(parent, child) => object`.                  |
| `.recycle(model, key)`                    | `Factory<T>` | Add reusable model instances; `.getRecycled(key)` returns one.                          |
| `.afterMaking(fn)` / `.afterCreating(fn)` | `Factory<T>` | Lifecycle hooks; async hooks awaited only by `create()`.                                |
| `.persist(fn)`                            | `Factory<T>` | Register the persistence callback for `create()`.                                       |
| `.seed(n)`                                | `Factory<T>` | Bind to a private deterministic Faker.                                                  |
| `.locale(name)`                           | `Factory<T>` | Bind to a private Faker on the named locale.                                            |

### Terminal methods

| Method          | Returns             | Notes                                       |
| --------------- | ------------------- | ------------------------------------------- |
| `.makeOne()`    | `T`                 | Single item regardless of `count`.          |
| `.makeMany()`   | `T[]`               | Array of `count` items.                     |
| `.make()`       | `T \| T[]`          | Single when `count === 1`, array otherwise. |
| `.raw()`        | `T \| T[]`          | Same shape as `make()`.                     |
| `.collect()`    | `Collection<T>`     | Always a `Collection`.                      |
| `.create()`     | `Promise<T \| T[]>` | Persists via `.persist(fn)`.                |
| `.createMany()` | `Promise<T[]>`      | Always an array; persistence required.      |

### `Sequence` / `sequence([...])`

Cycle attribute patches across items. Entries may be literal patches or `({ index, count }) => patch` closures.

```ts
const seq = sequence<{ name: string }>([
  ({ index }) => ({ name: `User ${index}` }),
  { name: 'Pinned' },
])
factory.state(seq).count(4).make() // → User 0, Pinned, User 2, Pinned
```

### `Collection<T>`

Immutable iterable wrapper. Methods: `count`, `isEmpty`, `each`, `map`, `pluck`, `where`, `first`, `last`, `sortBy`, `groupBy`, `reduce`, `toArray`, `[Symbol.iterator]`. The underlying `items` array is `Object.freeze`d.

### `FactoryRegistry`

Process-global lookup table.

```ts
FactoryRegistry.register('User', UserFactory)
FactoryRegistry.has('User') // true
FactoryRegistry.resolve<User>('User') // → Factory<User>
FactoryRegistry.names() // ['User']
FactoryRegistry.unregister('User')
FactoryRegistry.clear()
```

### `Faker` (the data generator)

```ts
import { Faker, faker } from '@anil-labs/factory'

const f = new Faker({ seed: 7, locale: 'en' })
f.seed(7)
f.locale('en')
f.currentSeed()
f.currentLocale()
f.fork() // independent Faker with derived seed
```

Namespaces (all read from the shared PRNG + locale):

| Namespace  | Examples                                                                                                                                                                          |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `person`   | `firstName({sex})`, `lastName`, `fullName({withPrefix})`, `prefix`, `suffix`, `sex`                                                                                               |
| `internet` | `email({firstName, lastName})`, `userName`, `url`, `domainName`, `ipv4`, `ipv6`, `mac`, `password(length)`                                                                        |
| `location` | `streetAddress`, `city`, `state`, `zipCode`, `country`, `countryName`, `fullAddress`, `latitude`, `longitude`                                                                     |
| `lorem`    | `word`, `words(n)`, `sentence(n?)`, `paragraph(n?)`, `paragraphs(n)`, `text`                                                                                                      |
| `date`     | `past(days)`, `recent(days)`, `future(days)`, `soon(days)`, `between(a, b)`, `iso(days)`, `birthdate({min, max})`                                                                 |
| `number`   | `int({min, max})`, `float({min, max, decimals})`, `bigInt({min, max})`, `between(a, b)`                                                                                           |
| `string`   | `uuid`, `nanoid(length)`, `alpha`, `numeric`, `alphanumeric`, `hexadecimal(length, {prefix})`, `sample`, `slug(words)`                                                            |
| `color`    | `name`, `hex`, `rgb`, `hsl`                                                                                                                                                       |
| `company`  | `name`, `jobTitle`, `buzzPhrase`                                                                                                                                                  |
| `commerce` | `productName`, `department`, `price(min, max, dec)`, `productDescription`                                                                                                         |
| `finance`  | `amount(min, max, dec, symbol)`, `accountNumber(digits)`, `creditCardNumber` (Luhn-valid), `currencyCode`, `iban(cc, len)`, `bitcoinAddress`                                      |
| `image`    | `url(w, h)`, `avatar(name)`, `dataUri(w, h)`                                                                                                                                      |
| `system`   | `fileName({withExt})`, `commonFileExt`, `fileExt`, `mimeType`, `directoryPath`, `filePath`, `semver`                                                                              |
| `datatype` | `boolean(chance)`                                                                                                                                                                 |
| `helpers`  | `arrayElement`, `arrayElements(arr, count)`, `shuffle`, `weightedArrayElement`, `multiple(n, fn)`, `repeat`, `fromRegExp`, `unique(fn, n, opts)`, `enumValue`, `maybe(v, chance)` |

### Locales

The package ships with an English (`en`) corpus. Register your own:

```ts
import { registerLocale, faker } from '@anil-labs/factory'

registerLocale('np', {
  title: 'नेपाली',
  firstNames: ['Aakash', 'Bina', 'Chetana', 'Dipesh'],
  lastNames: ['Adhikari', 'Bhandari', 'Chhetri', 'Dhakal'],
  // ...etc — see the `LocaleData` interface
})
faker.locale('np')
faker.person.fullName() // "Dipesh Bhandari"
```

### Builder helpers

```ts
import { oneOf, maybe, array, lazy } from '@anil-labs/factory'

defineFactory<Profile>(({ faker }) => ({
  role: oneOf(['admin', 'editor', 'viewer']),
  bio: maybe(faker.lorem.paragraph(), 0.7),
  tags: array(2, 5, () => faker.lorem.word()),
}))
```

### Persistence adapters

```ts
import { memoryPersist, httpPersist, consolePersist } from '@anil-labs/factory'

const store = memoryPersist<User>()
UserFactory.persist(store).create()

UserFactory.persist(
  httpPersist<User>('/api/users', {
    headers: {/* … */},
  }),
)

UserFactory.persist(consolePersist<User>()).create() // just logs each item
```

Write your own:

```ts
const drizzlePersist =
  (db): Persist<User> =>
  async (user) => {
    const [row] = await db.insert(users).values(user).returning()
    return row
  }
```

### Snapshot helper

Normalises `Date` instances and sorts object keys so snapshots are stable across machines.

```ts
import { snapshot } from '@anil-labs/factory'

expect(snapshot(UserFactory.seed(42).count(3).make())).toMatchSnapshot()
```

---

## Reproducibility

```ts
faker.seed(2026)
const a = faker.person.fullName()
faker.seed(2026)
const b = faker.person.fullName()
// a === b
```

Factory-scoped seeds don't pollute the default singleton:

```ts
defineFactory(...).seed(7)   // private Faker; the global `faker` is untouched
```

---

## Laravel parity

| Laravel Eloquent Factory                                       | `@anil-labs/factory`                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------- |
| `Factory::new()`                                               | `defineFactory(...)` / `Factory.define(...)`                    |
| `->count(5)`                                                   | `.count(5)`                                                     |
| `->state(['admin' => true])`                                   | `.with({ admin: true })`                                        |
| `->state('admin')` (named)                                     | `.state('admin', { … })` + `.state('admin')`                    |
| `->sequence(['a' => 1], ['a' => 2])`                           | `.sequence([{ a: 1 }, { a: 2 }])`                               |
| `->has(Post::factory()->count(3))`                             | `.has(PostFactory.count(3), 'posts')`                           |
| `->for(User::factory())`                                       | `.for(UserFactory, 'userId')`                                   |
| `->hasAttached(Role::factory()->count(2), ['active' => true])` | `.hasAttached(RoleFactory.count(2), 'roles', { active: true })` |
| `->recycle($airline)`                                          | `.recycle(airline, 'Airline')`                                  |
| `->afterMaking(fn ($u) => ...)`                                | `.afterMaking(u => ...)`                                        |
| `->afterCreating(fn ($u) => ...)`                              | `.afterCreating(u => ...)`                                      |
| `Factory::configure()`                                         | chain methods on the factory directly                           |
| `->make()`                                                     | `.make()`                                                       |
| `->create()`                                                   | `.persist(fn).create()`                                         |
| `->raw()`                                                      | `.raw()`                                                        |

---

## License

MIT.
