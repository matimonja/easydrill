/**
 * ejercicio.ts — Exercise Detail Page logic
 *
 * Handles:
 *  - Accordion toggle interactions
 *  - Modular section visibility (hides empty sections)
 *  - Navigation back to editor
 */

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

// ───────────────────────────────────────────────
// Mock Data (complex template)
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

document.addEventListener('DOMContentLoaded', () => {
    initAccordions();
    renderExercise(EXERCISE_DATA);
});

// ───────────────────────────────────────────────
// Accordion Logic
// ───────────────────────────────────────────────

function initAccordions(): void {
    const isMobile = window.matchMedia('(max-width: 768px)').matches;

    document.querySelectorAll('.accordion-toggle').forEach((btn) => {
        btn.addEventListener('click', () => {
            const accordion = btn.closest('.accordion');
            if (!accordion) return;
            const isOpen = accordion.classList.toggle('open');
            btn.setAttribute('aria-expanded', isOpen.toString());
        });
    });

    // On desktop, open accordions by default
    if (!isMobile) {
        document.querySelectorAll('.accordion').forEach((acc) => {
            acc.classList.add('open');
            const toggle = acc.querySelector('.accordion-toggle');
            toggle?.setAttribute('aria-expanded', 'true');
        });
    }
}

// ───────────────────────────────────────────────
// Render / Hide Sections
// ───────────────────────────────────────────────

function renderExercise(data: ExerciseData): void {
    // Title
    setText('#exercise-title', data.title);

    // Objective badge
    const badgeEl = document.getElementById('badge-objective');
    if (data.objective && badgeEl) {
        badgeEl.innerHTML = `<i class="fa-solid fa-bullseye"></i> ${data.objective}`;
    } else {
        badgeEl?.closest('.detail-section')?.classList.add('hidden');
        badgeEl?.remove();
    }

    // Metadata
    setText('#meta-duration', data.duration);
    setText('#meta-players', data.players);
    setText('#meta-field', data.fieldSize);
    setText('#meta-category', data.category);
    toggleSection('#meta-bar', !!(data.duration || data.players || data.fieldSize || data.category));

    // Description
    setText('#exercise-description', data.description);
    toggleSection('#section-description', !!data.description);

    // Materials
    if (data.materials && data.materials.length > 0) {
        const list = document.getElementById('materials-list');
        if (list) {
            list.innerHTML = data.materials
                .map((m) => `<span class="chip">${m}</span>`)
                .join('');
        }
    } else {
        toggleSection('#section-materials', false);
    }

    // Coaching Points
    if (data.coachingPoints && data.coachingPoints.length > 0) {
        const list = document.getElementById('coaching-list');
        if (list) {
            list.innerHTML = data.coachingPoints
                .map((p) => `<li><i class="fa-solid fa-check"></i> ${p}</li>`)
                .join('');
        }
    } else {
        toggleSection('#section-coaching', false);
    }

    // Variants
    const hasEasier = data.variantsEasier && data.variantsEasier.length > 0;
    const hasHarder = data.variantsHarder && data.variantsHarder.length > 0;
    if (hasEasier || hasHarder) {
        if (hasEasier) {
            const el = document.getElementById('variants-easier');
            if (el) el.innerHTML = data.variantsEasier!.map((v) => `<li>${v}</li>`).join('');
        } else {
            document.querySelector('.variant-easier')?.remove();
        }
        if (hasHarder) {
            const el = document.getElementById('variants-harder');
            if (el) el.innerHTML = data.variantsHarder!.map((v) => `<li>${v}</li>`).join('');
        } else {
            document.querySelector('.variant-harder')?.remove();
        }
    } else {
        toggleSection('#section-variants', false);
    }

    // Success Criteria
    if (data.successCriteria) {
        setText('#success-text', data.successCriteria);
    } else {
        toggleSection('#section-success', false);
    }

    // Tags
    if (data.tags && data.tags.length > 0) {
        const cloud = document.getElementById('tags-cloud');
        if (cloud) {
            cloud.innerHTML = data.tags
                .map((t) => `<a href="#" class="tag tag-${t.color}">${t.label}</a>`)
                .join('');
        }
    } else {
        toggleSection('#section-tags', false);
    }
}

// ───────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────

function setText(selector: string, value?: string): void {
    const el = document.querySelector(selector);
    if (el && value) el.textContent = value;
}

function toggleSection(selector: string, show: boolean): void {
    const el = document.querySelector(selector);
    if (!el) return;
    const section = el.closest('.detail-section') || el;
    if (show) {
        section.classList.remove('hidden');
    } else {
        section.classList.add('hidden');
    }
}
