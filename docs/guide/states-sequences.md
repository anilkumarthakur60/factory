# States & sequences

## States

Named partial overrides you can activate by name. Registered once, used many times:

```ts
const UserFactory = defineFactory<User>(({ faker }) => ({
  id: 0,
  name: faker.person.fullName(),
  role: 'viewer',
  active: true,
}))
  .state('admin', { role: 'admin' })
  .state('inactive', { active: false })
  .state('verified', (item) => ({ verifiedAt: faker.date.past() }))

UserFactory.state('admin').make()
UserFactory.state('admin').state('verified').count(3).make()
```

States may be:

- **A `Partial<T>` object** — merged in.
- **A `(item, ctx) => Partial<T>` function** — receives the current item + build context.

Activation is additive — calling `.state('admin').state('inactive')` applies both, in order.

## Sequences

Cycle through a list of attribute patches across generated items:

```ts
UserFactory.sequence([{ role: 'admin' }, { role: 'editor' }, { role: 'viewer' }])
  .count(6)
  .make()
//   → roles: admin, editor, viewer, admin, editor, viewer
```

Closure entries receive `{ index, count }`:

```ts
UserFactory.sequence([({ index }) => ({ name: `User ${index}` })])
```

## Field sequences

Cycle a single field through a known set of values:

```ts
UserFactory.fieldSequence('role', ['admin', 'editor', 'viewer']).count(6).make()
```

Behaves like `sequence()` but targets one field, type-safe via `keyof T`.

→ [Relations](/guide/relations)
