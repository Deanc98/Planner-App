import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // We tell Vite to use the 'public' folder as the root directory for assets and HTML.
  // Since index.html is in /public, this setting tells Vite to find it there.
  root: 'public', 
  
  // We need to tell the builder how to handle the final output.
  build: {
    // The final built files must go into the 'dist' folder (which Netlify expects).
    outDir: '../dist', 
    
    // We explicitly set the entry HTML file name.
    rollupOptions: {
      input: {
        main: 'index.html'
      }
    }
  }
});
