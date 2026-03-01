/**
 * SyncIndicator — Binds to #sync-indicator and listens to ExerciseStorage sync events.
 * Works in both editor and detail pages.
 */

import { onSyncStatusChange, type SyncStatus } from './ExerciseStorage';

const ICONS: Record<SyncStatus, string> = {
    idle: '',
    syncing: '<i class="fa-solid fa-arrows-rotate fa-spin"></i>',
    synced: '<i class="fa-solid fa-cloud-check" style="color:var(--marker-green,#16a34a)"></i>',
    error: '<i class="fa-solid fa-triangle-exclamation" style="color:var(--marker-orange,#ea580c)"></i>',
    'local-only': '<i class="fa-solid fa-hard-drive" style="color:var(--home-muted,#5c5c56)"></i>',
};

const LABELS: Record<SyncStatus, string> = {
    idle: '',
    syncing: 'Sincronizando...',
    synced: 'Sincronizado',
    error: 'Error de sincronización',
    'local-only': 'Solo guardado localmente',
};

export function initSyncIndicator(elementId = 'sync-indicator'): void {
    const el = document.getElementById(elementId);
    if (!el) return;

    onSyncStatusChange((status, detail) => {
        if (status === 'idle') {
            el.classList.add('hidden');
            return;
        }

        el.classList.remove('hidden');
        el.innerHTML = ICONS[status] || '';
        el.title = detail || LABELS[status] || '';

        if (status === 'synced') {
            setTimeout(() => {
                el.classList.add('hidden');
            }, 3000);
        }
    });
}
