import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path'; // Added path module

export default defineConfig({
  plugins: [react()],
  // 1. Tell Vite to use the 'public' folder for the entry point
  root: path.resolve(__dirname, 'public'),
  
  build: {
    // 2. The output must still go to the 'dist' folder in the project root
    outDir: path.resolve(__dirname, 'dist'),
    
    // 3. Define the main entry file relative to the new root (public)
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'public', 'index.html'),
      },
    },
  },
});
