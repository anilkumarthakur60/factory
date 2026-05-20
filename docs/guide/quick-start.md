# Quick Start

```ts
import { defineFactory, faker, memoryPersist } from '@anil-labs/factory'

interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'editor' | 'viewer'
  active: boolean
}

// 1. Define a factory.
const UserFactory = defineFactory<User>(({ seq, faker }) => ({
  id: seq,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: 'viewer',
  active: true,
}))
  .state('admin', { role: 'admin' })
  .state('inactive', { active: false })

// 2. Build items in memory.
UserFactory.makeOne()
//   → { id: 1, name: 'Olivia Patel', email: 'olivia.patel41@…', role: 'viewer', active: true }

UserFactory.count(3).state('admin').make()
//   → [3 admin users, ids 1..3]

// 3. Persist via a pluggable adapter.
const store = memoryPersist<User>()
await UserFactory.persist(store).count(5).create()
store.all() // → 5 users with auto-assigned ids
```

## Determinism

Seed any factory or the global faker for reproducible output:

```ts
UserFactory.seed(42).count(3).make() // ← always the same 3 users
faker.seed(42)
faker.person.fullName() // ← always the same name
```

## Just the faker

```ts
import { faker } from '@anil-labs/factory/faker'

faker.internet.email() // 'alex.morgan88@example.com'
faker.finance.iban('NP') // 'NP47…'
faker.helpers.fromRegExp(/[A-Z]{3}-\d{4}/) // 'PWB-7401'
```

→ [Defining factories](/guide/defining-factories)
→ [States & sequences](/guide/states-sequences)
→ [Faker namespaces](/guide/faker-namespaces)
