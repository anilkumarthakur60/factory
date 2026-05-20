# Faker

## `faker` (default singleton)

```ts
import { faker } from '@anil-labs/factory'
faker.person.fullName()
```

Lives in the global module state — `faker.seed(n)` and `faker.locale(name)` mutate it in place. Use `new Faker(...)` for an isolated instance.

## `Faker` class

```ts
new Faker({ seed?: number, locale?: string })
```

| Member             | Type                                |
| ------------------ | ----------------------------------- |
| `person`           | `Person`                            |
| `internet`         | `Internet`                          |
| `location`         | `Location`                          |
| `lorem`            | `Lorem`                             |
| `date`             | `DateGen`                           |
| `number`           | `NumberGen`                         |
| `string`           | `StringGen`                         |
| `color`            | `Color`                             |
| `company`          | `Company`                           |
| `commerce`         | `Commerce`                          |
| `finance`          | `Finance`                           |
| `image`            | `Image`                             |
| `system`           | `System`                            |
| `datatype`         | `Datatype`                          |
| `helpers`          | `Helpers`                           |
| `.seed(n)`         | `this` — reseed PRNG                |
| `.locale(name)`    | `this` — swap active locale         |
| `.currentSeed()`   | `number`                            |
| `.currentLocale()` | `string`                            |
| `.fork()`          | `Faker` — independent reseeded copy |
| `.rawPrng()`       | `Prng` — underlying generator       |

## Locale registry

```ts
import { registerLocale, getLocale, listLocales, en } from '@anil-labs/factory'
import type { LocaleData } from '@anil-labs/factory'
```

See [Locales](/guide/locales) for the corpus shape and registration flow.
