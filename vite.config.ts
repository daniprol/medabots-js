import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: { include: ['tests/**/*.test.ts'], environment: 'node' },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
});
