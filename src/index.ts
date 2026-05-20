/**
 * @anil-labs/factory — Laravel-inspired model factories + faceted seedable faker
 * for TypeScript. Zero runtime deps, ESM + CJS, framework-agnostic.
 *
 * @example
 * ```ts
 * import { defineFactory, faker, memoryPersist } from '@anil-labs/factory'
 *
 * interface User { id: number; name: string; email: string }
 *
 * const UserFactory = defineFactory<User>(({ seq, faker }) => ({
 *   id: seq,
 *   name: faker.person.fullName(),
 *   email: faker.internet.email(),
 * }))
 *
 * UserFactory.count(5).make()                       // → User[]
 * UserFactory.seed(42).make()                       // → deterministic
 * await UserFactory.persist(memoryPersist()).create()
 * ```
 */

// Core --------------------------------------------------------------------
export { Factory, defineFactory } from './core/factory'
export { Sequence, sequence } from './core/sequence'
export type { SequenceEntry, SequenceInfo } from './core/sequence'
export { Collection } from './core/collection'
export { FactoryRegistry } from './core/registry'
export type {
  BuildContext,
  Definition,
  Hook,
  HasAttachedRelation,
  HasRelation,
  Persist,
  StateFn,
  StateValue,
} from './core/types'

// Faker -------------------------------------------------------------------
export { Faker, faker } from './faker'
export type { FakerOptions } from './faker'
export {
  LocaleRef,
  registerLocale,
  getLocale,
  listLocales,
  en,
  generateFromRegex,
  Person,
  Internet,
  Location,
  Lorem,
  DateGen,
  NumberGen,
  StringGen,
  Color,
  Company,
  Commerce,
  Finance,
  Image,
  System,
  Datatype,
  Helpers,
} from './faker'
export type { LocaleData, WeightedItem, UniqueOptions } from './faker'

// PRNG --------------------------------------------------------------------
export { Mulberry32, createPrng } from './prng'
export type { Prng } from './prng'

// Builders ----------------------------------------------------------------
export { oneOf, maybe, array, lazy } from './builders'

// Persistence -------------------------------------------------------------
export { memoryPersist, httpPersist, consolePersist } from './persist'
export type { HttpPersistOptions } from './persist'

// Snapshot ----------------------------------------------------------------
export { snapshot } from './snapshot'
