import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    
    // Add custom environment variables handling
    define: {
      'process.env': {},
    },

    // Point to the correct environment variables directory
    envDir: './',

    // Configure path aliases (useful for simplifying imports)
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'), // Alias '@' to 'src' folder
        '@components': path.resolve(__dirname, 'src/components'),
        '@assets': path.resolve(__dirname, 'src/assets'),
      },
    },

    // Base URL for your app (useful when deploying to subdirectories or custom domains)
    base: mode === 'production' ? '/my-app/' : '/',
    
    // Enable source maps for development (optional)
    build: {
      sourcemap: mode === 'development',  // Enable sourcemaps in dev mode only
    },

    // Optimize the build process
    optimizeDeps: {
      include: ['react', 'react-dom'], // Optimize specific dependencies (e.g., React)
    },
  };
});
