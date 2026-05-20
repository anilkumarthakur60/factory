# Locales

English (`en`) ships by default. Register additional locales as needed — the package doesn't bundle large corpora you wouldn't use.

## Register a locale

```ts
import { registerLocale, faker } from '@anil-labs/factory'
import type { LocaleData } from '@anil-labs/factory'

const ne: LocaleData = {
  title: 'Nepali',
  firstNames: ['Anil', 'Sita', 'Ram' /* … */],
  lastNames: ['Thakur', 'Sharma', 'Karki' /* … */],
  // … full LocaleData shape required
}

registerLocale('ne', ne)

faker.locale('ne')
faker.person.fullName() // → 'Anil Thakur'
```

The `LocaleData` interface enumerates every required corpus. Optional fields like `firstNamesFemale` / `firstNamesMale` enable gender-aware generation when present.

## Locale registry helpers

```ts
import { getLocale, listLocales } from '@anil-labs/factory'

listLocales() // → ['en', 'ne']
getLocale('en') // → LocaleData (raw)
```

## Per-factory locale

Lock one factory to a non-default locale without touching the global `faker`:

```ts
const NepaliUserFactory = UserFactory.locale('ne')
```

This forks a private `Faker` instance — the factory becomes deterministic-but-independent.

→ [Determinism & seeding](/guide/seeding)
