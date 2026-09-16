import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    proxy: {
      '/odata': 'http://localhost:4004',
      '/parse-resume': 'http://localhost:4004',
    },
  },
});
