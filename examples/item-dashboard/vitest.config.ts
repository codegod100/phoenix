import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      'bun:sqlite': path.resolve(__dirname, './src/db-mock.ts'),
    },
  },
  test: {
    include: ['src/**/__tests__/**/*.test.ts'],
    deps: {
      inline: [/bun:sqlite/],
    },
  },
});
