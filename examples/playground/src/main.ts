/**
 * Node + TypeScript demo of @anil-labs/factory.
 *
 * This imports the package by its published name, so it exercises the real
 * `exports` map and the emitted `.d.ts` — if either regresses, `pnpm build`
 * in this example fails.
 *
 * Run it with:  pnpm --filter example-playground start
 */
import { defineFactory, oneOf, maybe, memoryPersist, faker, snapshot } from '@anil-labs/factory'

interface User {
  active: boolean
  // `maybe()` yields `T | undefined`, so the field is optional-valued.
  bio: string | undefined
  email: string
  id: number
  name: string
  role: 'admin' | 'editor' | 'viewer'
}

interface Post {
  id: number
  title: string
  userId: number
}

const userFactory = defineFactory<User>(({ seq, faker }) => ({
  id: seq,
  name: faker.person.fullName(),
  email: faker.internet.email(),
  role: oneOf(['admin', 'editor', 'viewer']),
  active: true,
  bio: maybe(faker.lorem.sentence(), 0.5),
}))
  .state('admin', { role: 'admin' })
  .state('inactive', { active: false })

const postFactory = defineFactory<Post>(({ seq, faker }) => ({
  id: seq,
  userId: 0,
  title: faker.lorem.words(3),
}))

// 1. A single object -------------------------------------------------------
console.log('one user:', userFactory.makeOne())

// 2. Many at once ----------------------------------------------------------
console.log('three users:', userFactory.count(3).makeMany().length)

// 3. States and per-call overrides -----------------------------------------
console.log('admin role:', userFactory.state('admin').makeOne().role)
console.log('pinned email:', userFactory.with({ email: 'pin@me.com' }).makeOne().email)

// 4. Deterministic output — same seed, same data ---------------------------
const a = userFactory.seed(42).makeOne()
const b = userFactory.seed(42).makeOne()
console.log('seeded runs match:', JSON.stringify(a) === JSON.stringify(b))

// 5. Sequences cycle values across generated items --------------------------
const roles = userFactory
  .fieldSequence('role', ['admin', 'editor'])
  .count(4)
  .makeMany()
  .map((u) => u.role)
console.log('field sequence:', roles)

// 6. Relations -------------------------------------------------------------
const withPosts = userFactory.has(postFactory.count(2), 'posts').makeOne()
console.log('user has posts:', Array.isArray((withPosts as User & { posts: Post[] }).posts))

const post = postFactory.for(userFactory, 'userId').makeOne()
console.log('post belongs to user:', post.userId)

// 7. Collection helpers ----------------------------------------------------
console.log('collected count:', userFactory.count(5).collect().count())

// 8. Persistence -----------------------------------------------------------
const store = memoryPersist<User>()
const created = await userFactory.persist(store).count(3).createMany()
console.log('persisted:', created.length)

// 9. Standalone faker + snapshot ------------------------------------------
console.log('faker sample:', faker.person.firstName(), faker.internet.userName())
console.log('snapshot:', typeof snapshot(userFactory.seed(1).makeOne()))
