import { resolve } from 'node:path';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
    plugins: [],
    build: {
        minify: false,
        lib: {
            entry: [
                resolve(__dirname, 'src/content_scripts/nts.ts'),
                resolve(__dirname, 'src/content_scripts/mixcloud.ts'),
            ],
            name: 'NTS Plus Content Scripts',
            fileName: (_format, entryName) => `${entryName}.js`,
            formats: ['es'],
        },
        outDir: 'dist/content_scripts',
    },
});
