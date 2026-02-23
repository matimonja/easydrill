/**
 * Marketplace: búsqueda, filtros por tags y grid de ejercicios.
 * Solo se carga en marketplace.html.
 */

import { initNavAuth } from './auth/nav-auth';

type TagId = 'pases' | 'posesion' | 'ataque' | 'defensa' | 'transicion' | 'salida' | 'contencion' | 'press';

const TAG_CLASS: Record<TagId, string> = {
  pases: 'tag-blue',
  posesion: 'tag-green',
  ataque: 'tag-orange',
  defensa: 'tag-red',
  transicion: 'tag-violet',
  salida: 'tag-blue',
  contencion: 'tag-green',
  press: 'tag-red',
};

interface Exercise {
  id: string;
  title: string;
  description: string;
  tags: TagId[];
  /** URL opcional de miniatura (GIF o imagen). Si no hay, se muestra placeholder. */
  thumbnail?: string;
}

const EXERCISES: Exercise[] = [
  {
    id: '1',
    title: 'Ronda de pases en triángulo',
    description: 'Ejercicio de posesión y movimiento para mediocampo. Ideal para calentar o trabajar apoyos.',
    tags: ['pases', 'posesion', 'ataque'],
  },
  {
    id: '2',
    title: 'Presión post pérdida',
    description: 'Transición defensiva y recuperación rápida. Trabaja la reacción al perder el balón.',
    tags: ['defensa', 'transicion'],
  },
  {
    id: '3',
    title: 'Salida desde el arco',
    description: 'Construcción desde atrás con apoyos y desmarques. Salida limpia bajo presión.',
    tags: ['salida', 'contencion'],
  },
  {
    id: '4',
    title: 'Rondo 4v2 en espacio reducido',
    description: 'Mantener la pelota en superioridad numérica. Pases rápidos y movilidad.',
    tags: ['posesion', 'press'],
  },
  {
    id: '5',
    title: 'Cambio de juego y amplitud',
    description: 'Pases largos para abrir el campo y aprovechar los espacios por las bandas.',
    tags: ['pases', 'ataque'],
  },
  {
    id: '6',
    title: 'Bloqueo defensivo en línea',
    description: 'Trabajo de línea de defensores y coberturas. Comunicación y repliegue.',
    tags: ['defensa', 'contencion'],
  },
  {
    id: '7',
    title: 'Contraataque 3v2',
    description: 'Transición rápida al ataque tras recuperar. Finalización en superioridad.',
    tags: ['transicion', 'ataque'],
  },
  {
    id: '8',
    title: 'Posesión 6v4 con comodines',
    description: 'Mantener la pelota con comodines en el exterior. Circulación y paciencia.',
    tags: ['posesion', 'pases'],
  },
  {
    id: '9',
    title: 'Pressing alto en bloque',
    description: 'Presión coordinada tras pérdida en campo rival. Recuperación en zona alta.',
    tags: ['press', 'defensa'],
  },
];

const TAG_LABELS: Record<TagId, string> = {
  pases: 'Pases',
  posesion: 'Posesión',
  ataque: 'Ataque',
  defensa: 'Defensa',
  transicion: 'Transición',
  salida: 'Salida',
  contencion: 'Contención',
  press: 'Press',
};

const ALL_TAG_IDS = Object.keys(TAG_LABELS) as TagId[];

function getExercises(): Exercise[] {
  return EXERCISES;
}

function renderFilterTags(container: HTMLElement, selected: Set<TagId>, onToggle: (tag: TagId) => void): void {
  container.innerHTML = '';
  ALL_TAG_IDS.forEach((tagId) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'filter-tag' + (selected.has(tagId) ? ' active' : '');
    btn.textContent = TAG_LABELS[tagId];
    btn.dataset.tag = tagId;
    btn.addEventListener('click', () => onToggle(tagId));
    container.appendChild(btn);
  });
}

function updateFilterTagButtons(container: HTMLElement, selected: Set<TagId>): void {
  container.querySelectorAll<HTMLButtonElement>('.filter-tag').forEach((btn) => {
    const tag = btn.dataset.tag as TagId;
    btn.classList.toggle('active', selected.has(tag));
  });
}

function renderCard(exercise: Exercise): string {
  const thumb = exercise.thumbnail
    ? `<img src="${exercise.thumbnail}" alt="" loading="lazy" />`
    : `<span class="carousel-thumb-placeholder"><i class="fa-solid fa-play"></i> Vista previa</span>`;
  const tagsHtml = exercise.tags
    .map((t) => `<span class="tag ${TAG_CLASS[t]}">${TAG_LABELS[t]}</span>`)
    .join('');
  return `
    <article class="marketplace-card" data-id="${exercise.id}">
      <div class="carousel-thumb" aria-hidden="true">${thumb}</div>
      <div class="carousel-body">
        <h4>${escapeHtml(exercise.title)}</h4>
        <p>${escapeHtml(exercise.description)}</p>
        <div class="carousel-tags">${tagsHtml}</div>
        <div class="marketplace-card-actions">
          <a href="editor.html?drill=${encodeURIComponent(exercise.id)}" class="card-action-link"><i class="fa-solid fa-pen-ruler"></i> Abrir en pizarrón</a>
          <a href="editor.html?drill=${encodeURIComponent(exercise.id)}&fork=1" class="card-action-fork" title="Hacer fork: copiar a tu cuaderno"><i class="fa-solid fa-code-branch"></i> Fork</a>
        </div>
      </div>
    </article>
  `;
}

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function filterAndSort(
  exercises: Exercise[],
  query: string,
  selectedTags: Set<TagId>,
  sort: string
): Exercise[] {
  let list = exercises.slice();

  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.tags.some((t) => TAG_LABELS[t].toLowerCase().includes(q))
    );
  }

  if (selectedTags.size > 0) {
    list = list.filter((e) => e.tags.some((t) => selectedTags.has(t)));
  }

  if (sort === 'name-asc') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === 'name-desc') {
    list.sort((a, b) => b.title.localeCompare(a.title));
  }

  return list;
}

function initMarketplace(): void {
  const searchInput = document.getElementById('marketplace-search') as HTMLInputElement;
  const filterTagsEl = document.getElementById('filter-tags');
  const filterReset = document.getElementById('filter-reset');
  const emptyReset = document.getElementById('empty-reset');
  const countEl = document.getElementById('marketplace-count');
  const sortSelect = document.getElementById('marketplace-sort') as HTMLSelectElement;
  const grid = document.getElementById('marketplace-grid');
  const empty = document.getElementById('marketplace-empty');

  if (!filterTagsEl || !grid || !countEl || !empty) return;

  const exercises = getExercises();
  let selectedTags = new Set<TagId>();
  let searchQuery = '';
  let sortValue = 'relevance';

  function applyFilters(): void {
    const result = filterAndSort(exercises, searchQuery, selectedTags, sortValue);
    countEl.textContent = result.length === 1 ? '1 ejercicio' : `${result.length} ejercicios`;
    grid.innerHTML = result.map((e) => renderCard(e)).join('');
    empty.hidden = result.length > 0;
    updateFilterTagButtons(filterTagsEl, selectedTags);
  }

  renderFilterTags(filterTagsEl, selectedTags, (tagId) => {
    if (selectedTags.has(tagId)) {
      selectedTags.delete(tagId);
    } else {
      selectedTags.add(tagId);
    }
    applyFilters();
  });

  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value;
    applyFilters();
  });

  sortSelect?.addEventListener('change', () => {
    sortValue = sortSelect.value;
    applyFilters();
  });

  filterReset?.addEventListener('click', () => {
    selectedTags.clear();
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    if (sortSelect) sortSelect.value = 'relevance';
    sortValue = 'relevance';
    applyFilters();
  });

  emptyReset?.addEventListener('click', () => {
    selectedTags.clear();
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    if (sortSelect) sortSelect.value = 'relevance';
    sortValue = 'relevance';
    applyFilters();
    empty.hidden = true;
  });

  applyFilters();
}

if (document.body.classList.contains('marketplace-page')) {
  initMarketplace();
  initNavAuth();
}
