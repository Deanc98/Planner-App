import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  root: '.', 
  build: {
    // Vite needs to know where the final files should go. 
    // We tell it to put them in the 'dist' folder, which Netlify then publishes.
    outDir: 'dist',
    // We tell it to look for the public assets in the public folder.
    publicDir: 'public', 
  },
});
