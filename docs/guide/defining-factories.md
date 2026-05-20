# Defining factories

```ts
import { defineFactory } from '@anil-labs/factory'

interface Post {
  id: number
  title: string
  body: string
  publishedAt: Date | null
}

const PostFactory = defineFactory<Post>(({ seq, faker }) => ({
  id: seq,
  title: faker.lorem.sentence(6),
  body: faker.lorem.paragraphs(3),
  publishedAt: faker.date.past(),
}))
```

The build context `{ seq, faker }` is passed on every build call:

- `seq` — 1-indexed counter, incremented across `count(n)` builds.
- `faker` — the factory's bound `Faker` instance (private if you called `.seed()` / `.locale()`, shared global otherwise).

## Inline overrides

```ts
PostFactory.with({ publishedAt: null }).makeOne()
//   → a draft post (publishedAt forcibly null)
```

`with()` patches every built item; the override wins over the definition and any active states.

## Counts

```ts
PostFactory.count(3).make() // Post[] of length 3
PostFactory.times(3).makeMany() // same — alias matching Laravel's ->times()
PostFactory.count(1).make() // single Post (not an array)
PostFactory.makeMany() // always Post[], honours current count
PostFactory.makeOne() // always one Post, ignores count
```

## Raw vs make

`raw()` is identical to `make()` today — included for forward-compat parity with Laravel's API, where it returns plain attribute objects before model hydration.

→ [States & sequences](/guide/states-sequences)
