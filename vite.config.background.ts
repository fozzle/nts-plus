import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'
import { defineConfig } from 'vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    lib: {
        entry: [resolve(__dirname, 'src/background/background.ts')],
        name: 'NTS Plus Background Script',
        fileName: (format, entryName) => `${entryName}.js`,
        formats: ['es']
    },
    outDir: 'dist/background'
  }
})
