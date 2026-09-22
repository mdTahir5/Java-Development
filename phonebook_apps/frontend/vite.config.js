import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Local API target for `npm run dev` only. Override it when you want the dev
// server to talk to the deployed API, e.g.:
//   PowerShell: $env:API_PROXY_TARGET="https://phonebook-backend.onrender.com"; npm run dev
const apiProxyTarget = process.env.API_PROXY_TARGET || 'http://localhost:8080';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: apiProxyTarget,
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});

