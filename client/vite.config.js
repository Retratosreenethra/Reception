import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    define: {
      'process.env': {},
      // Conditionally set environment variables for different modes (development vs production)
      'process.env.API_URL': mode === 'development' 
        ? 'http://localhost:3000' 
        : 'https://api.production.com',
    },
    envDir: './',
  };
});
