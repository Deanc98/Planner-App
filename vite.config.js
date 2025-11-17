import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Tells Vite that manifest.json and icons are in the public folder
  publicDir: 'public', 
  
  build: {
    // Tells Netlify the built files go into the 'dist' folder
    outDir: 'dist', 
  }
});
