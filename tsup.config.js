import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['cli/main.ts'],
  format: ['cjs'],
  platform: 'node',
  sourcemap: 'inline',
  external: [],
  bundle: true,
  // Enable this to see the bundle size
  // metafile: "./metafile.json"
})