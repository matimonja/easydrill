/**
 * ExerciseStorage — Main persistence module (Local-First).
 *
 * Responsibilities:
 *  - Serialize the full Game state into an ExerciseDocument
 *  - Deserialize an ExerciseDocument back into Game state
 *  - Auto-save to localStorage with debounce
 *  - Manual save / load / list / delete — always write localStorage first,
 *    then sync to backend API in the background when authenticated.
 *  - Generate thumbnail via canvas.toDataURL()
 *  - Emit sync status events for UI indicators
 */

import { Entity } from '../core/Interfaces';
import { Player } from '../entities/Player';
import { serializeEntity, deserializeEntity } from './EntitySerializer';
import { isLoggedIn, fetchWithAuth } from '../auth/user';
import type {
    ExerciseDocument, ExerciseMetadata, ExerciseListItem,
    SerializedEntity
} from './types';
import type { ExerciseZoneConfig } from '../core/ExerciseZoneConfig';

// ─── Constants ───────────────────────────────────────────────────

const DOCUMENT_VERSION = 1;
const LS_EXERCISE_LIST = 'easydrill-exercise-list';
const LS_EXERCISE_PREFIX = 'easydrill-exercise-';
const AUTO_SAVE_DEBOUNCE_MS = 2000;

// ─── Sync Status ─────────────────────────────────────────────────

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'local-only';

type SyncListener = (status: SyncStatus, detail?: string) => void;
const syncListeners: SyncListener[] = [];

export function onSyncStatusChange(listener: SyncListener): () => void {
    syncListeners.push(listener);
    return () => {
        const idx = syncListeners.indexOf(listener);
        if (idx >= 0) syncListeners.splice(idx, 1);
    };
}

function emitSync(status: SyncStatus, detail?: string): void {
    for (const l of syncListeners) {
        try { l(status, detail); } catch { /* ignore */ }
    }
}

// ─── Interfaces for Game access ──────────────────────────────────

/** Minimal subset of Game properties needed for serialization. */
export interface GameSnapshot {
    entities: Entity[];
    currentScene: number;
    sceneCount: number;
    camera: { x: number; y: number; zoom: number; rotation: number };
    canvas: HTMLCanvasElement;
    zoneConfig?: ExerciseZoneConfig | null;
}

/** Minimal subset of Game needed for loading. */
export interface GameLoader {
    entities: Entity[];
    currentScene: number;
    sceneCount: number;
    camera: { x: number; y: number; zoom: number; rotation: number };
    zoneConfig?: ExerciseZoneConfig | null;
    setScene(index: number): void;
    updateSceneState(): void;
    selectEntity(entity: Entity | null): void;
}

// ─── ExerciseStorage ─────────────────────────────────────────────

export class ExerciseStorage {
    private autoSaveTimer: number | null = null;

    // ── Serialize ────────────────────────────────────────────────

    static serialize(
        game: GameSnapshot,
        exerciseId: string,
        metadata: ExerciseMetadata,
        status: 'draft' | 'complete' = 'draft',
        existingCreatedAt?: string
    ): ExerciseDocument {
        const now = new Date().toISOString();

        const items: SerializedEntity[] = [];
        for (const entity of game.entities) {
            const serialized = serializeEntity(entity);
            if (serialized) items.push(serialized);
        }

        return {
            id: exerciseId,
            version: DOCUMENT_VERSION,
            metadata,
            editorState: {
                camera: {
                    x: game.camera.x,
                    y: game.camera.y,
                    zoom: game.camera.zoom,
                    rotation: game.camera.rotation,
                },
            },
            zoneConfig: game.zoneConfig ?? null,
            entities: { items },
            scenes: {
                count: game.sceneCount,
                current: game.currentScene,
            },
            createdAt: existingCreatedAt || now,
            updatedAt: now,
            status,
        };
    }

    // ── Deserialize ──────────────────────────────────────────────

    static deserialize(game: GameLoader, doc: ExerciseDocument): void {
        if (doc.zoneConfig) {
            game.zoneConfig = { ...doc.zoneConfig };
        }

        game.entities.length = 0;

        for (const item of doc.entities.items) {
            const entity = deserializeEntity(item);
            if (entity) {
                game.entities.push(entity);
            }
        }

        for (const entity of game.entities) {
            if (entity instanceof Player) {
                entity.updateActionChain();
            }
        }

        game.sceneCount = doc.scenes.count || 1;
        game.currentScene = doc.scenes.current || 0;
        game.updateSceneState();

        if (doc.editorState?.camera) {
            const cam = doc.editorState.camera;
            game.camera.x = cam.x;
            game.camera.y = cam.y;
            game.camera.zoom = cam.zoom;
            game.camera.rotation = cam.rotation;
        }

        game.selectEntity(null);
    }

    // ── Thumbnail ────────────────────────────────────────────────

    static generateThumbnail(canvas: HTMLCanvasElement): string {
        try {
            const thumbCanvas = document.createElement('canvas');
            const scale = 0.25;
            thumbCanvas.width = canvas.width * scale;
            thumbCanvas.height = canvas.height * scale;
            const thumbCtx = thumbCanvas.getContext('2d')!;
            thumbCtx.drawImage(canvas, 0, 0, thumbCanvas.width, thumbCanvas.height);
            return thumbCanvas.toDataURL('image/webp', 0.6);
        } catch {
            return '';
        }
    }

    // ── Auto-Save (localStorage only) ────────────────────────────

    scheduleAutoSave(exerciseId: string, game: GameSnapshot, metadata: ExerciseMetadata): void {
        if (this.autoSaveTimer !== null) {
            clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = window.setTimeout(() => {
            this.autoSaveTimer = null;
            this.saveToLocalStorage(exerciseId, game, metadata, 'draft');
        }, AUTO_SAVE_DEBOUNCE_MS);
    }

    cancelAutoSave(): void {
        if (this.autoSaveTimer !== null) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    // ── localStorage CRUD ────────────────────────────────────────

    saveToLocalStorage(
        exerciseId: string,
        game: GameSnapshot,
        metadata: ExerciseMetadata,
        status: 'draft' | 'complete' = 'draft'
    ): void {
        const existing = this.loadFromLocalStorage(exerciseId);
        const doc = ExerciseStorage.serialize(
            game, exerciseId, metadata, status,
            existing?.createdAt
        );

        doc.metadata.title = metadata.title || 'Sin título';
        const thumbnail = ExerciseStorage.generateThumbnail(game.canvas);

        localStorage.setItem(
            LS_EXERCISE_PREFIX + exerciseId,
            JSON.stringify(doc)
        );

        this.updateExerciseList(exerciseId, {
            id: exerciseId,
            title: doc.metadata.title,
            status: doc.status,
            updatedAt: doc.updatedAt,
            createdAt: doc.createdAt,
            thumbnail,
            tags: doc.metadata.tags,
        });
    }

    loadFromLocalStorage(exerciseId: string): ExerciseDocument | null {
        const raw = localStorage.getItem(LS_EXERCISE_PREFIX + exerciseId);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as ExerciseDocument;
        } catch {
            return null;
        }
    }

    deleteFromLocalStorage(exerciseId: string): void {
        localStorage.removeItem(LS_EXERCISE_PREFIX + exerciseId);

        const list = this.getExerciseList();
        const updated = list.filter(item => item.id !== exerciseId);
        localStorage.setItem(LS_EXERCISE_LIST, JSON.stringify(updated));
    }

    getExerciseList(): ExerciseListItem[] {
        const raw = localStorage.getItem(LS_EXERCISE_LIST);
        if (!raw) return [];
        try {
            return JSON.parse(raw) as ExerciseListItem[];
        } catch {
            return [];
        }
    }

    private updateExerciseList(exerciseId: string, item: ExerciseListItem): void {
        const list = this.getExerciseList();
        const idx = list.findIndex(e => e.id === exerciseId);
        if (idx >= 0) {
            list[idx] = item;
        } else {
            list.push(item);
        }
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        localStorage.setItem(LS_EXERCISE_LIST, JSON.stringify(list));
    }

    // ── Public API (Local-First + background sync) ───────────────

    /**
     * Save exercise: localStorage first, then POST/PATCH to API if authenticated.
     */
    async save(
        exerciseId: string,
        game: GameSnapshot,
        metadata: ExerciseMetadata,
        status: 'draft' | 'complete' = 'complete'
    ): Promise<void> {
        this.saveToLocalStorage(exerciseId, game, metadata, status);

        if (isLoggedIn()) {
            const doc = this.loadFromLocalStorage(exerciseId);
            if (doc) {
                const thumbnail = ExerciseStorage.generateThumbnail(game.canvas);
                this.syncToServer(exerciseId, doc, thumbnail);
            }
        }
    }

    /**
     * Load exercise: try API first if authenticated, fallback to localStorage.
     * Updates local cache with server version when available.
     */
    async load(exerciseId: string): Promise<ExerciseDocument | null> {
        if (isLoggedIn()) {
            try {
                const res = await fetchWithAuth(`/api/exercises/${encodeURIComponent(exerciseId)}`);
                if (res.ok) {
                    const serverDoc = await res.json() as ExerciseDocument;
                    localStorage.setItem(LS_EXERCISE_PREFIX + exerciseId, JSON.stringify(serverDoc));
                    return serverDoc;
                }
            } catch {
                // Network error — fall through to localStorage
            }
        }
        return this.loadFromLocalStorage(exerciseId);
    }

    /**
     * Update only metadata (from detail page). Local + API sync.
     */
    updateMetadata(exerciseId: string, metadata: ExerciseMetadata): boolean {
        const doc = this.loadFromLocalStorage(exerciseId);
        if (!doc) return false;

        doc.metadata = { ...metadata, title: metadata.title || 'Sin título' };
        doc.updatedAt = new Date().toISOString();

        localStorage.setItem(
            LS_EXERCISE_PREFIX + exerciseId,
            JSON.stringify(doc)
        );

        const list = this.getExerciseList();
        const existingItem = list.find(e => e.id === exerciseId);
        this.updateExerciseList(exerciseId, {
            id: exerciseId,
            title: doc.metadata.title,
            status: doc.status,
            updatedAt: doc.updatedAt,
            createdAt: doc.createdAt,
            thumbnail: existingItem?.thumbnail,
            tags: doc.metadata.tags,
        });

        if (isLoggedIn()) {
            this.syncMetadataToServer(exerciseId, doc.metadata, doc.version);
        }

        return true;
    }

    /**
     * List exercises: if authenticated use API as source of truth + merge local,
     * otherwise return localStorage list.
     */
    async list(): Promise<ExerciseListItem[]> {
        if (isLoggedIn()) {
            try {
                const res = await fetchWithAuth('/api/exercises');
                if (res.ok) {
                    const serverList = await res.json() as ExerciseListItem[];
                    this.mergeServerListToLocal(serverList);
                    return this.getExerciseList();
                }
            } catch {
                // Offline — use local
            }
        }
        return this.getExerciseList();
    }

    /**
     * Delete exercise: localStorage + API if authenticated.
     */
    async delete(exerciseId: string): Promise<void> {
        this.deleteFromLocalStorage(exerciseId);

        if (isLoggedIn()) {
            try {
                await fetchWithAuth(`/api/exercises/${encodeURIComponent(exerciseId)}`, {
                    method: 'DELETE',
                });
            } catch {
                // Best-effort; local is already deleted
            }
        }
    }

    // ── Background Sync Helpers ──────────────────────────────────

    /**
     * Sync a full document to the server (POST if new, PATCH if exists).
     */
    private async syncToServer(exerciseId: string, doc: ExerciseDocument, thumbnail: string): Promise<void> {
        emitSync('syncing');

        const payload = {
            id: doc.id,
            version: doc.version,
            status: doc.status,
            metadata: doc.metadata,
            editorState: doc.editorState,
            zoneConfig: doc.zoneConfig,
            entities: doc.entities,
            scenes: doc.scenes,
            thumbnail: thumbnail || undefined,
            createdAt: doc.createdAt,
            updatedAt: doc.updatedAt,
        };

        try {
            // Try PATCH first (update existing)
            let res = await fetchWithAuth(`/api/exercises/${encodeURIComponent(exerciseId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.status === 404) {
                // Exercise doesn't exist on server yet — create
                res = await fetchWithAuth('/api/exercises', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload),
                });
            }

            if (res.status === 403) {
                const data = await res.json();
                emitSync('error', data.message || 'Límite de plan alcanzado');
                return;
            }

            if (res.status === 409) {
                const data = await res.json();
                emitSync('error', data.message || 'Conflicto de versión');
                return;
            }

            if (res.ok) {
                emitSync('synced');
            } else {
                emitSync('error', `Error del servidor (${res.status})`);
            }
        } catch {
            emitSync('local-only');
        }
    }

    /**
     * Sync only metadata to the server via PATCH.
     */
    private async syncMetadataToServer(exerciseId: string, metadata: ExerciseMetadata, version: number): Promise<void> {
        emitSync('syncing');

        try {
            let res = await fetchWithAuth(`/api/exercises/${encodeURIComponent(exerciseId)}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ metadata, version }),
            });

            if (res.status === 404) {
                // Exercise not on server — nothing to update remotely
                emitSync('local-only');
                return;
            }

            if (res.ok) {
                emitSync('synced');
            } else if (res.status === 409) {
                const data = await res.json();
                emitSync('error', data.message || 'Conflicto de versión');
            } else {
                emitSync('error', `Error del servidor (${res.status})`);
            }
        } catch {
            emitSync('local-only');
        }
    }

    /**
     * Merge server list into local list. Adds server items not present locally
     * and uploads local-only items to the server.
     */
    private async mergeServerListToLocal(serverList: ExerciseListItem[]): Promise<void> {
        const localList = this.getExerciseList();
        const serverIds = new Set(serverList.map(e => e.id));
        const localIds = new Set(localList.map(e => e.id));

        // Add server items not in local
        for (const item of serverList) {
            if (!localIds.has(item.id)) {
                localList.push(item);
            } else {
                // Update local with server data (server is source of truth)
                const idx = localList.findIndex(e => e.id === item.id);
                if (idx >= 0) localList[idx] = item;
            }
        }

        localList.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        localStorage.setItem(LS_EXERCISE_LIST, JSON.stringify(localList));

        // Upload local-only exercises to server (best-effort)
        for (const item of localList) {
            if (!serverIds.has(item.id)) {
                const doc = this.loadFromLocalStorage(item.id);
                if (doc) {
                    this.syncToServer(item.id, doc, item.thumbnail ?? '');
                }
            }
        }
    }

    // ── Helpers ──────────────────────────────────────────────────

    static generateId(): string {
        return crypto.randomUUID();
    }
}
