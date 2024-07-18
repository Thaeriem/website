import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist'
  },
  optimizeDeps: {
    include: ['simplex-noise']
  },
  server: {
    open: true
  }
});