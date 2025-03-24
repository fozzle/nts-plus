import {fileURLToPath} from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL('./popup/popup.html', import.meta.url))
      }
    },
    outDir: 'dist/popup'
  },
  base: '/popup'
})
