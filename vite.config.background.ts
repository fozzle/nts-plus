import {resolve} from 'node:path'
import { defineConfig } from 'vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    minify: false,
    lib: {
        entry: [resolve(__dirname, 'src/background/background.ts')],
        name: 'NTS Plus Background Script',
        fileName: (_format, entryName) => `${entryName}.js`,
        formats: ['es']
    },
    outDir: 'dist/background'
  }
})
