# Faker namespaces

15 facets, all using the shared seedable PRNG:

| Namespace  | Examples                                                                                                      |
| ---------- | ------------------------------------------------------------------------------------------------------------- |
| `person`   | `firstName('male')`, `lastName()`, `fullName({ withPrefix: true })`                                           |
| `internet` | `email()`, `userName()`, `url()`, `ipv4()`, `ipv6()`, `mac()`, `password(16)`                                 |
| `location` | `streetAddress()`, `city()`, `state()`, `country()`, `latitude()`                                             |
| `lorem`    | `word()`, `words(5)`, `sentence()`, `paragraph()`, `paragraphs(3)`                                            |
| `date`     | `past()`, `future()`, `recent(30)`, `between(a, b)`, `birthdate({…})`                                         |
| `number`   | `int({ min, max })`, `float({ … })`, `bigInt({ … })`, `between(1, 5)`                                         |
| `string`   | `uuid()`, `nanoid()`, `alphanumeric(8)`, `hexadecimal(16, { prefix: '0x' })`                                  |
| `color`    | `name()`, `hex()`, `rgb()`, `hsl()`                                                                           |
| `company`  | `name()`, `jobTitle()`, `buzzPhrase()`                                                                        |
| `commerce` | `productName()`, `price(1, 100)`, `department()`                                                              |
| `finance`  | `amount()`, `accountNumber()`, `creditCardNumber()`, `iban('GB')`, `bitcoinAddress()`                         |
| `image`    | `url(width, height)`, `avatar(name)`, `dataUri()`                                                             |
| `system`   | `fileName()`, `filePath()`, `mimeType()`, `semver()`                                                          |
| `datatype` | `boolean(chance?)`                                                                                            |
| `helpers`  | `arrayElement()`, `weightedArrayElement()`, `shuffle()`, `fromRegExp()`, `unique()`, `enumValue()`, `maybe()` |

## Regex-driven strings

```ts
faker.helpers.fromRegExp(/[A-Z]{3}-\d{4}/) // 'PWB-7401'
faker.helpers.fromRegExp(/(cat|dog|bird)/) // 'cat'
faker.helpers.fromRegExp(/\d{2}\.\d{2}\.\d{4}/) // '12.05.2026'
```

Supports `[]`, `[^…]`, `\d \D \w \W \s \S`, `*`, `+`, `?`, `{n}`, `{n,m}`, alternation, non-capturing groups.

→ [Locales](/guide/locales)
→ [Determinism & seeding](/guide/seeding)
