/**
 * Página de Aprendizaje: guías, recursos y cursos.
 * Por ahora solo estructura estática; se puede añadir lógica (filtros, enlaces a contenido) más adelante.
 */

import { initNavAuth } from './auth/nav-auth';

if (document.body.classList.contains('aprendizaje-page')) {
  initNavAuth();
}
