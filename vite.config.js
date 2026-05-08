import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173
  },
  build: {
    // Keep KaTeX fonts as emitted files so CSS font URLs stay inspectable and cacheable.
    assetsInlineLimit: 0
  }
});
