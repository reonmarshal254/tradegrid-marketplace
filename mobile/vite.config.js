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
      'philologic-debi-unsophisticatedly.ngrok-free.dev',
    ],

    proxy: {
      '/api': {
        target: 'https://philologic-debi-unsophisticatedly.ngrok-free.dev',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'https://philologic-debi-unsophisticatedly.ngrok-free.dev',
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
