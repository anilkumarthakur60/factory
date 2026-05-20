import { defineConfig } from 'vite'
import dts from 'vite-plugin-dts'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('.', import.meta.url))

export default defineConfig({
  build: {
    target: 'es2022',
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    minify: false,
    lib: {
      entry: resolve(root, 'src/index.ts'),
      formats: ['es', 'cjs'],
      fileName: (format) => (format === 'cjs' ? 'index.cjs' : 'index.mjs'),
    },
    rollupOptions: {
      // Zero runtime deps — only externalize Node built-ins so they aren't bundled.
      external: [/^node:/],
      output: {
        exports: 'named',
        preserveModules: false,
      },
    },
  },
  plugins: [
    dts({
      entryRoot: 'src',
      include: ['src/**/*.ts'],
      exclude: ['tests/**', '**/*.test.ts'],
      rollupTypes: true,
      insertTypesEntry: true,
      tsconfigPath: resolve(root, 'tsconfig.json'),
    }),
  ],
})
