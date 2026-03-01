# PWA para toda la app (sin barra de URL)

Guía para implementar la app como Progressive Web App: al instalarla, toda la web se usa en modo standalone (sin barra de URL). Incluye alternativa fullscreen en el editor para quienes no instalen la PWA.

---

## Contexto

- Multi-page app con Vite: 11 HTML entry points (`index.html`, `editor.html`, `setup.html`, `login.html`, `perfil.html`, `cuaderno.html`, `ejercicio.html`, `marketplace.html`, `aprendizaje.html`, `comunidad.html`, `bolsa-de-trabajo.html`).
- Objetivo: al instalar la PWA, **toda la app** funciona en modo standalone. La navegación entre páginas se mantiene dentro de la PWA.

---

## Parte 1: Configurar PWA con vite-plugin-pwa

### 1.1 Instalar dependencia

```bash
npm install -D vite-plugin-pwa
```

### 1.2 Configurar `vite.config.ts`

Agregar el plugin `VitePWA` con `scope: '/'` y `start_url: '/'` (home). Con `display: 'standalone'` todas las páginas dentro del scope se abren sin barra de URL.

```ts
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'EasyDrill - Pizarra Táctica',
        short_name: 'EasyDrill',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#1a1a2e',
        theme_color: '#1a1a2e',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        navigateFallback: null,
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
      },
    }),
  ],
  // ... resto de la config existente (base, define, build.rollupOptions, server.proxy)
});
```

**Puntos clave:**

- **`scope: '/'`** — Abarca todas las páginas; la navegación entre `editor.html`, `cuaderno.html`, etc. se queda dentro de la PWA.
- **`start_url: '/'`** — Abre la home al lanzar la PWA desde el icono.
- **`navigateFallback: null`** — Porque es multi-page (no SPA); cada HTML existe como archivo real.
- **`globPatterns`** — Cachea JS, CSS, HTML e imágenes para carga rápida.

### 1.3 Crear iconos placeholder

Crear carpeta `public/icons/` con dos PNGs:

- `icon-192.png` (192×192) — placeholder con texto "ED" sobre fondo `#1a1a2e`
- `icon-512.png` (512×512) — idem

Vite sirve archivos de `public/` en la raíz; se acceden como `/icons/icon-192.png`.

### 1.4 Agregar meta tags PWA en todos los HTML

En el `<head>` de cada uno de los 11 HTML:

```html
<meta name="theme-color" content="#1a1a2e" />
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

**Archivos a modificar:**

- `index.html`
- `editor.html`
- `setup.html`
- `login.html`
- `perfil.html`
- `cuaderno.html`
- `ejercicio.html`
- `marketplace.html`
- `aprendizaje.html`
- `comunidad.html`
- `bolsa-de-trabajo.html`

El `<link rel="manifest">` lo inyecta automáticamente `vite-plugin-pwa` en todos los HTML del build.

---

## Parte 2: Alternativa fullscreen en el editor

Para usuarios que no instalen la PWA, un **botón de pantalla completa** en el editor oculta la barra de URL usando la Fullscreen API.

### 2.1 Agregar botón en `editor.html`

Un botón con icono `fa-expand` en la toolbar del editor (junto a los botones existentes dentro de `#game-container`).

### 2.2 Lógica en `src/main.ts`

```ts
const btn = document.getElementById('btn-fullscreen');
btn?.addEventListener('click', () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else {
    document.exitFullscreen();
  }
});
```

Cambiar el icono entre `fa-expand` y `fa-compress` según el estado.

---

## Parte 3: Prompt de instalación PWA

Mostrar un botón discreto "Instalar app" en `index.html` (home) y en `editor.html` que capture el evento `beforeinstallprompt`. Al hacer clic, dispara el diálogo nativo de instalación del navegador.

Implementar en un archivo compartido `src/pwa-install.ts` importado desde `src/home.ts` y `src/main.ts`:

```ts
let deferredPrompt: BeforeInstallPromptEvent | null = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // mostrar botón "Instalar app"
});
// al click del botón:
deferredPrompt?.prompt();
```

En navegadores que no soporten instalación, el botón no aparece.

---

## Resumen de archivos

| Acción    | Archivo(s) |
|----------|------------|
| Instalar | `vite-plugin-pwa` (devDependency) |
| Modificar | `vite.config.ts` — agregar plugin PWA con manifest |
| Modificar | 11 archivos HTML — agregar meta tags `theme-color` y `apple-touch-icon` |
| Modificar | `editor.html` — botón fullscreen |
| Modificar | `src/main.ts` — lógica fullscreen + import pwa-install |
| Modificar | `src/home.ts` — import pwa-install |
| Crear    | `public/icons/icon-192.png` y `public/icons/icon-512.png` (placeholders) |
| Crear    | `src/pwa-install.ts` — lógica compartida del prompt de instalación |
