import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  define: {
    global: 'globalThis',
  },
  build: {
    rollupOptions: {
      input: {
        main: 'index.html',
        setup: 'setup.html',
        editor: 'editor.html',
        marketplace: 'marketplace.html',
        bolsa: 'bolsa-de-trabajo.html',
        aprendizaje: 'aprendizaje.html',
        comunidad: 'comunidad.html',
        perfil: 'perfil.html',
        ejercicio: 'ejercicio.html',
        login: 'login.html',
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
