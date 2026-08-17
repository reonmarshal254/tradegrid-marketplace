import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true, // Allow external connections
    allowedHosts: [
      'localhost',
      'tradegrid-marketplace.vercel.app',
      'tradegrid-marketplace.onrender.com',
    ],

    proxy: {
      '/api': {
        target: 'https://tradegrid-marketplace.onrender.com',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://tradegrid-marketplace.onrender.com',
        changeOrigin: true,
        ws: true, // Enable WebSocket proxying
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
