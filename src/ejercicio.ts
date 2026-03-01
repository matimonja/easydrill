/**
 * ejercicio.ts — Exercise Detail Page logic
 *
 * Handles:
 *  - Load exercise by id from URL (ExerciseStorage)
 *  - Editable form for all metadata fields when exercise loaded
 *  - Save button: updateMetadata and keep exercise in notebook
 *  - Mock read-only view when no id in URL
 *  - Accordion toggle interactions
 */

import { ExerciseStorage } from './persistence/ExerciseStorage';
import type { ExerciseMetadata } from './persistence/types';
import { Game } from './core/Game';
import { initSyncIndicator } from './persistence/SyncIndicator';

// ───────────────────────────────────────────────
// Types
// ───────────────────────────────────────────────

interface ExerciseData {
    title?: string;
    objective?: string;
    duration?: string;
    players?: string;
    fieldSize?: string;
    category?: string;
    description?: string;
    materials?: string[];
    coachingPoints?: string[];
    variantsEasier?: string[];
    variantsHarder?: string[];
    successCriteria?: string;
    tags?: { label: string; color: string }[];
}

const TAG_COLORS = ['blue', 'red', 'green', 'orange', 'violet'] as const;

// ───────────────────────────────────────────────
// Mock Data (when no id in URL)
// ───────────────────────────────────────────────

const EXERCISE_DATA: ExerciseData = {
    title: 'Posesión 5v5 con Transiciones',
    objective: 'Transiciones rápidas',
    duration: '15 min',
    players: '5v5',
    fieldSize: '1/2 Cancha',
    category: 'Sub-14',
    description:
        'Ejercicio de posesión en espacio reducido orientado a mejorar las transiciones ataque-defensa. Los equipos deben mantener la posesión con un máximo de 2 toques y buscar cambios de orientación rápidos. Al perder la pelota, presión inmediata durante 5 segundos.',
    materials: ['12 Conos', '20 Bochas', 'Pecheras (2 colores)', 'Silbato'],
    coachingPoints: [
        'Mantener líneas de pase cortas y diagonales',
        'Comunicación constante entre jugadores',
        'Orientación del cuerpo antes de recibir',
        'Presión coordinada al perder la pelota',
        'Buscar superioridad numérica en zona de balón',
    ],
    variantsEasier: [
        'Permitir 3 toques por jugador',
        'Agregar un comodín neutral',
        'Ampliar el espacio de juego',
    ],
    variantsHarder: [
        'Reducir a 1 toque',
        'Achicar el espacio',
        'Limitar tiempo de posesión a 10 segundos',
    ],
    successCriteria:
        'El equipo completa 8 pases consecutivos antes de buscar el cambio de orientación, manteniendo la presión post-pérdida durante al menos 5 segundos.',
    tags: [
        { label: '#posesión', color: 'blue' },
        { label: '#transiciones', color: 'red' },
        { label: '#pressing', color: 'green' },
        { label: '#espacio-reducido', color: 'orange' },
        { label: '#sub14', color: 'violet' },
        { label: '#5v5', color: 'blue' },
    ],
};

// ───────────────────────────────────────────────
// DOM Ready
// ───────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
    const params = new URLSearchParams(window.location.search);
    const exerciseId = params.get('id') ?? undefined;

    initAccordions();

    if (exerciseId) {
        const storage = new ExerciseStorage();
        const doc = await storage.load(exerciseId);
        const notFoundEl = document.getElementById('exercise-not-found');
        const readonlyPanel = document.getElementById('info-panel-readonly');
        const formPanel = document.getElementById('info-panel-form');

        if (!doc) {
            if (notFoundEl) notFoundEl.classList.remove('hidden');
            if (readonlyPanel) readonlyPanel.classList.add('hidden');
            if (formPanel) formPanel.classList.add('hidden');
            return;
        }

        if (notFoundEl) notFoundEl.classList.add('hidden');
        if (readonlyPanel) readonlyPanel.classList.add('hidden');
        if (formPanel) formPanel.classList.remove('hidden');

        fillForm(doc.metadata);
        setupFormListeners(exerciseId);
        setEditLink(exerciseId);
        initSyncIndicator();

        // Initialize Drill Player
        const canvas = document.getElementById('drillPlayerCanvas') as HTMLCanvasElement | null;
        if (canvas) {
            // Instantiate Game
            const game = new Game('drillPlayerCanvas', doc.zoneConfig ?? undefined, exerciseId);
            game.start();

            // Set default scene to 0 once loaded
            if (game.loadPromise) {
                game.loadPromise.then(() => {
                    game.setScene(0);
                });
            }

            // Switch to play mode explicitly to hide edit tools if they existed
            game.setMode('play');

            // Setup Play Button
            const playBtn = document.getElementById('btn-play-drill');
            const overlay = document.getElementById('drill-player-overlay');

            if (playBtn) {
                playBtn.addEventListener('click', () => {
                    if (game.animationManager.isPlaying && !game.animationManager.isPaused) {
                        game.animationManager.pause();
                        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                        if (overlay) overlay.style.background = 'rgba(0,0,0,0.3)';
                    } else {
                        game.animationManager.play(0, game.entities); // Play from scene 0 (or current)
                        playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
                        if (overlay) overlay.style.background = 'transparent';
                    }
                });

                // Also update button logic when animation stops naturally
                const originalStop = game.animationManager.stop.bind(game.animationManager);
                game.animationManager.stop = () => {
                    originalStop();
                    playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
                    if (overlay) overlay.style.background = 'rgba(0,0,0,0.3)';
                };
            }
        }

    } else {
        document.getElementById('exercise-not-found')?.classList.add('hidden');
        document.getElementById('info-panel-form')?.classList.add('hidden');
        renderMockView(EXERCISE_DATA);
    }
});

// ───────────────────────────────────────────────
// Mock read-only view (no id in URL)
// ───────────────────────────────────────────────

function renderMockView(data: ExerciseData): void {
    const panel = document.getElementById('info-panel-readonly');
    if (!panel) return;

    const hasMeta = !!(data.duration || data.players || data.fieldSize || data.category);
    panel.innerHTML = `
        <div class="detail-section detail-title-block">
            <div class="title-row">
                <h1 class="mock-title">${escapeHtml(data.title ?? '')}</h1>
                <a href="editor.html" class="btn-edit"><i class="fa-solid fa-pen-to-square"></i> Editar Ejercicio</a>
            </div>
            ${data.objective ? `<span class="badge-objective"><i class="fa-solid fa-bullseye"></i> ${escapeHtml(data.objective)}</span>` : ''}
        </div>
        ${hasMeta ? `
        <div class="detail-section meta-bar" id="meta-bar">
            <div class="meta-item"><i class="fa-regular fa-clock"></i><span>${escapeHtml(data.duration ?? '')}</span></div>
            <div class="meta-item"><i class="fa-solid fa-shirt"></i><span>${escapeHtml(data.players ?? '')}</span></div>
            <div class="meta-item"><i class="fa-solid fa-vector-square"></i><span>${escapeHtml(data.fieldSize ?? '')}</span></div>
            <div class="meta-item"><i class="fa-solid fa-tag"></i><span>${escapeHtml(data.category ?? '')}</span></div>
        </div>
        ` : ''}
        ${data.description ? `
        <div class="detail-section" id="section-description">
            <h2 class="section-heading">Descripción</h2>
            <p class="description-text">${escapeHtml(data.description)}</p>
        </div>
        ` : ''}
        ${data.materials?.length ? `
        <div class="detail-section" id="section-materials">
            <h2 class="section-heading">Materiales</h2>
            <div class="chips-list">${data.materials.map(m => `<span class="chip">${escapeHtml(m)}</span>`).join('')}</div>
        </div>
        ` : ''}
        ${data.coachingPoints?.length ? `
        <div class="detail-section" id="section-coaching">
            <div class="accordion">
                <button type="button" class="accordion-toggle" aria-expanded="false">
                    <span><i class="fa-solid fa-clipboard-check"></i> Puntos Clave de Coaching</span>
                    <i class="fa-solid fa-chevron-down accordion-icon"></i>
                </button>
                <div class="accordion-content">
                    <ul class="coaching-list">${data.coachingPoints.map(p => `<li><i class="fa-solid fa-check"></i> ${escapeHtml(p)}</li>`).join('')}</ul>
                </div>
            </div>
        </div>
        ` : ''}
        ${(data.variantsEasier?.length || data.variantsHarder?.length) ? `
        <div class="detail-section" id="section-variants">
            <div class="accordion">
                <button type="button" class="accordion-toggle" aria-expanded="false">
                    <span><i class="fa-solid fa-sliders"></i> Variantes y Progresiones</span>
                    <i class="fa-solid fa-chevron-down accordion-icon"></i>
                </button>
                <div class="accordion-content">
                    ${data.variantsEasier?.length ? `<div class="variant-block variant-easier"><h3><i class="fa-solid fa-arrow-down"></i> Para facilitar</h3><ul>${data.variantsEasier.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul></div>` : ''}
                    ${data.variantsHarder?.length ? `<div class="variant-block variant-harder"><h3><i class="fa-solid fa-arrow-up"></i> Para dificultar</h3><ul>${data.variantsHarder.map(v => `<li>${escapeHtml(v)}</li>`).join('')}</ul></div>` : ''}
                </div>
            </div>
        </div>
        ` : ''}
        ${data.successCriteria ? `
        <div class="detail-section" id="section-success">
            <div class="success-box"><i class="fa-solid fa-trophy"></i><div><strong>Criterio de éxito</strong><p>${escapeHtml(data.successCriteria)}</p></div></div>
        </div>
        ` : ''}
        ${data.tags?.length ? `
        <div class="detail-section" id="section-tags">
            <div class="tags-cloud">${data.tags.map(t => `<span class="tag tag-${t.color}">${escapeHtml(t.label)}</span>`).join('')}</div>
        </div>
        ` : ''}
    `;
    initAccordions();
}

function escapeHtml(s: string): string {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
}

// ───────────────────────────────────────────────
// Accordion Logic
// ───────────────────────────────────────────────

function initAccordions(): void {
    const isMobile = window.matchMedia('(max-width: 743px)').matches || window.matchMedia('(max-height: 743px)').matches;

    document.querySelectorAll('.accordion-toggle').forEach((btn) => {
        if ((btn as HTMLElement).dataset?.accordionBound) return;
        (btn as HTMLElement).dataset.accordionBound = '1';
        btn.addEventListener('click', () => {
            const accordion = btn.closest('.accordion');
            if (!accordion) return;
            const isOpen = accordion.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen.toString());
        });
    });

    if (!isMobile) {
        document.querySelectorAll('.accordion').forEach((acc) => {
            acc.classList.add('open');
            const toggle = acc.querySelector('.accordion-toggle');
            toggle?.setAttribute('aria-expanded', 'true');
        });
    }
}

// ───────────────────────────────────────────────
// Form: fill from metadata
// ───────────────────────────────────────────────

function fillForm(metadata: ExerciseMetadata): void {
    const get = (id: string) => document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
    const set = (id: string, value: string) => {
        const el = get(id);
        if (el && 'value' in el) el.value = value ?? '';
    };

    set('input-title', metadata.title ?? '');
    set('input-objective', metadata.objective ?? '');
    set('input-duration', metadata.duration ?? '');
    set('input-players', metadata.players ?? '');
    set('input-fieldSize', metadata.fieldSize ?? '');
    set('input-category', metadata.category ?? '');
    set('input-description', metadata.description ?? '');
    set('input-successCriteria', metadata.successCriteria ?? '');

    renderChipList('materials-list', metadata.materials ?? [], true);
    renderEditableList('coaching-list', metadata.coachingPoints ?? []);
    renderEditableList('variants-easier-list', metadata.variantsEasier ?? []);
    renderEditableList('variants-harder-list', metadata.variantsHarder ?? []);
    renderTagsList('tags-list', metadata.tags ?? []);
}

function renderChipList(containerId: string, items: string[], removable: boolean): void {
    const list = document.getElementById(containerId);
    if (!list) return;
    list.innerHTML = items
        .map(
            (text) =>
                `<span class="chip chip-editable">${escapeHtml(text)}` +
                (removable ? ` <button type="button" class="chip-remove" aria-label="Quitar"><i class="fa-solid fa-times"></i></button>` : '') +
                `</span>`
        )
        .join('');
    list.querySelectorAll('.chip-remove').forEach((btn) => {
        btn.addEventListener('click', () => {
            const chip = btn.closest('.chip');
            chip?.remove();
        });
    });
}

function renderEditableList(containerId: string, items: string[]): void {
    const ul = document.getElementById(containerId);
    if (!ul) return;
    ul.innerHTML = items
        .map(
            (text) =>
                `<li class="editable-list-item">
                    <input type="text" class="list-item-input" value="${escapeHtml(text)}" />
                    <button type="button" class="btn-remove-item" aria-label="Quitar"><i class="fa-solid fa-times"></i></button>
                </li>`
        )
        .join('');
    ul.querySelectorAll('.btn-remove-item').forEach((btn) => {
        btn.addEventListener('click', () => btn.closest('li')?.remove());
    });
}

function renderTagsList(containerId: string, tags: { label: string; color: string }[]): void {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = tags
        .map(
            (t) =>
                `<span class="tag tag-${t.color} tag-editable">${escapeHtml(t.label)} ` +
                `<button type="button" class="chip-remove" aria-label="Quitar tag"><i class="fa-solid fa-times"></i></button></span>`
        )
        .join('');
    container.querySelectorAll('.chip-remove').forEach((btn) => {
        btn.addEventListener('click', () => btn.closest('.tag')?.remove());
    });
}

// ───────────────────────────────────────────────
// Form: get metadata from DOM
// ───────────────────────────────────────────────

// Chip text without remove button label
function getChipText(chipEl: Element): string {
    const clone = chipEl.cloneNode(true) as Element;
    clone.querySelector('.chip-remove')?.remove();
    return (clone.textContent ?? '').trim();
}

function getFormMetadata(): ExerciseMetadata {
    const get = (id: string): string => {
        const el = document.getElementById(id) as HTMLInputElement | HTMLTextAreaElement | null;
        return el?.value?.trim() ?? '';
    };

    const materials = Array.from(document.querySelectorAll('#materials-list .chip-editable')).map(getChipText).filter(Boolean);
    const coachingPoints = Array.from(document.querySelectorAll('#coaching-list .list-item-input')).map(
        (el) => (el as HTMLInputElement).value.trim()
    ).filter(Boolean);
    const variantsEasier = Array.from(document.querySelectorAll('#variants-easier-list .list-item-input')).map(
        (el) => (el as HTMLInputElement).value.trim()
    ).filter(Boolean);
    const variantsHarder = Array.from(document.querySelectorAll('#variants-harder-list .list-item-input')).map(
        (el) => (el as HTMLInputElement).value.trim()
    ).filter(Boolean);
    const tags = Array.from(document.querySelectorAll('#tags-list .tag-editable')).map((el) => {
        const label = getChipText(el);
        const color = (TAG_COLORS.find((c) => el.classList.contains(`tag-${c}`)) ?? 'blue') as string;
        return { label, color };
    }).filter((t) => t.label);

    return {
        title: get('input-title') || 'Sin título',
        objective: get('input-objective') || undefined,
        duration: get('input-duration') || undefined,
        players: get('input-players') || undefined,
        fieldSize: get('input-fieldSize') || undefined,
        category: get('input-category') || undefined,
        description: get('input-description') || undefined,
        materials: materials.length ? materials : undefined,
        coachingPoints: coachingPoints.length ? coachingPoints : undefined,
        variantsEasier: variantsEasier.length ? variantsEasier : undefined,
        variantsHarder: variantsHarder.length ? variantsHarder : undefined,
        successCriteria: get('input-successCriteria') || undefined,
        tags: tags.length ? tags : undefined,
    };
}

// ───────────────────────────────────────────────
// Form: add-item listeners and Save
// ───────────────────────────────────────────────

function setupFormListeners(exerciseId: string): void {
    const storage = new ExerciseStorage();

    document.getElementById('btn-save')?.addEventListener('click', () => {
        const metadata = getFormMetadata();
        const ok = storage.updateMetadata(exerciseId, metadata);
        showToast(ok ? 'Guardado' : 'No se pudo guardar');
    });

    document.getElementById('btn-add-material')?.addEventListener('click', () => {
        const input = document.getElementById('input-material-new') as HTMLInputElement;
        const text = input?.value?.trim();
        if (!text) return;
        const list = document.getElementById('materials-list');
        if (!list) return;
        const chip = document.createElement('span');
        chip.className = 'chip chip-editable';
        chip.innerHTML = `${escapeHtml(text)} <button type="button" class="chip-remove" aria-label="Quitar"><i class="fa-solid fa-times"></i></button>`;
        chip.querySelector('.chip-remove')?.addEventListener('click', () => chip.remove());
        list.appendChild(chip);
        input.value = '';
    });

    document.getElementById('btn-add-coaching')?.addEventListener('click', () => {
        const input = document.getElementById('input-coaching-new') as HTMLInputElement;
        const text = input?.value?.trim();
        if (!text) return;
        const ul = document.getElementById('coaching-list');
        if (!ul) return;
        const li = document.createElement('li');
        li.className = 'editable-list-item';
        li.innerHTML = `<input type="text" class="list-item-input" value="${escapeHtml(text)}" /><button type="button" class="btn-remove-item" aria-label="Quitar"><i class="fa-solid fa-times"></i></button>`;
        li.querySelector('.btn-remove-item')?.addEventListener('click', () => li.remove());
        ul.appendChild(li);
        input.value = '';
    });

    document.getElementById('btn-add-variant-easier')?.addEventListener('click', () => {
        const input = document.getElementById('input-variant-easier-new') as HTMLInputElement;
        const text = input?.value?.trim();
        if (!text) return;
        const ul = document.getElementById('variants-easier-list');
        if (!ul) return;
        const li = document.createElement('li');
        li.className = 'editable-list-item';
        li.innerHTML = `<input type="text" class="list-item-input" value="${escapeHtml(text)}" /><button type="button" class="btn-remove-item" aria-label="Quitar"><i class="fa-solid fa-times"></i></button>`;
        li.querySelector('.btn-remove-item')?.addEventListener('click', () => li.remove());
        ul.appendChild(li);
        input.value = '';
    });

    document.getElementById('btn-add-variant-harder')?.addEventListener('click', () => {
        const input = document.getElementById('input-variant-harder-new') as HTMLInputElement;
        const text = input?.value?.trim();
        if (!text) return;
        const ul = document.getElementById('variants-harder-list');
        if (!ul) return;
        const li = document.createElement('li');
        li.className = 'editable-list-item';
        li.innerHTML = `<input type="text" class="list-item-input" value="${escapeHtml(text)}" /><button type="button" class="btn-remove-item" aria-label="Quitar"><i class="fa-solid fa-times"></i></button>`;
        li.querySelector('.btn-remove-item')?.addEventListener('click', () => li.remove());
        ul.appendChild(li);
        input.value = '';
    });

    document.getElementById('btn-add-tag')?.addEventListener('click', () => {
        const labelInput = document.getElementById('input-tag-label') as HTMLInputElement;
        const colorSelect = document.getElementById('input-tag-color') as HTMLSelectElement;
        const label = labelInput?.value?.trim();
        if (!label) return;
        const color = colorSelect?.value ?? 'blue';
        const container = document.getElementById('tags-list');
        if (!container) return;
        const tag = document.createElement('span');
        tag.className = `tag tag-${color} tag-editable`;
        tag.innerHTML = `${escapeHtml(label)} <button type="button" class="chip-remove" aria-label="Quitar tag"><i class="fa-solid fa-times"></i></button>`;
        tag.querySelector('.chip-remove')?.addEventListener('click', () => tag.remove());
        container.appendChild(tag);
        labelInput.value = '';
    });

    document.getElementById('input-material-new')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') (document.getElementById('btn-add-material') as HTMLButtonElement)?.click();
    });
    document.getElementById('input-coaching-new')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') (document.getElementById('btn-add-coaching') as HTMLButtonElement)?.click();
    });
}

function setEditLink(exerciseId: string): void {
    const link = document.getElementById('btn-edit-exercise') as HTMLAnchorElement;
    if (link) link.href = `editor.html?id=${encodeURIComponent(exerciseId)}`;
}

// ───────────────────────────────────────────────
// Toast
// ───────────────────────────────────────────────

function showToast(message: string): void {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 2500);
}
