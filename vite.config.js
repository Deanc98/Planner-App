import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Tells Vite where to find static assets (like manifest.json and icons).
  publicDir: 'public', 
  
  build: {
    // Tells Netlify the built files go into the 'dist' folder.
    outDir: 'dist', 
  }
});
