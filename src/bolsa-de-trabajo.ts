/**
 * Bolsa de trabajo: búsqueda, filtros por tipo de puesto y listado de ofertas.
 */

import { initNavAuth } from './auth/nav-auth';

type JobType = 'entrenador' | 'coordinador' | 'preparador' | 'otro';

const JOB_TYPE_LABELS: Record<JobType, string> = {
  entrenador: 'Entrenador',
  coordinador: 'Coordinador',
  preparador: 'Preparador físico',
  otro: 'Otro',
};

interface Job {
  id: string;
  title: string;
  club: string;
  location: string;
  type: JobType;
  description: string;
  publishedAt: string;
}

const JOBS: Job[] = [
  {
    id: '1',
    title: 'Entrenador de infantiles',
    club: 'Club Deportivo Norte',
    location: 'CABA',
    type: 'entrenador',
    description: 'Buscamos entrenador para categoría infantiles (sub-12). Experiencia en formación técnica y trabajo en valores.',
    publishedAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'Coordinador de fútbol femenino',
    club: 'Asociación Deportiva Sur',
    location: 'La Plata',
    type: 'coordinador',
    description: 'Coordinación de todas las categorías de fútbol femenino. Planificación anual y acompañamiento a entrenadores.',
    publishedAt: '2024-01-12',
  },
  {
    id: '3',
    title: 'Preparador físico',
    club: 'Club Atlético Centro',
    location: 'Remoto',
    type: 'preparador',
    description: 'Trabajo con primera división y divisiones formativas. Conocimientos en readaptación y prevención.',
    publishedAt: '2024-01-10',
  },
  {
    id: '4',
    title: 'Entrenador de juveniles',
    club: 'Club Deportivo Este',
    location: 'Gran Buenos Aires',
    type: 'entrenador',
    description: 'Categoría sub-16. Incorporación a proyecto de cantera con plan de desarrollo definido.',
    publishedAt: '2024-01-08',
  },
  {
    id: '5',
    title: 'Coordinador técnico',
    club: 'Instituto Deportivo Oeste',
    location: 'Córdoba',
    type: 'coordinador',
    description: 'Definición de metodología y seguimiento de entrenadores en todas las categorías.',
    publishedAt: '2024-01-05',
  },
];

const ALL_JOB_TYPES = Object.keys(JOB_TYPE_LABELS) as JobType[];

function escapeHtml(s: string): string {
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderJobCard(job: Job): string {
  const typeClass = `bolsa-card-type tag-${job.type}`;
  return `
    <article class="bolsa-card" data-id="${job.id}">
      <div class="bolsa-card-header">
        <h3 class="bolsa-card-title">${escapeHtml(job.title)}</h3>
        <span class="${typeClass}">${JOB_TYPE_LABELS[job.type]}</span>
      </div>
      <div class="bolsa-card-meta">
        <span><i class="fa-solid fa-building"></i> ${escapeHtml(job.club)}</span>
        <span><i class="fa-solid fa-location-dot"></i> ${escapeHtml(job.location)}</span>
      </div>
      <p class="bolsa-card-desc">${escapeHtml(job.description)}</p>
      <div class="bolsa-card-actions">
        <a href="login.html" title="Iniciar sesión para postularte"><i class="fa-solid fa-paper-plane"></i> Postularme</a>
      </div>
    </article>
  `;
}

function filterAndSortJobs(
  jobs: Job[],
  query: string,
  selectedTypes: Set<JobType>,
  sort: string
): Job[] {
  let list = jobs.slice();
  const q = query.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (j) =>
        j.title.toLowerCase().includes(q) ||
        j.club.toLowerCase().includes(q) ||
        j.location.toLowerCase().includes(q) ||
        j.description.toLowerCase().includes(q)
    );
  }
  if (selectedTypes.size > 0) {
    list = list.filter((j) => selectedTypes.has(j.type));
  }
  if (sort === 'title-asc') {
    list.sort((a, b) => a.title.localeCompare(b.title));
  } else if (sort === 'date-desc') {
    list.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  }
  return list;
}

function initBolsa(): void {
  const searchInput = document.getElementById('bolsa-search') as HTMLInputElement;
  const filterTypesEl = document.getElementById('bolsa-filter-type');
  const filterReset = document.getElementById('bolsa-filter-reset');
  const emptyReset = document.getElementById('bolsa-empty-reset');
  const countEl = document.getElementById('bolsa-count');
  const sortSelect = document.getElementById('bolsa-sort') as HTMLSelectElement;
  const grid = document.getElementById('bolsa-grid');
  const empty = document.getElementById('bolsa-empty');

  if (!filterTypesEl || !grid || !countEl || !empty) return;

  let selectedTypes = new Set<JobType>();
  let searchQuery = '';
  let sortValue = 'relevance';

  function renderTypeFilters(): void {
    filterTypesEl.innerHTML = '';
    ALL_JOB_TYPES.forEach((typeId) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'filter-tag' + (selectedTypes.has(typeId) ? ' active' : '');
      btn.textContent = JOB_TYPE_LABELS[typeId];
      btn.dataset.type = typeId;
      btn.addEventListener('click', () => {
        if (selectedTypes.has(typeId)) selectedTypes.delete(typeId);
        else selectedTypes.add(typeId);
        applyFilters();
      });
      filterTypesEl.appendChild(btn);
    });
  }

  function updateTypeButtons(): void {
    filterTypesEl.querySelectorAll<HTMLButtonElement>('.filter-tag').forEach((btn) => {
      const t = btn.dataset.type as JobType;
      btn.classList.toggle('active', selectedTypes.has(t));
    });
  }

  function applyFilters(): void {
    const result = filterAndSortJobs(JOBS, searchQuery, selectedTypes, sortValue);
    countEl.textContent = result.length === 1 ? '1 oferta' : `${result.length} ofertas`;
    grid.innerHTML = result.map((j) => renderJobCard(j)).join('');
    empty.hidden = result.length > 0;
    updateTypeButtons();
  }

  renderTypeFilters();

  searchInput?.addEventListener('input', () => {
    searchQuery = searchInput.value;
    applyFilters();
  });

  sortSelect?.addEventListener('change', () => {
    sortValue = sortSelect.value;
    applyFilters();
  });

  filterReset?.addEventListener('click', () => {
    selectedTypes.clear();
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    if (sortSelect) sortSelect.value = 'relevance';
    sortValue = 'relevance';
    applyFilters();
  });

  emptyReset?.addEventListener('click', () => {
    selectedTypes.clear();
    if (searchInput) searchInput.value = '';
    searchQuery = '';
    if (sortSelect) sortSelect.value = 'relevance';
    sortValue = 'relevance';
    applyFilters();
    empty.hidden = true;
  });

  applyFilters();
}

if (document.body.classList.contains('bolsa-page')) {
  initBolsa();
  initNavAuth();
}
