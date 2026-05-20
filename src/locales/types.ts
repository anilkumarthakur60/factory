/**
 * Shape of a locale corpus. Add a locale by exporting a `LocaleData` from a
 * new module under `src/faker/locales/` and calling `registerLocale(name, data)`.
 */
export interface LocaleData {
  readonly buzzPhrases: readonly string[]

  readonly cities: readonly string[]
  // Color -------------------------------------------------------------------
  readonly colors: readonly string[]
  // Company -----------------------------------------------------------------
  readonly companies: readonly string[]
  readonly countries: readonly string[]
  readonly country: string
  readonly departments: readonly string[]

  // Internet ----------------------------------------------------------------
  readonly emailDomains: readonly string[]
  readonly fileExtensions: readonly string[]
  // Person ------------------------------------------------------------------
  readonly firstNames: readonly string[]
  readonly firstNamesFemale?: readonly string[]
  readonly firstNamesMale?: readonly string[]
  readonly jobTitles: readonly string[]

  readonly lastNames: readonly string[]
  // Lorem -------------------------------------------------------------------
  readonly loremWords: readonly string[]

  // System ------------------------------------------------------------------
  readonly mimeTypes: readonly string[]
  readonly prefixes: readonly string[]
  // Commerce ----------------------------------------------------------------
  readonly productNames: readonly string[]

  readonly states: readonly string[]
  // Location ----------------------------------------------------------------
  readonly streetNames: readonly string[]

  readonly streetSuffixes: readonly string[]

  readonly suffixes: readonly string[]

  readonly title: string
  readonly tlds: readonly string[]
}
