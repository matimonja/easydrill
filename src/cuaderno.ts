import { ExerciseStorage } from './persistence/ExerciseStorage';
import type { ExerciseListItem } from './persistence/types';
import { initNavAuth } from './auth/nav-auth';
import { initAuth } from './auth/user';

async function initCuaderno() {
    await initAuth();
    initNavAuth();

    const storage = new ExerciseStorage();
    let exercises: ExerciseListItem[] = [];

    // DOM Elements
    const grid = document.getElementById('cuaderno-grid');
    const emptyState = document.getElementById('cuaderno-empty');
    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const btnReset = document.getElementById('btn-reset-filters');
    const countMsg = document.getElementById('exercise-count-msg');
    const deleteModal = document.getElementById('delete-modal');
    const btnCancelDelete = document.getElementById('btn-cancel-delete');
    const btnConfirmDelete = document.getElementById('btn-confirm-delete');

    let exerciseToDelete: string | null = null;

    async function loadExercises() {
        exercises = await storage.list();
        renderExercises();
    }

    function renderExercises() {
        const query = (searchInput?.value || '').toLowerCase().trim();
        const filtered = exercises.filter(ex => {
            const matchTitle = (ex.title || '').toLowerCase().includes(query);
            const matchTags = ex.tags?.some(tag => tag.label.toLowerCase().includes(query));
            return matchTitle || matchTags;
        });

        if (countMsg) {
            countMsg.textContent = `${filtered.length} ejercicio${filtered.length !== 1 ? 's' : ''}`;
        }

        if (filtered.length === 0) {
            grid?.classList.add('hidden');
            emptyState?.classList.remove('hidden');
            return;
        }

        grid?.classList.remove('hidden');
        emptyState?.classList.add('hidden');

        if (grid) {
            grid.innerHTML = filtered.map(ex => {
                // Placeholder if no thumbnail
                const thumb = ex.thumbnail || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23f0f0f0"/><text x="50" y="50" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="20" fill="%23aaa">Sin miniatura</text></svg>';
                const dateStr = new Date(ex.updatedAt).toLocaleDateString();
                const tagHtml = (ex.tags || []).map(t => `<span class="tag tag-${t.color}">${escapeHtml(t.label)}</span>`).join('');

                return `
                <div class="marketplace-card" data-id="${ex.id}">
                    <div class="carousel-thumb">
                        <img src="${thumb}" alt="Miniatura">
                    </div>
                    <div class="carousel-body">
                        <h4>${escapeHtml(ex.title)}</h4>
                        <p>Última mod: ${dateStr}</p>
                        ${tagHtml ? `<div class="carousel-tags" style="margin-bottom: 0.5rem;">${tagHtml}</div>` : ''}
                        
                        <div class="marketplace-card-actions">
                            <a href="ejercicio.html?id=${ex.id}" class="card-action-link" title="Ver Descripción"><i class="fa-solid fa-eye"></i></a>
                            <a href="editor.html?id=${ex.id}" class="cuaderno-action-edit" title="Editar Pizarra"><i class="fa-solid fa-pen-ruler"></i></a>
                            <button type="button" class="cuaderno-action-delete" aria-label="Eliminar" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                        </div>
                    </div>
                </div>
                `;
            }).join('');

            // Attach delete handlers
            grid.querySelectorAll('.cuaderno-action-delete').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const card = (e.currentTarget as HTMLElement).closest('.marketplace-card');
                    if (card) {
                        exerciseToDelete = card.getAttribute('data-id');
                        deleteModal?.classList.remove('hidden');
                    }
                });
            });
        }
    }

    function escapeHtml(s: string): string {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    searchInput?.addEventListener('input', renderExercises);

    btnReset?.addEventListener('click', () => {
        if (searchInput) searchInput.value = '';
        renderExercises();
    });

    btnCancelDelete?.addEventListener('click', () => {
        exerciseToDelete = null;
        deleteModal?.classList.add('hidden');
    });

    btnConfirmDelete?.addEventListener('click', async () => {
        if (exerciseToDelete) {
            await storage.delete(exerciseToDelete);
            exerciseToDelete = null;
            deleteModal?.classList.add('hidden');
            await loadExercises();
        }
    });

    deleteModal?.addEventListener('click', (e) => {
        if (e.target === deleteModal) {
            exerciseToDelete = null;
            deleteModal.classList.add('hidden');
        }
    });

    // Initial load
    await loadExercises();
}

if (document.body.classList.contains('cuaderno-page')) {
    initCuaderno();
}
