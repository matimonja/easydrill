/**
 * Comunidad: foro con categorías (Ejercicios, Funcionalidades, General).
 * Placeholder con hilos de ejemplo; en el futuro conectar con backend.
 */

import { initNavAuth } from './auth/nav-auth';

type CategoryId = 'ejercicios' | 'funcionalidades' | 'general';

interface Thread {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  date: string;
  replies: number;
  category: CategoryId;
}

const THREADS: Thread[] = [
  {
    id: '1',
    title: '¿Cómo diagramar una salida desde el arco con 3 defensores?',
    excerpt: 'Estoy armando una sesión de construcción y me cuesta organizar los apoyos…',
    author: 'Usuario',
    date: '2024-01-10',
    replies: 3,
    category: 'ejercicios',
  },
  {
    id: '2',
    title: 'Rondo 4v2: variantes para subir la intensidad',
    excerpt: 'Comparto cómo le fui sumando restricciones para que no se acomoden.',
    author: 'Usuario',
    date: '2024-01-08',
    replies: 7,
    category: 'ejercicios',
  },
  {
    id: '3',
    title: 'Exportar ejercicio como imagen o PDF',
    excerpt: 'Sería muy útil poder guardar el pizarrón como imagen para mandar por WhatsApp o imprimir.',
    author: 'Usuario',
    date: '2024-01-12',
    replies: 12,
    category: 'funcionalidades',
  },
  {
    id: '4',
    title: 'Timeline de la jugada (reproducción por pasos)',
    excerpt: 'Que se pueda pausar o ir paso a paso en la animación para explicar en la práctica.',
    author: 'Usuario',
    date: '2024-01-09',
    replies: 5,
    category: 'funcionalidades',
  },
  {
    id: '5',
    title: 'Bienvenida y primeras impresiones',
    excerpt: 'Hola a todos, probé EasyDrill esta semana y quería contar que…',
    author: 'Usuario',
    date: '2024-01-14',
    replies: 2,
    category: 'general',
  },
];

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderThread(thread: Thread): string {
  return `
    <li>
      <a href="login.html" class="comunidad-thread" data-id="${thread.id}" title="Iniciar sesión para ver el hilo">
        <div class="comunidad-thread-title">${escapeHtml(thread.title)}</div>
        <p class="comunidad-thread-excerpt" style="margin:0 0 0.35rem; font-size:0.9rem; color:var(--home-muted);">${escapeHtml(thread.excerpt)}</p>
        <div class="comunidad-thread-meta">
          <span>${escapeHtml(thread.author)}</span>
          <span>${thread.date}</span>
          <span><i class="fa-solid fa-comment"></i> ${thread.replies} respuestas</span>
        </div>
      </a>
    </li>
  `;
}

function initComunidad(): void {
  const containers: Record<CategoryId, HTMLElement | null> = {
    ejercicios: document.getElementById('threads-ejercicios'),
    funcionalidades: document.getElementById('threads-funcionalidades'),
    general: document.getElementById('threads-general'),
  };

  (Object.keys(containers) as CategoryId[]).forEach((cat) => {
    const el = containers[cat];
    if (!el) return;
    const list = THREADS.filter((t) => t.category === cat);
    if (list.length === 0) {
      el.innerHTML = '<li class="comunidad-thread-empty">Aún no hay hilos. Iniciá sesión para crear el primero.</li>';
    } else {
      el.innerHTML = list.map((t) => renderThread(t)).join('');
    }
  });

  document.querySelectorAll('.comunidad-cat-link').forEach((link) => {
    link.addEventListener('click', (e) => {
      const target = e.currentTarget as HTMLAnchorElement;
      const href = target.getAttribute('href');
      if (href?.startsWith('#')) {
        document.querySelectorAll('.comunidad-cat-link').forEach((l) => l.classList.remove('active'));
        target.classList.add('active');
      }
    });
  });
}

if (document.body.classList.contains('comunidad-page')) {
  initComunidad();
  initNavAuth();
}
