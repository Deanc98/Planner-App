const { build } = require('vite');
const path = require('path');

async function runBuild() {
  try {
    // Call the Vite build function
    await build({
      // Start the root path from the current directory
      root: path.resolve(__dirname), 
      
      // Configuration details
      build: {
        outDir: 'dist',
        emptyOutDir: true,
        
        // CRITICAL: Tells the build tool to use index.html as the starting point 
        // and link it to the /src/main.jsx script
        rollupOptions: {
          input: path.resolve(__dirname, 'index.html'),
        },
      },
      
      // Tell Vite where to find the static assets like manifest.json
      publicDir: 'public', 
    });
    console.log('Build successful!');
  } catch (e) {
    console.error('Vite Build Failed:', e);
    process.exit(1);
  }
}

runBuild();
