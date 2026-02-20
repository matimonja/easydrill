# Reglas y Pautas de Desarrollo para Tactical Board

Este documento define los estándares técnicos y de arquitectura que **DEBEN** ser seguidos por cualquier desarrollador (humano o IA) que contribuya al proyecto.

## 1. Principios de Arquitectura

El proyecto sigue una arquitectura modular estricta para evitar "God Objects" y código espagueti.

### 1.1 Sistema de Herramientas (Tool System)
*   **Regla de Oro:** NUNCA agregar lógica de interacción con el mouse (clic, arrastrar, soltar) directamente en `Game.ts`.
*   **Implementación:** Toda interacción debe encapsularse en una clase que implemente la interfaz `Tool` (en `src/tools/`).
*   **Ejemplo:** Si quieres agregar una funcionalidad para "Medir Distancia", crea `src/tools/MeasureTool.ts` y regístrala en `Game.ts`.
*   **Estado:** Las herramientas deben gestionar su propio estado interno (`isDragging`, `startPos`) y limpiarlo en `deactivate()`.

### 1.2 Patrón de Comandos (Undo/Redo)
*   **Regla de Oro:** Cualquier acción que modifique el estado del tablero (agregar, borrar, mover, cambiar color) DEBE ser un `Command`.
*   **Ubicación:** Definir comandos en `src/core/Commands.ts`.
*   **Requisito:** Cada comando debe implementar `execute()` y `undo()` de forma simétrica.

### 1.3 Desacoplamiento (Contexto)
*   **Interfaces:** Las herramientas y comandos no deben depender de la clase concreta `Game`. Deben depender de `IGameContext` (`src/core/Interfaces.ts`).
*   **Dependencias Circulares:** Evita importar `Game.ts` dentro de archivos en `entities/` o `tools/`. Usa `Interfaces.ts`.

### 1.4 Animación y Acciones
*   **Filosofía:** Las `Action` definen la *intención* y el *camino*, pero no ejecutan lógica de movimiento por sí mismas.
*   **AnimationManager:** Es el único responsable de interpolar posiciones y cambiar estados durante `play()`.
*   **Separación:** Las entidades (`Player`, `Ball`) tienen propiedades de estado (`x`, `y`), pero durante la animación, estos valores son controlados externamente por el Manager, no por la entidad.

## 2. Estándares de Código

### 2.1 TypeScript
*   **Tipado Estricto:** No usar `any` a menos que sea estrictamente necesario (e.g., serialización genérica compleja).
*   **Interfaces vs Clases:** Usa Interfaces para definir contratos de datos (`EntityState`) y Clases para lógica e implementación.

### 2.2 Entidades
*   **Renderizado:** La lógica de dibujo (`draw`) debe estar contenida en la entidad.
*   **Hit Testing:** Cada entidad es responsable de saber si un punto está dentro de ella (`containsPoint`).

### 2.3 Manejo de Eventos
*   **Prevent Default:** Al manejar eventos de mouse en el canvas (`mousedown`, `wheel`), siempre usa `e.preventDefault()` para evitar comportamientos nativos del navegador que interfieran con la experiencia de "app nativa".

## 3. Flujo de Trabajo para Nuevas Funcionalidades

1.  **Definir la Intención:** ¿Es una nueva interacción (Tool), un nuevo objeto (Entity) o una nueva Acción Táctica?
2.  **Crear Archivos:**
    *   Nueva Entidad -> `src/entities/MyNewEntity.ts`
    *   Nueva Herramienta -> `src/tools/MyNewTool.ts`
    *   Nueva Acción -> `src/entities/Action.ts` (Extender `BaseAction`)
    *   Nuevo Comando (si aplica) -> `src/core/Commands.ts`
3.  **Integrar:**
    *   Registrar la herramienta en `Game.ts`.
    *   Agregar botón en la UI (`Game.setupUI` o `Game.updatePropertiesPanel`).
4.  **Si es una nueva Acción:**
    *   Definir sus físicas en el constructor (`movesPlayer`, `ballInteraction`).
    *   Asegurar que `AnimationManager` sepa cómo manejar casos especiales si los tiene (ej: `ballInteraction === 'propel'`).

## 4. Mantenimiento
*   **Comentarios:** Usar JSDoc (`/** ... */`) para documentar el "por qué" de las clases y métodos complejos.
*   **Limpieza:** Si modificas `Game.ts`, verifica que no estés rompiendo la delegación de eventos a `this.tools`.

