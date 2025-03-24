import {fileURLToPath} from 'node:url'
import {dirname, resolve} from 'node:path'
import { defineConfig } from 'vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [],
  build: {
    lib: {
        entry: [resolve(__dirname, 'src/content_scripts/nts.ts'), resolve(__dirname, 'src/content_scripts/mixcloud.ts')],
        name: 'NTS content',
        fileName: (format, entryName) => `${entryName}.js`,
        formats: ['es']
    },
    outDir: 'dist/content_scripts'
  }
})
