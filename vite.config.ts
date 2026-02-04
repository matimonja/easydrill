import { defineConfig } from 'vite';

export default defineConfig({
  // Por defecto base '/' (local y producción). GitHub Pages usa --base=/repo-name/ en el workflow.
  base: '/',
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        editor: 'editor.html',
        marketplace: 'marketplace.html',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
