import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    allowedHosts: ['ubuntu-16gb-hel1-1.tailfe3ae2.ts.net'],
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
});
