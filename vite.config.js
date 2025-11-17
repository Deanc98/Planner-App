import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Vite looks for index.html in the root (which is where we put it).
  // This tells Vite where to find static assets (like manifest.json and icons).
  publicDir: 'public', 
  
  build: {
    // The final built files go into the 'dist' folder.
    outDir: 'dist', 
  }
});
