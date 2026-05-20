export { Faker, faker } from './faker'
export type { FakerOptions } from './faker'

export { LocaleRef, registerLocale, getLocale, listLocales, en } from './locale'
export type { LocaleData } from '../locales/types'

export { generateFromRegex } from './regex'

// Namespace classes — exported so consumers can subclass / mock individual
// areas (e.g. swap `Internet` for a deterministic test double).
export { Person } from './person'
export { Internet } from './internet'
export { Location } from './location'
export { Lorem } from './lorem'
export { DateGen } from './date'
export { NumberGen } from './number'
export { StringGen } from './string'
export { Color } from './color'
export { Company } from './company'
export { Commerce } from './commerce'
export { Finance } from './finance'
export { Image } from './image'
export { System } from './system'
export { Datatype } from './datatype'
export { Helpers } from './helpers'

export type { WeightedItem, UniqueOptions } from './helpers'
