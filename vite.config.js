import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import { fileURLToPath, URL } from 'node:url';
import dts from 'vite-plugin-dts';
import packageJson from './package.json';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    plugins: [
      dts({
        insertTypesEntry: true,
        outputDir: 'dist/types',
      }),
    ],
    build: {
      minify: false,
      lib: {
        entry: resolve(__dirname, 'src/main.ts'),
        formats: ['es', 'cjs', 'umd'],
        name: 'ExpressBeans',
        fileName: (format) => `express-beans.${format}.js`,
      },
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'src/main.ts'),
        },
        output: {
          exports: 'named',
        },
        external: Object.keys(packageJson.dependencies),
      },
    },
    define: {
      __APP_ENV__: env.APP_ENV,
    },
  };
});
