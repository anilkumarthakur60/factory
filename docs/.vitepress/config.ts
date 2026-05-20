import { defineConfig } from 'vitepress'

export default defineConfig({
  title: '@anil-labs/factory',
  description:
    'Laravel-inspired model factory + faceted faker for TypeScript. Seedable, locale-aware, framework-agnostic, zero runtime deps.',
  lang: 'en-US',
  base: '/factory/',
  cleanUrls: true,

  head: [
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:title', content: '@anil-labs/factory' }],
    [
      'meta',
      {
        property: 'og:description',
        content:
          'Laravel-inspired model factory + faceted faker for TypeScript. Zero runtime deps.',
      },
    ],
    [
      'meta',
      {
        name: 'keywords',
        content:
          'factory, faker, test data, laravel, eloquent, seeder, mock, typescript, fixtures, seedable, locale',
      },
    ],
  ],

  themeConfig: {
    siteTitle: '@anil-labs/factory',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
      {
        text: 'Links',
        items: [
          { text: 'npm', link: 'https://www.npmjs.com/package/@anil-labs/factory' },
          { text: 'GitHub', link: 'https://github.com/anilkumarthakur60/factory' },
          { text: 'Changelog', link: 'https://github.com/anilkumarthakur60/factory/releases' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: 'Getting Started',
          collapsed: false,
          items: [
            { text: 'Introduction', link: '/guide/' },
            { text: 'Installation', link: '/guide/installation' },
            { text: 'Quick Start', link: '/guide/quick-start' },
          ],
        },
        {
          text: 'Factory',
          collapsed: false,
          items: [
            { text: 'Defining factories', link: '/guide/defining-factories' },
            { text: 'States & sequences', link: '/guide/states-sequences' },
            { text: 'Relations', link: '/guide/relations' },
            { text: 'Hooks & persistence', link: '/guide/persistence' },
          ],
        },
        {
          text: 'Faker',
          collapsed: false,
          items: [
            { text: 'Namespaces', link: '/guide/faker-namespaces' },
            { text: 'Locales', link: '/guide/locales' },
            { text: 'Determinism & seeding', link: '/guide/seeding' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API Reference',
          collapsed: false,
          items: [
            { text: 'Overview', link: '/api/' },
            { text: 'Factory', link: '/api/factory' },
            { text: 'Faker', link: '/api/faker' },
            { text: 'Builders', link: '/api/builders' },
            { text: 'Persistence', link: '/api/persistence' },
            { text: 'PRNG', link: '/api/prng' },
            { text: 'Snapshot', link: '/api/snapshot' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/anilkumarthakur60/factory' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/@anil-labs/factory' },
    ],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026-present Anil Kumar Thakur',
    },

    search: {
      provider: 'local',
    },

    editLink: {
      pattern: 'https://github.com/anilkumarthakur60/factory/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    outline: {
      level: [2, 3],
    },

    lastUpdated: {
      text: 'Last updated',
    },
  },
})
