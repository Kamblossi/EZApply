import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  root: '.',
  build: {
    outDir: './dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: false, // Allow Vite to use alternative ports if 5173 is busy
    host: 'localhost',
    hmr: {
      port: 24678, // Use a specific port for HMR to avoid conflicts
      host: 'localhost',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
