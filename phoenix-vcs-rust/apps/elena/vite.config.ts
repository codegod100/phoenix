import {{ defineConfig }} from 'vite';

export default defineConfig({
  server: {
    host: '100.115.154.32',
    port: 5173,
    proxy: {
      '/api': 'http://100.115.154.32:3000'
    }
  },
  build: {
    outDir: 'dist'
  }
});
