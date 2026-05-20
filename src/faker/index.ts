export { Faker, faker } from './faker'
export type { FakerOptions } from './faker'

export { LocaleRef, registerLocale, getLocale, listLocales, en } from './locale'
export type { LocaleData } from './locales/types'

export { generateFromRegex } from './regex'

// Namespace classes — exported so consumers can subclass / mock individual
// areas (e.g. swap `Internet` for a deterministic test double).
export { Person } from './modules/person'
export { Internet } from './modules/internet'
export { Location } from './modules/location'
export { Lorem } from './modules/lorem'
export { DateGen } from './modules/date'
export { NumberGen } from './modules/number'
export { StringGen } from './modules/string'
export { Color } from './modules/color'
export { Company } from './modules/company'
export { Commerce } from './modules/commerce'
export { Finance } from './modules/finance'
export { Image } from './modules/image'
export { System } from './modules/system'
export { Datatype } from './modules/datatype'
export { Helpers } from './modules/helpers'

export type { WeightedItem, UniqueOptions } from './modules/helpers'
