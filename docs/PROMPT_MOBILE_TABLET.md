# Prompt: Soporte móvil y tablet en el editor de pizarra táctica

**Objetivo:** Adaptar el editor de pizarra táctica (página del canvas y toolbar) para que funcione correctamente en smartphones y tablets, manteniendo el comportamiento actual en desktop.

**Uso:** Este documento puede usarse como prompt para una IA. Incluye contexto, tareas concretas, riesgos y criterios de aceptación.

---

## 1. Contexto obligatorio

Antes de codificar, leer (desde la raíz del proyecto, carpeta `docs/`):

- **`docs/ARCHITECTURE.md`** – Rol de Game como mediador, Tools, Commands, Camera, AnimationManager.
- **`docs/AI_GUIDELINES.md`** – Lógica de interacción en Tools, no en Game; Commands para cambios de estado; preventDefault en eventos del canvas.
- **`docs/PROMPT.md`** – Estilo, modularidad y requisitos de respuesta.

**Estado actual del input en el editor:**

- En **`Game.ts`** (`setupEvents()`): el canvas tiene `mousedown`; en `window` se escuchan `mousemove` y `mouseup`. El zoom usa solo `wheel` en el canvas.
- La interfaz **`Tool`** (`src/tools/Tool.ts`) define `onMouseDown(e: MouseEvent)`, `onMouseMove(e: MouseEvent)`, `onMouseUp(e: MouseEvent)`.
- **`BaseTool`** (`src/tools/BaseTool.ts`) ofrece `getWorldPoint(e: MouseEvent)` usando `e.clientX`, `e.clientY` y `canvas.getBoundingClientRect()`.
- Todas las Tools (SelectTool, PlayerTool, ShapeTool, ActionTool, CameraTool, ExerciseTool) reciben solo eventos de ratón.
- No hay eventos táctiles ni Pointer Events; no hay pinch-to-zoom.
- El CSS del editor (`src/style.css`) no tiene media queries para el editor; toolbar fija (`--toolbar-height: 120px`), menú secundario fijo 260px de ancho.

**Orden sugerido de implementación:** (1) Pointer Events y normalización, (2) pinch-to-zoom, (3) CSS touch-action, (4) ajustes de UI para pantallas pequeñas. Así se puede probar cada capa sin romper la anterior.

---

## 2. Tareas a realizar

### 2.1 Entrada unificada (Pointer Events)

- **Objetivo:** Que el mismo flujo “down → move → up” funcione con ratón (desktop) y con dedo o lápiz (móvil/tablet).
- **Acción:** Usar **Pointer Events** (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`) en el canvas y, para move/up/cancel, en `window` (o en el elemento que tenga la captura), en lugar de depender solo de eventos de mouse.
- **Detalle:**
  - En `Game.ts` → `setupEvents()`: registrar listeners de pointer en el canvas para `pointerdown` y en `window` para `pointermove`, `pointerup`, `pointercancel`. En `pointerdown` sobre el canvas, llamar a `canvas.setPointerCapture(pointerId)` para que los eventos siguientes se entreguen al canvas aunque el dedo salga del elemento (esencial para arrastrar en móvil).
  - En `pointercancel` o cuando el puntero se pierde, invocar la misma lógica que en “soltar” (por ejemplo llamar a `onMouseUp` con un evento sintético o notificar a la tool activa) para que ninguna tool quede en estado “arrastrando” o “dibujando”.
  - Las Tools deben seguir recibiendo un objeto con `clientX` y `clientY`. Tanto `MouseEvent` como `PointerEvent` tienen estas propiedades. Si se cambia el tipo en la interfaz `Tool`, usar `PointerEvent` o una interfaz mínima `{ clientX: number; clientY: number }` para no romper tests que construyen eventos con esas propiedades.
  - `BaseTool.getWorldPoint(e)` debe aceptar ese tipo (PointerEvent o interfaz con `clientX`/`clientY`); la lógica con `getBoundingClientRect()` sigue igual.
  - En **CameraTool** se usan `e.clientX` y `e.clientY`; si el evento pasado tiene esas propiedades, no hace falta cambiar la lógica interna.
  - Eliminar o no registrar los listeners de `mousedown`/`mousemove`/`mouseup` en el canvas/window cuando se usen pointer events, para evitar doble disparo (en navegadores que emiten ambos).
- **Criterio:** En desktop, clic y arrastre en el canvas se comportan igual que antes. En dispositivo táctil (o emulación táctil), un toque equivale a clic y el arrastre a move/up; si el dedo sale del canvas durante el arrastre, la acción sigue hasta soltar.

### 2.2 Zoom con pinch (móvil/tablet)

- **Objetivo:** Poder hacer zoom en el canvas con gesto de pinch (dos dedos) en móvil/tablet.
- **Acción:** Detectar dos punteros activos sobre el canvas y, según la variación de la distancia entre ellos, llamar a la cámara para aplicar zoom. La API actual es `camera.zoomAt(amount, screenX, screenY, canvas)`; los parámetros `screenX` y `screenY` deben ser coordenadas de pantalla (p. ej. `clientX`/`clientY`) del centro del gesto (p. ej. punto medio entre los dos dedos).
- **Detalle:** Implementar la detección de pinch donde se gestionan los pointer events (p. ej. en `Game.ts`). Mantener un estado de pinch separado (dos pointerId, distancia inicial, zoom inicial) y no mezclarlo con el estado de la rueda del ratón: wheel y pinch deben ser caminos distintos que al final llamen a `camera.zoomAt`. Al soltar uno de los dos dedos, finalizar el gesto de pinch.
- **Criterio:** En desktop, el zoom con rueda sigue igual. En móvil/tablet, acercar/alejar dos dedos sobre el canvas hace zoom in/out sin activar otras herramientas (p. ej. no iniciar pan o dibujo).

### 2.3 Prevención de gestos del navegador

- **Objetivo:** Evitar que el navegador interprete arrastres o pinch en el canvas como scroll o zoom de página.
- **Acción:** Añadir en el **canvas** (o en su contenedor `#game-container`) la propiedad CSS `touch-action: none`. Así el navegador no hará scroll ni zoom de página sobre ese elemento. Ajustar en `src/style.css` (selector para `#gameCanvas` o `#game-container`).
- **Criterio:** Al arrastrar o hacer pinch sobre el canvas en móvil, la página no hace scroll ni zoom del navegador; solo el canvas responde (pan, zoom de cámara o dibujo según la tool activa).

### 2.4 Interfaz del editor (toolbar y menú) en pantallas pequeñas

- **Objetivo:** Que la toolbar y el menú secundario sean usables en pantallas pequeñas (móvil/tablet) sin tapar todo el canvas ni tener botones demasiado pequeños.
- **Acción:**
  - **Toolbar:** En viewports estrechos (p. ej. `max-width: 768px` o `48em`), reducir altura si hace falta, aumentar el tamaño táctil de los botones (recomendado mínimo ~44px de lado o área clicable) y, si es necesario, permitir scroll horizontal o agrupar herramientas en un menú colapsable. Usar variables CSS existentes (p. ej. `--toolbar-height`) y media queries aplicadas solo al editor.
  - **Menú secundario (panel de opciones):** En pantallas pequeñas, evitar un panel fijo de 260px que ocupe todo el ancho. Usar un drawer o overlay que se abra desde el botón actual “abrir menú” y se cierre con un botón o tocando fuera, de modo que el canvas sea el foco cuando no se editan propiedades. El botón de abrir menú debe tener tamaño y contraste suficientes para el dedo.
  - **Controles dentro del menú:** Sliders e inputs con altura o padding suficiente (p. ej. mín. 44px) para uso táctil. Revisar `input[type="range"]` y botones del menú.
- **Criterio:** En ventana estrecha o en dispositivo táctil, se pueden elegir herramientas, abrir/cerrar el panel de opciones y usar los controles sin que el canvas quede inutilizable o los botones sean imposibles de tocar.

### 2.5 Teclado y accesibilidad desde la UI

- En móvil no hay atajos de teclado (V, P, C, S, O, Deshacer, etc.). **No es obligatorio** implementar teclado virtual. **Sí es obligatorio** que todas las acciones importantes sean realizables solo con la UI (botones de herramientas, deshacer/rehacer, etc.). Comprobar que no quede ninguna acción únicamente accesible por teclado.

---

## 3. Riesgos para desktop y cómo evitarlos

- **Usar solo Touch Events sin Pointer/mouse:** En desktop sin tacto el canvas no respondería. **Evitar:** usar Pointer Events como fuente principal (en desktop el navegador los emite también para el ratón) o, si se usan touch, mantener mouse/pointer y normalizar en un solo camino.
- **Normalización de coordenadas:** En touch “crudo”, las coordenadas están en `e.touches[0]` o `changedTouches`. Usar `e.clientX` en un evento touch puede fallar. **Evitar:** con Pointer Events no hace falta normalizar touch a mano; si en el futuro se añade touch explícito, obtener `clientX`/`clientY` en un solo helper y pasar ese resultado a las Tools.
- **preventDefault:** Si se llama `preventDefault()` en todos los pointer/touch del documento, se puede romper el scroll en el menú secundario u otras zonas. **Evitar:** llamar `preventDefault()` solo en los eventos que tengan como target el canvas (o el contenedor del canvas) y solo cuando la interacción corresponda a dibujo/pan/zoom, no en todo el documento.
- **Handles y áreas de clic:** Aumentar mucho el radio de los handles (resize, etc.) para móvil puede hacer que en desktop se solapen o se sientan demasiado grandes. **Evitar:** hacer el radio dependiente del tipo de puntero, por ejemplo con `matchMedia('(pointer: coarse)')` y un multiplicador, o un mínimo en píxeles lógicos solo en dispositivos táctiles.
- **Tests:** Los tests de Tools usan `new MouseEvent(...)` con `clientX`/`clientY`. Si la interfaz de las Tools pasa a recibir `PointerEvent` o `{ clientX, clientY }`, actualizar los tests para usar ese tipo (p. ej. `new PointerEvent(...)` con las mismas propiedades) y asegurar que los tests sigan pasando.

---

## 4. Restricciones técnicas

- No mover la lógica de “qué hacer en clic/arrastre” desde las Tools a `Game.ts`; las Tools siguen siendo el lugar donde se interpreta la interacción (ver `docs/AI_GUIDELINES.md`).
- Mantener la firma o compatibilidad de las Tools de forma que sigan recibiendo un evento (o objeto) con `clientX` y `clientY` para no duplicar lógica en cada Tool.
- TypeScript estricto; evitar `any` innecesarios.
- No eliminar ni romper Undo/Redo (CommandManager); los comandos existentes deben seguir funcionando.

---

## 5. Criterios de aceptación

1. **Desktop:** El comportamiento actual del editor se mantiene: clic, arrastrar entidades, dibujar formas, crear acciones, pan/zoom con rueda, uso del menú secundario y atajos de teclado. Si en algún flujo se usa doble clic, debe seguir funcionando (en la mayoría de navegadores los Pointer Events no impiden que se dispare `dblclick` cuando corresponda).
2. **Móvil/tablet (o emulación):** Un toque equivale a clic; arrastrar con un dedo funciona como arrastre de ratón (incluso si el dedo sale del canvas); pinch con dos dedos hace zoom en el canvas; la página no hace scroll ni zoom al interactuar con el canvas; la toolbar y el menú secundario son usables (botones y controles accesibles con el dedo).
3. **Tests:** Los tests existentes (p. ej. en `src/tests/`) siguen pasando. Si se cambia el tipo de evento que reciben las Tools, actualizar los tests para usar el nuevo tipo o la interfaz acordada.
4. **Documentación:** Si se añaden opciones de configuración o comportamientos nuevos (p. ej. umbrales de pinch), documentarlos brevemente en código o en este documento.

---

## 6. Archivos relevantes (referencia)

- `src/core/Game.ts` – `setupEvents()`, resize, bucle principal.
- `src/tools/Tool.ts` – Interfaz de las herramientas.
- `src/tools/BaseTool.ts` – `getWorldPoint(e)`.
- `src/tools/SelectTool.ts`, `ShapeTool.ts`, `ActionTool.ts`, `CameraTool.ts`, `PlayerTool.ts`, `ExerciseTool.ts` – Uso de eventos.
- `src/core/Camera.ts` – `zoomAt(amount, screenX, screenY, canvas)`, `pan`, `screenToWorld`.
- `src/style.css` – Estilos del editor (toolbar, menú, canvas).
- `editor.html` – Estructura del editor (canvas, toolbar, menú).
- Tests: `src/tests/tools/ShapeTool.test.ts` y otros que usen eventos de mouse.

---

Al implementar, indicar qué archivos se modifican y por qué, y comprobar explícitamente desktop y móvil/tablet (o emulación) según los criterios anteriores.

---

**Implementación realizada:** Pointer Events y pinch en `Game.ts` (`setupEvents`, `startPinch`, `updatePinch`, `endPinch`); interfaz `Tool` con `PointerLikeEvent` (alias de `PointerEvent`) en `Tool.ts` y todas las tools; `touch-action: none` y media queries móvil en `src/style.css`; tests de ShapeTool actualizados para usar eventos tipo pointer (helper `pointerEvent()` por compatibilidad con jsdom).

**Orientación en smartphones:** En viewports ≤768px y orientación portrait se muestra un overlay full-screen que pide rotar el dispositivo en horizontal para crear el ejercicio; en landscape el overlay se oculta y el editor se usa con normalidad. Implementado con CSS (`#rotate-overlay`, media queries `(max-width: 768px) and (orientation: portrait/landscape)` en `src/style.css`) y marcado en `editor.html`.

**Toolbar colapsable en móvil:** En viewports ≤768px la barra inferior (`#main-toolbar`) puede colapsarse a una tira de 48px en el borde inferior con un botón para expandir/colapsar (`#toolbar-collapse-btn`). La clase `.main-toolbar.collapsed` oculta el contenido (`.main-toolbar-content`) y muestra solo el botón; el toggle se gestiona en `Game.ts` (`setupUI()`).
