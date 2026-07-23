import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Vite configuration. The dev server proxies API calls to the FastAPI backend so
// the frontend and backend can run on separate ports without CORS friction in dev.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Mirror the "@/*" -> "src/*" path alias declared in tsconfig.app.json.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/health': { target: 'http://localhost:8000', changeOrigin: true },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
