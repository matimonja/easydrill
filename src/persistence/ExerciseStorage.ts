/**
 * ExerciseStorage — Main persistence module.
 *
 * Responsibilities:
 *  - Serialize the full Game state into an ExerciseDocument
 *  - Deserialize an ExerciseDocument back into Game state
 *  - Auto-save to localStorage with debounce
 *  - Manual save / load / list / delete (localStorage for now; API when auth exists)
 *  - Generate thumbnail via canvas.toDataURL()
 */

import { Entity } from '../core/Interfaces';
import { Player } from '../entities/Player';
import { serializeEntity, deserializeEntity } from './EntitySerializer';
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

    /**
     * Serialize the current Game state into a full ExerciseDocument.
     */
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

    /**
     * Deserialize an ExerciseDocument and restore the Game state.
     * Order: zone → entities → scenes → camera.
     */
    static deserialize(game: GameLoader, doc: ExerciseDocument): void {
        // 1. Zone config
        if (doc.zoneConfig) {
            game.zoneConfig = { ...doc.zoneConfig };
        }

        // 2. Clear existing entities
        game.entities.length = 0;

        // 3. Deserialize entities
        for (const item of doc.entities.items) {
            const entity = deserializeEntity(item);
            if (entity) {
                game.entities.push(entity);
            }
        }

        // 4. Rebuild action chains for all players
        for (const entity of game.entities) {
            if (entity instanceof Player) {
                entity.updateActionChain();
            }
        }

        // 5. Scenes
        game.sceneCount = doc.scenes.count || 1;
        game.currentScene = doc.scenes.current || 0;
        game.updateSceneState();

        // 6. Camera
        if (doc.editorState?.camera) {
            const cam = doc.editorState.camera;
            game.camera.x = cam.x;
            game.camera.y = cam.y;
            game.camera.zoom = cam.zoom;
            game.camera.rotation = cam.rotation;
        }

        // 7. Deselect all
        game.selectEntity(null);
    }

    // ── Thumbnail ────────────────────────────────────────────────

    /**
     * Generate a thumbnail from the canvas.
     */
    static generateThumbnail(canvas: HTMLCanvasElement): string {
        try {
            // Create a smaller version
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

    // ── Auto-Save (localStorage) ─────────────────────────────────

    /**
     * Schedule an auto-save with debounce.
     */
    scheduleAutoSave(exerciseId: string, game: GameSnapshot, metadata: ExerciseMetadata): void {
        if (this.autoSaveTimer !== null) {
            clearTimeout(this.autoSaveTimer);
        }
        this.autoSaveTimer = window.setTimeout(() => {
            this.autoSaveTimer = null;
            this.saveToLocalStorage(exerciseId, game, metadata, 'draft');
        }, AUTO_SAVE_DEBOUNCE_MS);
    }

    /**
     * Cancel any pending auto-save.
     */
    cancelAutoSave(): void {
        if (this.autoSaveTimer !== null) {
            clearTimeout(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    // ── localStorage CRUD ────────────────────────────────────────

    /**
     * Save exercise to localStorage.
     */
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

        // Generate thumbnail
        doc.metadata.title = metadata.title || 'Sin título';
        const thumbnail = ExerciseStorage.generateThumbnail(game.canvas);

        localStorage.setItem(
            LS_EXERCISE_PREFIX + exerciseId,
            JSON.stringify(doc)
        );

        // Update exercise list
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

    /**
     * Load exercise from localStorage.
     */
    loadFromLocalStorage(exerciseId: string): ExerciseDocument | null {
        const raw = localStorage.getItem(LS_EXERCISE_PREFIX + exerciseId);
        if (!raw) return null;
        try {
            return JSON.parse(raw) as ExerciseDocument;
        } catch {
            return null;
        }
    }

    /**
     * Delete exercise from localStorage.
     */
    deleteFromLocalStorage(exerciseId: string): void {
        localStorage.removeItem(LS_EXERCISE_PREFIX + exerciseId);

        const list = this.getExerciseList();
        const updated = list.filter(item => item.id !== exerciseId);
        localStorage.setItem(LS_EXERCISE_LIST, JSON.stringify(updated));
    }

    /**
     * Get the list of all saved exercises.
     */
    getExerciseList(): ExerciseListItem[] {
        const raw = localStorage.getItem(LS_EXERCISE_LIST);
        if (!raw) return [];
        try {
            return JSON.parse(raw) as ExerciseListItem[];
        } catch {
            return [];
        }
    }

    /**
     * Update or insert an exercise in the list index.
     */
    private updateExerciseList(exerciseId: string, item: ExerciseListItem): void {
        const list = this.getExerciseList();
        const idx = list.findIndex(e => e.id === exerciseId);
        if (idx >= 0) {
            list[idx] = item;
        } else {
            list.push(item);
        }
        // Sort by updatedAt descending
        list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        localStorage.setItem(LS_EXERCISE_LIST, JSON.stringify(list));
    }

    // ── Public Save/Load (delegates to localStorage for now) ─────

    /**
     * Save exercise. Today: localStorage. Future: API when authenticated.
     */
    async save(
        exerciseId: string,
        game: GameSnapshot,
        metadata: ExerciseMetadata,
        status: 'draft' | 'complete' = 'complete'
    ): Promise<void> {
        // TODO: if authenticated, POST/PUT to /api/exercises
        this.saveToLocalStorage(exerciseId, game, metadata, status);
    }

    /**
     * Load exercise. Today: localStorage. Future: API when authenticated.
     */
    async load(exerciseId: string): Promise<ExerciseDocument | null> {
        // TODO: if authenticated, GET /api/exercises/:id
        return this.loadFromLocalStorage(exerciseId);
    }

    /**
     * List all exercises. Today: localStorage. Future: API when authenticated.
     */
    async list(): Promise<ExerciseListItem[]> {
        // TODO: if authenticated, GET /api/exercises
        return this.getExerciseList();
    }

    /**
     * Delete exercise. Today: localStorage. Future: API when authenticated.
     */
    async delete(exerciseId: string): Promise<void> {
        // TODO: if authenticated, DELETE /api/exercises/:id
        this.deleteFromLocalStorage(exerciseId);
    }

    // ── Helpers ──────────────────────────────────────────────────

    /**
     * Generate a new exercise ID.
     */
    static generateId(): string {
        return crypto.randomUUID();
    }
}
