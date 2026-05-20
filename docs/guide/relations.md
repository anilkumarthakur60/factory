# Relations

Three Laravel-style helpers cover one-to-many, foreign-key, and many-to-many.

## `has()` — one-to-many

Attach child records under a key:

```ts
const PostFactory = defineFactory<Post>(({ seq }) => ({ id: seq, title: '…' }))
const UserFactory = defineFactory<User>(({ seq }) => ({ id: seq, name: '…' }))

UserFactory.has(PostFactory.count(3), 'posts').makeOne()
//   → { id: 1, name: '…', posts: [Post, Post, Post] }
```

The child factory's `count()` is honoured — pass `.count(n)` before `.has()` to control how many are attached per parent.

## `for()` — foreign key

Resolve a parent and copy its `id` (or run a custom resolver):

```ts
PostFactory.for(UserFactory, 'authorId').makeOne()
//   → { id: 1, title: '…', authorId: <built-user.id> }

// or with a custom resolver
PostFactory.for(UserFactory, 'authorId', (user) => ({ authorId: user.id, authorName: user.name }))
```

`parent` may be:

- A `Factory<P>` — built once eagerly via `makeOne()`.
- A plain `P` object — used directly.
- A `() => P` thunk — invoked once per build for lazy resolution.

## `hasAttached()` — many-to-many with pivot

Attach related records with pivot/intermediate data:

```ts
UserFactory.hasAttached(RoleFactory.count(2), 'roles', { active: true }).makeOne()
//   → { id: 1, roles: [
//         { id: 1, name: '…', pivot: { active: true } },
//         { id: 2, name: '…', pivot: { active: true } },
//       ] }
```

Pivot may be a static object or a `(parent, child) => Record<string, unknown>` function for per-pair data.

→ [Hooks & persistence](/guide/persistence)
